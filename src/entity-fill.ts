import {IChapter, INovel, ITag, ITocItem} from "./types"

export function fillINovel(single: any) {
    return <INovel>{
        id: single.id,
        title: single.title,
        intro: single.intro,
        wordcount: single.wordcount,
        encoding: single.encoding,
        time: single.time,
        tags: single.tags
    }
}

export function fillIChapter(single: any) {
    return <IChapter>{
        id: single.id,
        novelId: single.novelId,
        title: single.title,
        content: single.content,
        wordcount: single.wordcount,
        orderId: single.orderId,
    }
}

export function fillIToc(single: any) {
    return <ITocItem>{
        orderId: single.orderId,
        title: single.title,
        wordcount: single.wordcount
    }
}

export function fillITag(single: any) {
    return <ITag>{
        id: single.id,
        name: single.name,
        count: single.count
    }
}
