import 'reflect-metadata'
import {Inject, Service} from "typedi"
import {addWordcountLineToChapterContent, readFallbackNovel, readFileMeta, resultJson} from "../includes"
import {NovelModel} from "../models/novel-model"
import {IChapter, INovel, ITocItem} from "../types"
import {TagModel} from "../models/tag-model"
import express from "express"
import glob from "glob-promise"
import path from "path"
import appRoot from "app-root-path"
import {appConfig} from "../config"

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
        let tagIdArr = tagArr.length ? await this.novelModel.findTagIdsByName(tagArr) : []
        let novels = await this.novelModel.findNovelsByTagIdsKeywords(tagIdArr, keywordArr, page)
        return resultJson.success(novels)
    }

    async listAll(){
        let novels = await this.novelModel.getBulkNovels()
        return resultJson.success(novels)
    }

    async novelInfo(novel: INovel, fallback: boolean) {
        let toc: ITocItem[]
        if (fallback) {
            let iFallbackNovelData = await readFallbackNovel(novel)
            toc = iFallbackNovelData.toc
        } else {
            toc = await this.novelModel.getTocByNovelId(novel.id!)
        }
        return resultJson.success({meta: novel, toc: toc})
    }

    async downloadNovel(res: express.Response, novel: INovel, fallback: boolean, raw: boolean) {
        let txtContent = ''
        if (raw) {
            let filePathArr = await glob.promise(path.join(appRoot.path, appConfig.fallbackNovelDirectory!, '**/*.txt'))
            let filePath = filePathArr.find(value => path.parse(value).name == novel.title)
            txtContent = readFileMeta(filePath!, false, novel.encoding).content
        } else if (fallback) {
            let {chapters} = await readFallbackNovel(novel)
            chapters = chapters.map(value => addWordcountLineToChapterContent(value))
            for (let chapter of chapters) {
                txtContent += '# ' + chapter.title + '\n' + chapter.content + '\n'
            }
        } else {
            let chapters = await this.novelModel.getBulkChaptersByNovelId(novel.id!)
            chapters = chapters.map(value => addWordcountLineToChapterContent(value))
            for (let chapter of chapters) {
                txtContent += '# ' + chapter.title + '\n' + chapter.content + '\n'
            }
        }
        res.setHeader('Content-disposition', 'attachment; filename=' + encodeURI(novel.title) + '.txt')
        res.send(txtContent)
    }

    async chapter(novel: INovel, orderId: number, fallback: boolean) {
        let chapter: IChapter | null
        if (fallback) {
            let iFallbackNovelData = await readFallbackNovel(novel)
            chapter = iFallbackNovelData.chapters.find(value => value.orderId == orderId) || null
        } else {
            chapter = await this.novelModel.findChapterByNovelIdOrderId(novel.id!, orderId)
        }
        if (!chapter) {
            return resultJson.error('章节不存在')
        }
        chapter = addWordcountLineToChapterContent(chapter)
        return resultJson.success(chapter)
    }
}
