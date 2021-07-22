import {program} from 'commander'
import {db, getLineIndent, getPoolCreatingPromise, isTitleWithSignifier, logger} from "../includes"
import * as fs from "fs"
import chardet from 'chardet'
import iconv from 'iconv-lite'
import * as path from "path"
import {appConfig} from "../config"

program
    .option('-f, --file <file>', '指定文件导入', false)
    .option('-d, --directory <directory>', '指定文件夹导入', false)
    .option('-t, --tags <tags>', '打标签，中间使用逗号分隔。例如：A,B,C', false)
program.parse()
const options = {
    file: program.opts().file,
    directory: program.opts().directory,
    tags: program.opts().tags,
}
logger.debug(options)

async function script() {
    await getPoolCreatingPromise()
    if (fs.existsSync(options.file) && fs.statSync(options.file).isFile()) {
        let filePath = options.file
        await importFromFile(filePath)
    } else if (fs.existsSync(options.directory) && fs.statSync(options.directory).isDirectory()) {
        let dir = fs.readdirSync(options.directory)
        for (let file of dir) {
            let filePath = path.join(options.directory, file)
            await importFromFile(filePath)
        }
    }
}

script()

async function importFromFile(filePath: string) {
    let bookTitle = path.parse(filePath).name
    logger.debug('开始处理： ' + bookTitle)
    let contentBuffer = Buffer.from(fs.readFileSync(filePath))
    let encoding = chardet.detect(contentBuffer)
    let content: string
    // 获得编码方式
    if (encoding == 'GB18030') {
        content = Buffer.from(iconv.decode(contentBuffer, 'GBK')).toString('utf-8')
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

    // 判断是否要用第x章这种格式提取标题
    let titleWithSignifierCount = 0
    let useTitleWithSignifier = false
    for (let line of contentArr.slice(0, appConfig.analyzeLineCount)) {
        if (getLineIndent(line) == mostIndent) {
            continue
        }
        if (isTitleWithSignifier(line)) {
            titleWithSignifierCount++
        }
    }
    // 如果达到阈值，或者完全无法通过indent提取标题，那么就启用第x章方式
    if (titleWithSignifierCount >= appConfig.titleSignifierCount || indentMap.size <= 1) {
        useTitleWithSignifier = true
    }
    logger.debug('useTitleWithSignifier: ' + useTitleWithSignifier)

    // 录入数据库
    if (!(await db.query('select id from novels where title=?', [bookTitle])).length) {
        await db.query('insert into novels (title,intro,wordcount,time) values(?,?,?,?)', [
            bookTitle, content.slice(0, 300), bookWordcount, Math.floor(Date.now() / 1000)
        ])
    }


    logger.debug('---------')
}
