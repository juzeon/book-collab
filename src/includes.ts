import {configure, getLogger} from "log4js"
import mysql, {Pool} from 'promise-mysql'
import {appConfig} from "./config"

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
    return (/第+/.test(line) || /章+/.test(line) || /回+/.test(line) || /幕+/.test(line)
        || /[1-9]+/.test(line) || /[一二三四五六七八九十]+/.test(line)) && line.length <= appConfig.maxTitleWordcount
}

export {logger, db}
