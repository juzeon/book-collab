import 'reflect-metadata'
import {getLogger} from "log4js"
import mysql, {Pool} from 'promise-mysql'
import {appConfig} from "./config"
import * as fs from "fs"
import * as path from "path"
import {CustomValidator, validationResult} from "express-validator"
import {Container} from "typedi"
import {NovelModel} from "./models/novel-model"
import chardet from "chardet"
import iconv from "iconv-lite"
import {
    EReq,
    ERes,
    IBuildChapterArrArguments,
    IChapter,
    IFallbackNovelData,
    IFileData,
    IGetNovelsArguments,
    INovel,
    ITocItem
} from "./types"
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

export function isTitleWithSignifier(line: string, signifier: RegExp | undefined = undefined) {
    if (!signifier) {
        // 未指定手动正则，使用自动正则
        return line.replace(/\s*/g, '').length <= appConfig.maxTitleWordcount && (
            /[1-9一二三四五六七八九十]+(章|回|幕|话|节|\.|、|:|：|，| )+/.test(line)
            || /番外/.test(line)
            || /特别篇/.test(line)
        )
    } else {
        return signifier.test(line)
    }
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

export function hasValidationErrors(req: EReq, res: ERes) {
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

export function getNovelsWithTagsSqlSegment(args: IGetNovelsArguments = {}) {
    let usedArgs = <IGetNovelsArguments>{
        orderBy: 'time',
        orderByType: 'desc',
        novelTableConditions: '',
        withoutIntro: false,
    }
    if (args.orderBy !== undefined) {
        usedArgs.orderBy = args.orderBy
    }
    if (args.orderByType !== undefined) {
        usedArgs.orderByType = args.orderByType
    }
    if (args.novelTableConditions !== undefined) {
        usedArgs.novelTableConditions = args.novelTableConditions
    }
    if (args.withoutIntro !== undefined) {
        usedArgs.withoutIntro = args.withoutIntro
    }
    return 'select ' + (usedArgs.withoutIntro ? 'n.id,n.title,n.wordcount,n.encoding,n.time' : 'n.*') + ',group_concat(t.name) as tags ' +
        'from novels n ' +
        'left join tagmap tm on tm.novelId=n.id ' +
        'left join tags t on t.id=tm.tagId ' +
        usedArgs.novelTableConditions + ' ' +
        'group by n.id ' +
        'order by n.' + usedArgs.orderBy + ' ' + usedArgs.orderByType + ' '
}

// 有将INovel导入到req.novel
export let novelExistValidator: CustomValidator = async (novelId: number, {req}) => {
    let novelModel = Container.get(NovelModel)
    let novel = await novelModel.findNovelById(novelId)
    if (!novel) {
        throw new Error('novelId不存在')
    }
    req.novel = novel
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

// crudeDetect 是否粗糙检测编码；当ensuredEncoding启用时，crudeDetect无效。该函数包含空格替换的预处理步骤。
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

export async function readFallbackNovel(novel: INovel): Promise<IFallbackNovelData> {
    let content = ''
    if (appConfig.readFallbackNovelFromDisk) {
        content = await readNovelContentFromDisk(novel)
    } else {
        let bulkChapters = await Container.get(NovelModel).getBulkChaptersByNovelId(novel.id!)
        for (let bChapter of bulkChapters) {
            content += bChapter.title + '\n' + bChapter.content + '\n'
        }
    }
    let contentArr = parseContentArr(content)

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
                title: 'Chunk ' + numberWithCommas(realIndex + 1),
                content: cachedContent,
                wordcount: cachedWordcount
            })
            toc.push({
                orderId: realIndex,
                title: 'Chunk ' + numberWithCommas(realIndex + 1),
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

export async function readNovelContentFromDisk(novel: INovel) {
    let filePathArr = await glob.promise(path.join(appRoot.path, appConfig.fallbackNovelDirectory!, '**/*.txt'))
    let filePath = filePathArr.filter(value => path.parse(value).name == novel.title)
        .sort((a, b) => {
            return fs.statSync(b).size - fs.statSync(a).size
        })
    if (!filePath.length) {
        throw new Error(novel.title + ' 文件不存在')
    }
    return readFileMeta(filePath[0], false, novel.encoding).content
}

export function addWordcountLineToChapterContent(chapter: IChapter) {
    let dupChapter = JSON.parse(JSON.stringify(chapter))
    dupChapter.content = '字数：' + dupChapter.wordcount + '\n' + dupChapter.content
    return dupChapter
}

// 自动判断是否使用signifier提取章节，如果不用，返回mostIndent供后续使用，否则mostIndent为undefined
export function autoDetermineSignifierUsing(contentArr: string[]) {
    // 计算indent数量统计表
    let indentMap = new Map<string, number>()
    for (let [index, line] of contentArr.slice(0, appConfig.analyzeLineCount).entries()) {
        let indent = getLineIndent(line)
        let count = indentMap.get(indent) || 0
        count++
        indentMap.set(indent, count)
    }
    logger.debug(indentMap)

    // 计算最多出现的indent，就是段落了
    let mostIndent: string = ''
    let mostIndentCount: number = 0
    for (let [indent, count] of indentMap.entries()) {
        if (count >= mostIndentCount) {
            mostIndent = indent
            mostIndentCount = count
        }
    }

    // 判断是否要用signifier提取标题
    let useTitleWithSignifier = false
    // 如果indentMap是2（完美缩进），并且indent之标题的数量超过阈值，那么绝对用indent提取标题
    if (indentMap.size == 2
        && contentArr.slice(0, appConfig.analyzeLineCount).length - indentMap.get(mostIndent)! >= appConfig.titleSignifierCount) {
        useTitleWithSignifier = false
        logger.debug('前' + appConfig.analyzeLineCount + '行中标题行数量：'
            + (contentArr.slice(0, appConfig.analyzeLineCount).length - indentMap.get(mostIndent)!))
    } else {
        // 判断是否要用第x章这种格式提取标题
        let titleWithSignifierCount = 0
        for (let line of contentArr.slice(0, appConfig.analyzeLineCount)) {
            // 如果能够确定这一行是段落的话就跳过
            // if (getLineIndent(line) == mostIndent) {
            //     continue
            // }
            if (isTitleWithSignifier(line)) {
                titleWithSignifierCount++
            }
        }
        // 如果达到阈值，或者完全无法通过indent提取标题，那么就启用第x章方式
        if (titleWithSignifierCount >= appConfig.titleSignifierCount || indentMap.size == 1) {
            useTitleWithSignifier = true
            logger.debug('前' + appConfig.analyzeLineCount + '行中标题行数量：' + titleWithSignifierCount)
        }
    }
    logger.debug('采用正则法提取标题：' + useTitleWithSignifier)
    return {useTitleWithSignifier, mostIndent}
}

// 如果要使用signifier，就不要传mostIndent；在使用signifier时，如果没有传signifier，使用自带正则语法
export function buildChapterArr(args: IBuildChapterArrArguments) {
    let {contentArr, signifier, mostIndent} = args
    let useTitleWithSignifier = true
    if (mostIndent !== undefined) {
        useTitleWithSignifier = false
    }
    let chapterArr: IChapter[] = []
    // 缓存区数据
    let tmpTitle = '开始'
    let tmpContent = '开始章节\n'
    let tmpOrderId = 0
    for (let line of contentArr) {
        // 如果判断为章节标题
        if (isChapterTitle(useTitleWithSignifier, signifier, mostIndent, line)) {
            // 先处理缓存区
            chapterArr.push({
                novelId: 0,// 将在model中被重新fill
                title: tmpTitle,
                content: tmpContent,
                wordcount: tmpContent.length,
                orderId: tmpOrderId
            })
            tmpTitle = line.trim()
            tmpContent = ''
            tmpOrderId++
        } else {
            tmpContent += line.trim() + '\n'
        }
    }
    // 最后处理末尾缓存区
    chapterArr.push({
        novelId: 0,
        title: tmpTitle,
        content: tmpContent,
        wordcount: tmpContent.length,
        orderId: tmpOrderId
    })

    return chapterArr
}

function isChapterTitle(useTitleWithSignifier: boolean, signifier: RegExp | undefined, mostIndent: string | undefined, line: string) {
    if (useTitleWithSignifier/* && !options.indent*/) {
        return isTitleWithSignifier(line, signifier)
    } else {
        return getLineIndent(line) != mostIndent
    }
}

export function parseContentArr(content: string) {
    return content.split('\n').filter(value => value.trim().length != 0)
}

export {logger, db}
