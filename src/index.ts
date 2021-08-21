import 'reflect-metadata'
import express from 'express'
import * as fs from "fs"
import {getPoolCreatingPromise, logger} from "./includes"
import {novelRouter} from "./routers/novel-router"
import {appConfig} from "./config"
import cors from 'cors'
import {auth} from "./middlewares/auth"
import {adminRouter} from "./routers/admin-router"
import {tagRouter} from "./routers/tag-router"

const app = express()

app.use(cors())
app.use(express.urlencoded({extended: true}))
app.use('/admin', auth)

app.use('/novel', novelRouter)
app.use('/admin', adminRouter)
app.use('/tag', tagRouter)

async function entrypoint() {
    await getPoolCreatingPromise()
    app.listen(appConfig.port, () => {
        logger.debug('Server has started at port ' + appConfig.port)
    })
}

entrypoint()
