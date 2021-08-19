import express from "express"
import {Container} from "typedi"
import {NovelService} from "../services/novel-service"
import {param, query} from "express-validator"
import {hasValidationErrors, novelExistValidator, resultJson, tagsToArray} from "../includes"
import {NovelModel} from "../models/novel-model"
import {EReq, ERes, INovel} from "../types"
import expressAsyncHandler from "express-async-handler"

let novelService = Container.get(NovelService)
let novelModel = Container.get(NovelModel)
let novelRouter = express.Router()

novelRouter.get('/list',
    query('page').default(1).isInt({min: 1}),
    query('search').default(''),
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.list(Number(req.query.page), req.query.search as string))
    })
)
novelRouter.get('/listAll', expressAsyncHandler(async (req: express.Request, res: express.Response) => {
    res.json(await novelService.listAll())
}))
novelRouter.get('/:novelId',
    param('novelId').isInt().custom(novelExistValidator),
    query('fallback').default(false).isBoolean(),
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.novelInfo(req.novel!, Boolean(req.query.fallback)))
    })
)
novelRouter.get('/download/:novelId',
    param('novelId').isInt().custom(novelExistValidator),
    query('fallback').default(false).isBoolean(),
    query('raw').default(false).isBoolean(),
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        if (hasValidationErrors(req, res)) return
        await novelService.downloadNovel(res, req.novel!, Boolean(req.query.fallback), Boolean(req.query.raw))
    })
)
novelRouter.get('/:novelId/chapter/:orderId',
    param('novelId').isInt().custom(novelExistValidator),
    param('orderId').isInt({min: 0}),
    query('fallback').default(false).isBoolean(),
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.chapter(req.novel!, Number(req.params.orderId), Boolean(req.query.fallback)))
    })
)

export {novelRouter}
