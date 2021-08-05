require('dotenv').config()
const appConfig = {
    port: parseInt(process.env.PORT!),
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    analyzeLineCount: parseInt(process.env.ANALYZE_LINE_COUNT!),
    titleSignifierCount: parseInt(process.env.TITLE_SIGNIFIER_COUNT!),// 第、章、1-9、一-九
    maxTitleWordcount: parseInt(process.env.MAX_TITLE_WORDCOUNT!),
    perPage: parseInt(process.env.PER_PAGE!),
    testFilePath: process.env.TEST_FILE_PATH,
    splitChapterWordcount: parseInt(process.env.SPLIT_CHAPTER_WORDCOUNT!),
    crudeEncodingDetectSampleSize: parseInt(process.env.CRUDE_ENCODING_DETECT_SAMPLE_SIZE!),
    fallbackNovelDirectory: process.env.FALLBACK_NOVEL_DIRECTORY
}
export {appConfig}
