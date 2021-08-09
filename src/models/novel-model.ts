import 'reflect-metadata'
import {Service} from "typedi"
import {db, getNovelWithTagsSqlSegment, pageToLimitSqlSegment} from "../includes"
import {IChapter, INovel, ITocItem} from "../types"
import {fillIChapter, fillINovel, fillIToc} from "../entity-fill"

@Service()
export class NovelModel {
    async findNovelByTitle(title: string): Promise<number | null> {
        return (await db.query('select id from novels where title=?', [title]))?.[0]?.id || null
    }

    async insertNovels(novels: INovel[]) {
        return db.query('insert into novels (title,intro,wordcount,encoding,time) values ?', [
            novels.map(novel => [novel.title, novel.intro, novel.wordcount, novel.encoding, novel.time])
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

    async findNovelsByTagIdsKeywords(tagIdArr: number[], keywordArr: string[], page: number): Promise<INovel> {
        let likeSegment = ''
        if (keywordArr.length) {
            for (let keyword of keywordArr) {
                likeSegment += ' and n.title like \'%' + keyword + '%\' '
            }
        }
        let inSegment = ''
        if (tagIdArr.length) {
            inSegment = ' and n.id in (select tm.novelId from tagmap tm where tm.tagId in (' + tagIdArr.join(',') + ') ' +
                'group by tm.novelId having count(tm.novelId)=' + tagIdArr.length + ') '
        }
        /**
         select group_concat(t.name) as tags,n.* from novels n
         left join tagmap tm on tm.novelId=n.id
         left join tags t on t.id=tm.tagId
         where n.id in (select tm.novelId from tagmap tm where tm.tagId in (10,11) group by tm.novelId having count(tm.novelId)=2)
         // 子查询：统计每本查出的小说拥有的标签数量，如果这个数量为传入标签的数量，说明目标小说每个传入的标签都有，正是需要的
         group by n.id
         */
        let arr = await db.query(getNovelWithTagsSqlSegment('time', 'desc',
            'where 1=1 ' + inSegment + likeSegment) + pageToLimitSqlSegment(page))
        return arr.map((single: any) => fillINovel(single))
    }


    async getTocByNovelId(novelId: number): Promise<ITocItem[]> {
        let arr = await db.query('select orderId,title,wordcount from chapters where novelId=? order by orderId asc',
            [novelId])
        return arr.map((single: any) => fillIToc(single))
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
