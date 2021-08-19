import 'reflect-metadata'
import {program} from 'commander'
import {
    db,
    getLineIndent,
    getPoolCreatingPromise,
    isTitleWithSignifier,
    logger,
    readFileMeta,
    tagsToArray
} from "../includes"
import * as fs from "fs"
import chardet from 'chardet'
import iconv from 'iconv-lite'
import * as path from "path"
import {appConfig} from "../config"
import {Container} from "typedi"
import {TagModel} from "../models/tag-model"
import {NovelModel} from "../models/novel-model"
import {IChapter, INovel} from "../types"
import glob from "glob-promise"

program
    .option('-f, --file <file>', '指定文件或文件夹导入，请保证仅有txt文件', false)
    .option('-r, --recursive', '当file为文件夹的时候，使用递归方式遍历文件夹与子文件夹', false)
    .option('-t, --tags <tags>', '打标签，中间使用逗号分隔。例如：A,B,C', false)
    .option('-o, --overwrite', '覆盖已经有存在标题的小说', false)
    .option('-i, --indent', '强制使用indent分章节', false)
program.parse()
const options = {
    file: program.opts().file,
    recursive: program.opts().recursive,
    tags: program.opts().tags,
    overwrite: program.opts().overwrite,
    indent: program.opts().indent,
}
logger.debug(options)

let tagModel = Container.get(TagModel)
let novelModel = Container.get(NovelModel)

async function script() {
    await getPoolCreatingPromise()
    if (!fs.existsSync(options.file)) {
        logger.debug('文件或文件夹不存在')
        return
    }
    if (fs.statSync(options.file).isFile()) {
        let filePath = options.file
        await importFromFile(filePath)
    } else {
        let files: string[]
        if (options.recursive) {
            files = await glob.promise(path.join(options.file, '**/*.txt'))
        } else {
            files = fs.readdirSync(options.file).map(value => path.join(options.file, value))
        }
        for (let filePath of files) {
            if (fs.statSync(filePath).isFile()) {
                await importFromFile(filePath)
                // await remedyEncoding(filePath)
            }
        }
    }
    db.end()
}

script()

// async function remedyEncoding(filePath: string) {
//     let bookTitle = path.parse(filePath).name
//     let novelIdOrNull = await novelModel.findNovelByTitle(bookTitle)
//     if (novelIdOrNull) {
//         let {content, encoding} = readFileMeta(filePath)
//         db.query('update novels set encoding=? where id=?', [encoding, novelIdOrNull])
//         console.log('修正 '+bookTitle+' with encoding '+encoding)
//     }
// }

async function importFromFile(filePath: string) {
    let bookTitle = path.parse(filePath).name
    let novelIdOrNull = await novelModel.findNovelByTitle(bookTitle)
    if (novelIdOrNull && !options.overwrite) {
        // logger.debug('跳过：' + bookTitle)
        // logger.debug('------')
        return
    }
    logger.debug('开始处理：' + bookTitle)
    let {content, encoding} = readFileMeta(filePath)
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
    let tagArr: string[] = []
    if (options.tags) {
        tagArr = tagsToArray(options.tags)
    }
    let novel = <INovel>{
        id: novelIdOrNull,
        title: bookTitle,
        intro: contentArr.map(value => value.trim()).join('\n').slice(0, 300),
        wordcount: bookWordcount,
        encoding: encoding,
        time: Math.floor(Date.now() / 1000)
    }
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
    await novelModel.insertNovelWithChapters(novel, tagArr, chapterArr)
    logger.debug('---------')
}

function isChapterTitle(useTitleWithSignifier: boolean, mostIndent: string, line: string) {
    if (useTitleWithSignifier && !options.indent) {
        return isTitleWithSignifier(line)
    } else {
        return getLineIndent(line) != mostIndent
    }
}

