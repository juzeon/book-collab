require('dotenv').config()
const appConfig={
    dbHost:process.env.DB_HOST,
    dbUser:process.env.DB_USER,
    dbPassword:process.env.DB_PASSWORD,
    dbName:process.env.DB_NAME,
}
export {appConfig}
