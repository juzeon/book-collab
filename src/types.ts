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
    encoding: string,
    time: number,
    tags?: string
}

export interface ISplitedChapter {
    title: string,
    content: string,
    wordcount: number
}

export interface IFileData {
    content: string,
    encoding: string
}

export interface ITocItem {
    orderId: number,
    title: string,
    wordcount: number
}

export interface IFallbackNovelData {
    toc: ITocItem[],
    chapters: IChapter[]
}
