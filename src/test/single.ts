import {getNovelWithTagsSqlSegment} from "../includes"

console.log(getNovelWithTagsSqlSegment('time', 'desc', 'where id=?'))
