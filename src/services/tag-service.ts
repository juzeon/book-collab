import 'reflect-metadata'
import {Inject, Service} from "typedi"
import {resultJson} from "../includes"
import {NovelModel} from "../models/novel-model"

@Service()
export class TagService {
    @Inject()
    novelModel!: NovelModel

    async listAll() {
        let tags = await this.novelModel.getBulkTags()
        return resultJson.success(tags)
    }
}
