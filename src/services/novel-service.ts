import 'reflect-metadata'
import {Inject, Service} from "typedi"
import {resultJson} from "../includes"
import {NovelModel} from "../models/novel-model"
import {INovel} from "../types"

@Service()
export class NovelService {
    @Inject()
    novelModel!: NovelModel

    async list(tags: string[], page: number) {
        let novels = await this.novelModel.getNovels(page)
        return resultJson.success(novels)
    }

    async novelInfo(novel: INovel) {
        let toc = await this.novelModel.getTocByNovelId(novel.id!)
        return resultJson.success({meta: novel, toc: toc})
    }

    async chapter(novelId: number, orderId: number) {
        let chapter = await this.novelModel.findChapterByNovelIdOrderId(novelId, orderId)
        return resultJson.success(chapter)
    }
}
