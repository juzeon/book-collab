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
    query('tags').default('').customSanitizer((input: string, {req}) => {
        return tagsToArray(input)
    }),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.list(req.query.tags as string[], Number(req.query.page)))
    }
)
novelRouter.get('/:novelId',
    param('novelId').isInt().custom(novelExistValidator),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.novelInfo(req.params.novel as any as INovel))
    }
)
novelRouter.get('/:novelId/chapter/:orderId',
    param('novelId').isInt().custom(novelExistValidator),
    param('orderId').isInt({min:0}),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.chapter(Number(req.params.novelId),Number(req.params.orderId)))
    }
)

export {novelRouter}
