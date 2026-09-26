const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'ticket_user',
    password: process.env.DB_PASSWORD || 'TicketSecurePass2024!',
    database: process.env.DB_NAME || 'ticket_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

let pool = null;
let isConnected = false;

// Khởi tạo kết nối Pool
async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log(`[DATABASE] ✅ Kết nối thành công tới MySQL [${dbConfig.host}:${dbConfig.port}/${dbConfig.database}]`);
        connection.release();
        isConnected = true;
        return true;
    } catch (err) {
        console.warn(`[DATABASE] ⚠️ Chưa thể kết nối MySQL (${err.code || err.message}). Sẽ tự động thử lại khi có truy vấn...`);
        isConnected = false;
        return false;
    }
}

// Wrapper query hỗ trợ tái kết nối tự động
async function query(sql, params = []) {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    try {
        const [rows, fields] = await pool.execute(sql, params);
        isConnected = true;
        return rows;
    } catch (err) {
        console.error(`[DATABASE ERROR] Lỗi khi thực thi query:`, err.message);
        throw err;
    }
}

// Lấy connection riêng phục vụ Transaction (Transaction ACID khi đặt vé)
async function getConnection() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    return await pool.getConnection();
}

// Thử kết nối ban đầu
initDatabase();

module.exports = {
    query,
    getConnection,
    initDatabase,
    isDbConnected: () => isConnected,
    dbConfig
};
