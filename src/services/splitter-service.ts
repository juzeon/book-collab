import {Inject, Service} from "typedi"
import {NovelModel} from "../models/novel-model"

@Service()
export class SplitterService {
    @Inject()
    novelModel!: NovelModel

    constructor() {
    }
}
