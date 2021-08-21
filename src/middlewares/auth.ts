import {EReq, ERes} from "../types"
import express from "express"
import {appConfig} from "../config"
import {resultJson} from "../includes"

export function auth(req: EReq, res: ERes, next: express.NextFunction) {
    if (!req.header('authorization')) {
        res.json(resultJson.error('该接口需要管理员权限'))
    } else if (req.header('authorization') !== appConfig.adminKey) {
        res.json(resultJson.error('管理员认证出错'))
    } else {
        next()
    }
}
