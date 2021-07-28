import 'reflect-metadata'
import {Service} from "typedi"
import {db} from "../includes"

@Service()
export class TagModel {
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

    async taggingNovel(novelId: number, arr: string[]) {
        let tag2idMap = await this.getTag2idMap()
        let insertingArr = arr.map(tag => [novelId, tag2idMap.get(tag)])
        await db.query('insert into tagmap (novelId,tagId) values ?', [insertingArr])
    }

    async findTagIdsByName(tagNameArr: string[]) {
        let arr = await db.query('select id from tags where name in (?)', [tagNameArr])
        return arr.map((single: any) => Number(single.id))
    }
}
