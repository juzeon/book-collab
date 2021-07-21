import {configure, getLogger} from "log4js"
import mysql from 'mysql2'
import {appConfig} from "./config"

const logger = getLogger()
logger.level = "debug"

const db = mysql.createPool({
    host: appConfig.dbHost,
    user: appConfig.dbUser,
    password: appConfig.dbPassword,
    database: appConfig.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise()

export function getLineIndent(line: string) {
    return /^\s*/.exec(line)![0]
}

export function isTitleWithSignifier(line: string) {
    return (/第+/.test(line) || /章+/.test(line) || /回+/.test(line) || /幕+/.test(line)
        || /[1-9]+/.test(line) || /[一二三四五六七八九十]+/.test(line)) && line.length <= appConfig.maxTitleWordcount
}

export {logger, db}
