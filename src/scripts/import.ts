import 'reflect-metadata'
import {program} from 'commander'
import {
    db, autoDetermineSignifierUsing,
    getLineIndent,
    getPoolCreatingPromise,
    isTitleWithSignifier,
    logger,
    readFileMeta,
    tagsToArray, buildChapterArr
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
// .option('-i, --indent', '强制使用indent分章节', false)
program.parse()
const options = {
    file: program.opts().file,
    recursive: program.opts().recursive,
    tags: program.opts().tags,
    overwrite: program.opts().overwrite,
    // indent: program.opts().indent,
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

    let {useTitleWithSignifier, mostIndent} = autoDetermineSignifierUsing(contentArr)
    let chapterArr: IChapter[]
    if (useTitleWithSignifier) {
        chapterArr = buildChapterArr({contentArr})
    } else {
        chapterArr = buildChapterArr({contentArr, mostIndent})
    }

    // 准备录入数据库的资料
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

    await novelModel.insertNovelWithChapters(novel, tagArr, chapterArr)
    logger.debug('---------')
}



