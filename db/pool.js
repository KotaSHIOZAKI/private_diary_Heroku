const { Pool } = require("pg");

// DB情報をもったプールを生成
const pool = new Pool({
    host: 'ec2-54-211-255-161.compute-1.amazonaws.com',
    database: 'db2qtc7fdrjjvu',
    port: 5432,
    user: 'pkhhfjbkjcjyjy',
    password: 'd4a65cb046c99cd0af587aec46743c4a680ffb42b254e0fe4ee51e7f1bfe8cdd',
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        sslmode: 'require',
        rejectUnauthorized: false
    }
});

module.exports = pool;