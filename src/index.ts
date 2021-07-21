import 'reflect-metadata';
import express from 'express'
import * as fs from "fs"
import {logger} from "./includes"
import {novelRouter} from "./routers/novel-router"

const port = process.env.BC_PORT || 9999

const app = express()

app.use(novelRouter)

app.listen(port, () => {
    logger.debug('Server has started at port ' + port)
})
