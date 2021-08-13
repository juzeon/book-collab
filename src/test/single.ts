import {getNovelsWithTagsSqlSegment} from "../includes"
import glob from "glob-promise"
import path from "path"

;(async function(){
    let files = await glob.promise(path.join('repo', '**/*.txt'))
    console.log(files)
})()
