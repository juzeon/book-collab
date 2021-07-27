require('dotenv').config()
const appConfig = {
    port: process.env.PORT as any as number,
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    analyzeLineCount: process.env.ANALYZE_LINE_COUNT as any as number,
    titleSignifierCount: process.env.TITLE_SIGNIFIER_COUNT as any as number,// 第、章、1-9、一-九
    maxTitleWordcount: process.env.MAX_TITLE_WORDCOUNT as any as number,
    perPage: process.env.PER_PAGE as any as number
}
export {appConfig}
