import 'reflect-metadata'
import {Service} from "typedi"
import {db, getNovelsWithTagsSqlSegment, pageToLimitSqlSegment, tagsToArray} from "../includes"
import {IChapter, INovel, ITocItem} from "../types"
import {fillIChapter, fillINovel, fillIToc} from "../entity-fill"

@Service()
export class NovelModel {
    // tag部分
    _tag2idMap: Map<string, number> | null = null

    async getTag2idMap() {
        if (this._tag2idMap) {
            return this._tag2idMap
        }
        this._tag2idMap = new Map<string, number>()
        let tags = await db.query('select * from tags')
        for (let tag of tags) {
            this._tag2idMap.set(tag.name, tag.id)
        }
        return this._tag2idMap
    }

    async createTagsOrIgnore(arr: string[]) {
        await db.query('insert ignore into tags (`name`) values ?', [arr.map(value => [value])])
    }

    async findTagIdsByName(tagNameArr: string[]) {
        let arr = await db.query('select id from tags where name in (?)', [tagNameArr])
        return arr.map((single: any) => Number(single.id))
    }

    async taggingNovel(novelId: number, arr: string[]) {
        let tag2idMap = await this.getTag2idMap()
        let insertingArr = arr.map(tag => [novelId, tag2idMap.get(tag)])
        await db.query('insert into tagmap (novelId,tagId) values ?', [insertingArr])
    }

    // novel部分

    // select n.id,n.title,count(c.id) as count from novels n left join chapters c on n.id=c.novelId group by c.novelId limit 10
    // 获取每本小说的章节数
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
        let novels = await db.query(getNovelsWithTagsSqlSegment()
            + pageToLimitSqlSegment(page))
        return novels.map((novel: any) => fillINovel(novel))
    }

    async getBulkNovels() {
        let novels = await db.query(getNovelsWithTagsSqlSegment({withoutIntro: true}))
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
        let arr = await db.query(getNovelsWithTagsSqlSegment({
            novelTableConditions: 'where 1=1 ' + inSegment + likeSegment
        }) + pageToLimitSqlSegment(page))
        return arr.map((single: any) => fillINovel(single))
    }


    async getTocByNovelId(novelId: number): Promise<ITocItem[]> {
        let arr = await db.query('select orderId,title,wordcount from chapters where novelId=? order by orderId asc',
            [novelId])
        return arr.map((single: any) => fillIToc(single))
    }

    async getBulkChaptersByNovelId(novelId: number): Promise<IChapter[]> {
        let arr = await db.query('select * from chapters where novelId=? order by orderId asc', [novelId])
        return arr.map((single: any) => fillIChapter(single))
    }

    async findNovelById(id: number) {
        let arr = await db.query(getNovelsWithTagsSqlSegment({novelTableConditions: 'where n.id=?'}),
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

    async insertNovelWithChapters(novel: INovel, tagArr: string[], chapterArr: IChapter[]) {
        let conn = await db.getConnection()
        await conn.beginTransaction()
        // 如果novel不存在的话插入novels表。不管怎么样novel表、tagmap表都不会被overwrite
        if (!novel.id) {
            // insert novel
            let result = await conn.query('insert into novels (title,intro,wordcount,encoding,time) values (?,?,?,?,?)', [
                novel.title, novel.intro, novel.wordcount, novel.encoding, novel.time
            ])
            novel.id = result.insertId

            // 只有当novelId不存在（新加小说），并且tag有东西的时候才打tag
            if (tagArr.length) {
                // create tags or ignore
                await db.query('insert ignore into tags (`name`) values ?', [tagArr.map(value => [value])])
                // tagging novel
                let tag2idMap = await this.getTag2idMap()
                let insertingArr = tagArr.map(tag => [novel.id, tag2idMap.get(tag)])
                await conn.query('insert into tagmap (novelId,tagId) values ?', [insertingArr])
            }
        }
        // 先删除旧的chapters（不论是否存在）
        await conn.query('delete from chapters where novelId=?', [novel.id])
        // insert chapters
        await conn.query('insert into chapters (novelId,title,content,wordcount,orderId) values ?', [
            chapterArr.map(chapter => [novel.id, chapter.title, chapter.content, chapter.wordcount, chapter.orderId])
        ])
        // commit
        try {
            await conn.commit()
        }catch (e) {
            await conn.rollback()
            throw e
        }
        conn.release()
    }
}
