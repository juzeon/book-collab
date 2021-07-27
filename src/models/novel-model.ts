import 'reflect-metadata'
import {Service} from "typedi"
import {db, getNovelWithTagsSqlSegment, pageToLimitSqlSegment} from "../includes"
import {IChapter, INovel} from "../types"
import {fillIChapter, fillINovel} from "../entity-fill"

@Service()
export class NovelModel {
    async findNovelByTitle(title: string): Promise<number | null> {
        return (await db.query('select id from novels where title=?', [title]))?.[0]?.id || null
    }

    async insertNovels(novels: INovel[]) {
        return db.query('insert into novels (title,intro,wordcount,time) values ?', [
            novels.map(novel => [novel.title, novel.intro, novel.wordcount, novel.time])
        ])
    }

    async insertChapters(chapters: IChapter[]) {
        return db.query('insert into chapters (novelId,title,content,wordcount,orderId) values ?', [
            chapters.map(chapter => [chapter.novelId, chapter.title, chapter.content, chapter.wordcount, chapter.orderId])
        ])
    }

    async deleteChaptersByNovelId(novelId: number) {
        return db.query('delete from chapters where novelId=?', [novelId])
    }

    async getNovels(page: number) {
        let novels = await db.query(getNovelWithTagsSqlSegment('time', 'desc')
            + pageToLimitSqlSegment(page))
        return novels.map((novel: any) => fillINovel(novel))
    }

    async getTocByNovelId(novelId: number) {
        let arr = await db.query('select orderId,title,wordcount from chapters where novelId=? order by orderId asc',
            [novelId])
        return arr
    }

    async findNovelById(id: number) {
        let arr = await db.query(getNovelWithTagsSqlSegment('time', 'desc', 'where n.id=?'),
            [id])
        if (!arr.length) {
            return null
        }
        return fillINovel(arr[0])
    }

    async findChapterByNovelIdOrderId(novelId: number, orderId: number) {
        let arr = await db.query('select * from chapters where novelId=? and orderId=?', [novelId, orderId])
        if (!arr.length) {
            return null
        }
        return fillIChapter(arr[0])
    }
}
