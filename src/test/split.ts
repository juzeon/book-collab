import {readFileMeta, db, getPoolCreatingPromise, numberWithCommas} from "../includes"
import {appConfig} from "../config"


(async function () {
    await getPoolCreatingPromise()
    db.end()
})()

let {content, encoding} = readFileMeta(appConfig.testFilePath!, true)


