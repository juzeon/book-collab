import 'reflect-metadata'
import {configure, getLogger} from "log4js"
import mysql, {Pool} from 'promise-mysql'
import {appConfig} from "./config"
import * as fs from "fs"
import * as path from "path"
import express from "express"
import {CustomValidator, Meta, validationResult} from "express-validator"
import {Container} from "typedi"
import {NovelModel} from "./models/novel-model"
import chardet from "chardet"
import iconv from "iconv-lite"
import {IChapter, IFallbackNovelData, IFileData, INovel, ISplitedChapter, ITocItem} from "./types"
import glob from "glob-promise"
import appRoot from 'app-root-path'

const logger = getLogger()
logger.level = "debug"

let db: Pool
let poolCreatingPromise = mysql.createPool({
    host: appConfig.dbHost,
    user: appConfig.dbUser,
    password: appConfig.dbPassword,
    database: appConfig.dbName
}).then(value => {
    db = value
    logger.info('Pool created.')
}).catch(error => {
    logger.error(error)
})

// 用于阻塞直到pool创建完毕
export function getPoolCreatingPromise() {
    return poolCreatingPromise
}

export function getLineIndent(line: string) {
    return /^\s*/.exec(line)![0]
}

export function isTitleWithSignifier(line: string) {
    return line.replace(/\s*/g, '').length <= appConfig.maxTitleWordcount && (
        /[1-9一二三四五六七八九十]+(章|回|幕|话|节|\.|、|:|：|，| )+/.test(line)
        || /番外/.test(line)
        || /特别篇/.test(line)
    )
}

export function tagsToArray(str: string): string[] {
    return str.split(',').map(value => value.trim()).filter(value => value.length > 0)
}

export function arrayToTags(arr: string[]): string {
    return arr.join(',')
}

export let resultJson = {
    success(data: any) {
        return {
            status: true,
            data: data
        }
    },
    error(data: any) {
        return {
            status: false,
            data: data
        }
    }
}

export function hasValidationErrors(req: express.Request, res: express.Response) {
    let validationRes = validationResult(req)
    if (validationRes.isEmpty()) {
        return false
    } else {
        res.json(resultJson.error(validationRes.array()))
        return true
    }
}

export function pageToLimitSqlSegment(page: number) {
    return ' limit ' + (page - 1) * appConfig.perPage + ',' + appConfig.perPage
}

export function getNovelWithTagsSqlSegment(orderBy: string, orderByType: 'asc' | 'desc', novelTableConditions: string = '') {
    return 'select n.*,group_concat(t.name) as tags ' +
        'from novels n ' +
        'left join tagmap tm on tm.novelId=n.id ' +
        'left join tags t on t.id=tm.tagId ' +
        novelTableConditions + ' ' +
        'group by n.id ' +
        'order by n.' + orderBy + ' ' + orderByType + ' '
}

// 有将INovel导入到req.params
export let novelExistValidator: CustomValidator = async (novelId: number, {req}) => {
    let novelModel = Container.get(NovelModel)
    let novel = await novelModel.findNovelById(novelId)
    if (!novel) {
        throw new Error('novelId不存在')
    }
    req.params!.novel = novel
    return true
}

intersection([11, 22])

export function intersection(lists: any[]) {
    let result = []
    for (let i = 0; i < lists.length; i++) {
        let currentList = lists[i]
        for (let y = 0; y < currentList.length; y++) {
            let currentValue = currentList[y]
            if (result.indexOf(currentValue) === -1) {
                if (lists.filter(function (obj) {
                    return obj.indexOf(currentValue) == -1
                }).length == 0) {
                    result.push(currentValue)
                }
            }
        }
    }
    return result
}

export function readFileMeta(filePath: string, crudeDetect: boolean = false, ensuredEncoding: string | undefined = undefined) {
    let contentBuffer = Buffer.from(fs.readFileSync(filePath))
    let encoding: string
    if (ensuredEncoding) {
        encoding = ensuredEncoding
    } else {
        if (crudeDetect) {
            encoding = chardet.detectFileSync(filePath, {sampleSize: appConfig.crudeEncodingDetectSampleSize}) as string
        } else {
            encoding = chardet.detect(contentBuffer) || 'UTF-8'
        }
    }
    let content: string
    // 获得编码方式
    // logger.debug('编码方式：' + encoding)
    if (encoding != 'UTF-8') {
        content = Buffer.from(iconv.decode(contentBuffer, encoding)).toString('utf-8')
    } else {
        content = contentBuffer.toString('utf-8')
    }

    // 预处理
    content = content.replace(/[　 	]/g, ' ')
        .replace(/\r/g, '')
    return <IFileData>{
        content,
        encoding
    }
}

export function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
}

export async function readFallbackNovel(novel: INovel): Promise<IFallbackNovelData | null> {
    let filePathArr = await glob.promise(path.join(appRoot.path, appConfig.fallbackNovelDirectory!, '**/*.txt'))
    let filePath = filePathArr.find(value => path.parse(value).name == novel.title) || null
    if (!filePath) {
        return null
    }
    let {content} = readFileMeta(filePath, false, novel.encoding)
    let contentArr = content.split('\n')
    contentArr = contentArr.filter(value => value.trim().length != 0)

    let cachedWordcount = 0
    let cachedContent = ''
    let realIndex = 0
    let chapters: IChapter[] = []
    let toc: ITocItem[] = []
    for (let [index, line] of contentArr.entries()) {
        cachedContent += line.trim() + '\n'
        cachedWordcount += line.trim().length
        if (cachedWordcount >= appConfig.splitChapterWordcount || index == contentArr.length - 1) {
            chapters.push({
                orderId: realIndex,
                novelId: novel.id!,
                title: numberWithCommas(index + 1),
                content: cachedContent,
                wordcount: cachedWordcount
            })
            toc.push({
                orderId: realIndex,
                title: numberWithCommas(index + 1),
                wordcount: cachedWordcount
            })
            cachedWordcount = 0
            cachedContent = ''
            realIndex++
        }
    }
    return <IFallbackNovelData>{
        chapters,
        toc
    }
}

export function addWordcountLineToChapterContent(chapter: IChapter) {
    let dupChapter = JSON.parse(JSON.stringify(chapter))
    dupChapter.content = '字数：' + dupChapter.wordcount + '\n' + dupChapter.content
    return dupChapter
}

export {logger, db}
