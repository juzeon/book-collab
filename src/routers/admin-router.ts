import 'reflect-metadata'
import express from "express"
import {Container} from "typedi"
import {AdminService} from "../services/admin-service"
import {body, param} from "express-validator"
import {novelExistValidator} from "../includes"

let adminService=Container.get(AdminService)
let adminRouter=express.Router()

adminRouter.post('/updateTags',
    body('novelId').isInt().custom(novelExistValidator))
