import {IChapter, INovel} from "./types"

export function fillINovel(single: any) {
    return <INovel>{
        id: single.id,
        title: single.title,
        intro: single.intro,
        wordcount: single.wordcount,
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
