import 'reflect-metadata'
import express from "express"
import {Container} from "typedi"
import {AdminService} from "../services/admin-service"
import {body} from "express-validator"
import {hasValidationErrors, novelExistValidator} from "../includes"
import expressAsyncHandler from "express-async-handler"
import {EReq, ERes} from "../types"

let adminService = Container.get(AdminService)
let adminRouter = express.Router()

adminRouter.post('/updateTags',
    body('novelId').isInt().custom(novelExistValidator),
    body('tags').exists().trim(),
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        if (hasValidationErrors(req, res)) return
        res.json(await adminService.updateTags(req.novel!, req.body.tags))
    })
)
adminRouter.post('/updateSignifier',
    body('novelId').isInt().custom(novelExistValidator),
    body('signifier').notEmpty().custom((input: string, {req}) => {
        req.body.regexp = new RegExp(input)
        return true
    }),
    expressAsyncHandler(async (req: EReq, res: ERes) => {
        if (hasValidationErrors(req, res)) return
        res.json(await adminService.updateSignifier(req.novel!, req.body.regexp))
    })
)

export {adminRouter}
