import express from "express"
import {Request} from 'express'

export type EReq = express.Request
export type ERes = express.Response

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

export interface IGetNovelsArguments {
    orderBy?: string,
    orderByType?: 'asc' | 'desc',
    novelTableConditions?: string,
    withoutIntro?: boolean
}

declare global {
    namespace Express {
        export interface Request {
            novel?: INovel
        }
    }
}
