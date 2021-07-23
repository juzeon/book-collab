import 'reflect-metadata';
import express from 'express'
import * as fs from "fs"
import {getPoolCreatingPromise, logger} from "./includes"
import {novelRouter} from "./routers/novel-router"
import {appConfig} from "./config"
import cors from 'cors'

const app = express()

app.use(cors())
app.use('/novel',novelRouter)

async function entrypoint(){
    await getPoolCreatingPromise()
    app.listen(appConfig.port, () => {
        logger.debug('Server has started at port ' + appConfig.port)
    })
}
entrypoint()
