export interface IChapter {
    id?: number,
    novelId: number,
    title: string,
    content: string,
    wordcount: number,
    orderId: number
}

export interface INovel {
    id?: number,
    title: string,
    intro: string,
    wordcount: number,
    time: number,
    tags?: string
}
