import 'reflect-metadata'
import {Inject, Service} from "typedi"
import {resultJson} from "../includes"
import {NovelModel} from "../models/novel-model"
import {INovel} from "../types"
import {TagModel} from "../models/tag-model"

@Service()
export class NovelService {
    @Inject()
    novelModel!: NovelModel

    @Inject()
    tagModel!: TagModel

    async list(page: number, search: string) {
        let searchArr = search.split(' ').filter(value => value.length != 0)
        if (searchArr.length == 0) {// 如果不需要进行搜索
            let novels = await this.novelModel.getNovels(page)
            return resultJson.success(novels)
        }
        // 如果需要进行搜索
        let tagArr = searchArr.filter(value => value.startsWith('#')).map(value => value.slice(1))
        let keywordArr = searchArr.filter(value => !value.startsWith('#'))
            .map(value => value.replace(/%/g, '').trim())
            .filter(value => value.length != 0)
        let tagIdArr = tagArr.length ? await this.tagModel.findTagIdsByName(tagArr) : []
        let novels = await this.novelModel.findNovelsByTagIdsKeywords(tagIdArr, keywordArr)
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
