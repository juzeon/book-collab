import {Service} from "typedi"
import {db} from "../includes"
import {IChapter, INovel} from "../types"

@Service()
export class NovelModel {
    async findNovelByTitle(title: string): Promise<number | null> {
        return (await db.query('select id from novels where title=?', [title]))?.[0]?.id || null
    }

    async insertNovels(novels: INovel[]) {
        return db.query('insert into novels (title,intro,wordcount,time) values ?', [
            novels.map(novel => [novel.title, novel.intro, novel.wordcount, novel.title])
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
}
