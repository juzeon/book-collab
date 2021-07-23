import express from "express"
import {Container} from "typedi"
import {NovelService} from "../services/novel-service"
import {body} from "express-validator"

let novelService=Container.get(NovelService)
let novelRouter=express.Router()

novelRouter.get('/list',(req, res) => {

})

export {novelRouter}
