import {configure, getLogger} from "log4js"
import mysql, {Pool} from 'promise-mysql'
import {appConfig} from "./config"
import * as fs from "fs"
import * as path from "path"
import express from "express"
import {validationResult} from "express-validator"

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
        /[1-9一二三四五六七八九十]+(章|回|幕|话|节|\.|、|:|：|-|，)+/.test(line)
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

export {logger, db}
