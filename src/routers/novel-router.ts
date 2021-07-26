import express from "express"
import {Container} from "typedi"
import {NovelService} from "../services/novel-service"
import {query} from "express-validator"
import {hasValidationErrors} from "../includes"

let novelService = Container.get(NovelService)
let novelRouter = express.Router()

novelRouter.get('/list',
    query('page').default(1).isInt({min: 1}),
    query('tags').default('').customSanitizer((input: string, {req}) => {
        return input.split(',').filter(value => value.length != 0)
    }),
    async (req: express.Request, res: express.Response) => {
        if (hasValidationErrors(req, res)) return
        res.json(await novelService.list(req.query.tags as string[], req.query.page as any as number))
    })

export {novelRouter}
