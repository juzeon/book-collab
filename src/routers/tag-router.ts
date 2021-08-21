import 'reflect-metadata'
import express from "express"
import expressAsyncHandler from "express-async-handler"
import {EReq, ERes} from "../types"
import {Container} from "typedi"
import {TagService} from "../services/tag-service"

let tagRouter = express.Router()
let tagService = Container.get(TagService)
tagRouter.get('/listAll',
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        res.json(await tagService.listAll())
    })
)

export {tagRouter}
