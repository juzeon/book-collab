import {Service} from "typedi"

@Service()
export class NovelService {
    async list(tags: string[], page: number) {
        console.log(tags)
        console.log(page)
    }
}
