import express from "express"
import {Container} from "typedi"
import {NovelService} from "../services/novel-service"
import {param, query} from "express-validator"
import {hasValidationErrors, novelExistValidator, resultJson, tagsToArray} from "../includes"
import {NovelModel} from "../models/novel-model"
import {INovel} from "../types"

let novelService = Container.get(NovelService)
let novelModel = Container.get(NovelModel)
let novelRouter = express.Router()

novelRouter.get('/list',
    query('page').default(1).isInt({min: 1}),
    query('search').default(''),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.list(Number(req.query.page), req.query.search as string))
    }
)
novelRouter.get('/:novelId',
    param('novelId').isInt().custom(novelExistValidator),
    query('fallback').default(false).isBoolean(),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.novelInfo(req.params.novel as any as INovel, Boolean(req.query.fallback)))
    }
)
novelRouter.get('/:novelId/chapter/:orderId',
    param('novelId').isInt().custom(novelExistValidator),
    param('orderId').isInt({min: 0}),
    query('fallback').default(false).isBoolean(),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.chapter(req.params.novel as any as INovel, Number(req.params.orderId), Boolean(req.query.fallback)))
    }
)

export {novelRouter}
