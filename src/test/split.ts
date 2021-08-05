import {readFileMeta, db, getPoolCreatingPromise, numberWithCommas} from "../includes"
import {appConfig} from "../config"
import {ISplitedChapter} from "../types"


(async function () {
    await getPoolCreatingPromise()
    db.end()
})()

let {content, encoding} = readFileMeta(appConfig.testFilePath!, true)


