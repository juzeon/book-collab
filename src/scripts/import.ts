import 'reflect-metadata'
import {program} from 'commander'
import {db, getLineIndent, getPoolCreatingPromise, isTitleWithSignifier, logger, tagsToArray} from "../includes"
import * as fs from "fs"
import chardet from 'chardet'
import iconv from 'iconv-lite'
import * as path from "path"
import {appConfig} from "../config"
import {Container} from "typedi"
import {TagModel} from "../models/tag-model"
import {NovelModel} from "../models/novel-model"
import {IChapter} from "../types"
import glob from "glob-promise"

program
    .option('-f, --file <file>', '指定文件或文件夹导入', false)
    .option('-t, --tags <tags>', '打标签，中间使用逗号分隔。例如：A,B,C', false)
    .option('-o, --overwrite', '覆盖已经有存在标题的小说', false)
    .option('-i, --indent', '强制使用indent分章节', false)
program.parse()
const options = {
    file: program.opts().file,
    tags: program.opts().tags,
    overwrite: program.opts().overwrite,
    indent: program.opts().indent
}
logger.debug(options)

let tagModel = Container.get(TagModel)
let novelModel = Container.get(NovelModel)

async function script() {
    await getPoolCreatingPromise()
    if (options.tags) {
        await tagModel.createTagsOrIgnore(tagsToArray(options.tags))
    }
    if (!fs.existsSync(options.file)) {
        logger.debug('文件或文件夹不存在')
        return
    }
    if (fs.statSync(options.file).isFile()) {
        let filePath = options.file
        await importFromFile(filePath)
    } else {
        let files = await glob.promise(path.join(options.file, '**/*.txt'))
        for (let filePath of files) {
            if (fs.statSync(filePath).isFile()) {
                await importFromFile(filePath)
            }
        }
    }
    db.end()
}

script()

async function importFromFile(filePath: string) {
    let bookTitle = path.parse(filePath).name
    let novelIdOrNull = await novelModel.findNovelByTitle(bookTitle)
    if (novelIdOrNull && !options.overwrite) {
        // logger.debug('跳过：' + bookTitle)
        // logger.debug('------')
        return
    }
    logger.debug('开始处理：' + bookTitle)
    let contentBuffer = Buffer.from(fs.readFileSync(filePath))
    let encoding = chardet.detect(contentBuffer)
    let content: string
    // 获得编码方式
    logger.debug('编码方式：'+encoding)
    if (encoding != 'UTF-8') {
        content = Buffer.from(iconv.decode(contentBuffer, encoding!)).toString('utf-8')
    } else {
        content = contentBuffer.toString('utf-8')
    }

    // 预处理
    content = content.replace(/[　 ]/g, ' ')
        .replace(/\r/g, '')
    let bookWordcount = content.replace(/\s/g, '').length
    let contentArr = content.split('\n')
    contentArr = contentArr.filter(value => value.trim().length != 0)

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

    // 计算字数与段落数之比
    let wordParaRatio = bookWordcount / mostIndentCount
    logger.debug('Ratio: ' + wordParaRatio)

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

    // 录入数据库
    // 如果novel不存在的话插入novels表。不管怎么样novel表、tagmap表都不会被overwrite
    let novelId: number
    if (!novelIdOrNull) {
        let packet = await novelModel.insertNovels([{
            title: bookTitle,
            intro: contentArr.map(value => value.trim()).join('\n').slice(0, 300),
            wordcount: bookWordcount,
            time: Math.floor(Date.now() / 1000)
        }])
        novelId = packet.insertId
        if (options.tags) {
            await tagModel.taggingNovel(novelId, tagsToArray(options.tags))
        }
    } else {
        novelId = novelIdOrNull
    }
    // 插入chapters表
    // 先删除旧的chapters（不论是否存在）
    await novelModel.deleteChaptersByNovelId(novelId)
    let chapterArr = new Array<IChapter>()
    // 缓存区数据
    let tmpTitle = '开始'
    let tmpContent = '开始章节'
    let tmpOrderId = 0
    for (let line of contentArr) {
        // 如果判断为章节标题
        if (isChapterTitle(useTitleWithSignifier, mostIndent, line)) {
            // 先处理缓存区
            chapterArr.push({
                novelId: novelId,
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
        novelId: novelId,
        title: tmpTitle,
        content: tmpContent,
        wordcount: tmpContent.length,
        orderId: tmpOrderId
    })
    await novelModel.insertChapters(chapterArr)
    logger.debug('---------')
}

function isChapterTitle(useTitleWithSignifier: boolean, mostIndent: string, line: string) {
    if (useTitleWithSignifier && !options.indent) {
        return isTitleWithSignifier(line)
    } else {
        return getLineIndent(line) != mostIndent
    }
}
