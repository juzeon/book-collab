import 'reflect-metadata'
import {Inject, Service} from "typedi"
import {INovel} from "../types"
import {NovelModel} from "../models/novel-model"
import {buildChapterArr, parseContentArr, readNovelContentFromDisk, resultJson} from "../includes"

@Service()
export class AdminService {
    @Inject()
    novelModel!: NovelModel

    async updateTags(novel: INovel, tags: string) {
        let tagArr = tags.split(',').filter(value => value.length != 0)
        await this.novelModel.updateTagsByNovelId(novel.id!, tagArr)
        return resultJson.success(tagArr)
    }

    async updateSignifier(novel: INovel, signifier: RegExp) {
        let content = await readNovelContentFromDisk(novel)
        let contentArr = parseContentArr(content)
        let chapterArr = buildChapterArr({contentArr, signifier})
        await this.novelModel.insertNovelWithChapters(novel, [], chapterArr)
        return resultJson.success(novel)
    }
}
