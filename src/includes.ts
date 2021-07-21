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


export {logger, db}
