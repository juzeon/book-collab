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

export {logger, db}
