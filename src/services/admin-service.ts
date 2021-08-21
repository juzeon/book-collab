import 'reflect-metadata'
import {Inject, Service} from "typedi"
import {INovel} from "../types"
import {NovelModel} from "../models/novel-model"
import {resultJson} from "../includes"

@Service()
export class AdminService {
    @Inject()
    novelModel!: NovelModel

    async updateTags(novel: INovel, tags: string) {
        let tagArr = tags.split(',').filter(value => value.length != 0)
        await this.novelModel.updateTagsByNovelId(novel.id!, tagArr)
        return resultJson.success(tagArr)
    }
}
