// analytics-function/index.js
const express = require('express');
const { Pool, Client } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Cấu hình Database kết nối
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'analytics_db',
    port: 5432,
};

// CÁCH 1 (Tối ưu cho WARM START): Khởi tạo Connection Pool ở Global Scope
const pool = new Pool({ ...dbConfig, max: 10 });

// Biến lưu thời gian timeout để giả lập tự động tắt (Scale to Zero) sau 30s nhàn rỗi
let inactivityTimer;
const INACTIVITY_TIMEOUT = 30000; // 30 giây

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        console.log("⏰ 30 giây không có hoạt động. Giả lập tự động tắt Container (Scale to Zero)...");
        process.exit(0); // Tự giải phóng/tắt container
    }, INACTIVITY_TIMEOUT);
}

// Khởi động timer ngay khi container chạy lên (mô tả trạng thái chờ ban đầu)
resetInactivityTimer();

app.post('/analytics', async (req, res) => {
    resetInactivityTimer(); // Có request đến -> reset lại bộ đếm thời gian
    
    const { user_id, page_viewed, session_id } = req.body;
    const useColdStrategy = process.env.CONNECTION_STRATEGY === 'COLD';

    if (useColdStrategy) {
        // CÁCH 2: Tạo kết nối mới hoàn toàn (Mô phỏng Cold Start hoặc thiết kế lỗi)
        const client = new Client(dbConfig);
        try {
            await client.connect();
            await client.query(
                'INSERT INTO clickstream_events (user_id, page_viewed, session_id) VALUES ($1, $2, $3)',
                [user_id, page_viewed, session_id]
            );
            return res.status(200).send({ status: "success", strategy: "cold_connection" });
        } catch (err) {
            console.error(err);
            return res.status(500).send("Database Error");
        } finally {
            await client.end(); // Đóng kết nối ngay lập tức
        }
    } else {
        // CÁCH 1 (Tối ưu): Tái sử dụng kết nối từ Pool có sẵn
        try {
            await pool.query(
                'INSERT INTO clickstream_events (user_id, page_viewed, session_id) VALUES ($1, $2, $3)',
                [user_id, page_viewed, session_id]
            );
            return res.status(200).send({ status: "success", strategy: "warm_pool" });
        } catch (err) {
            console.error(err);
            return res.status(500).send("Database Error");
        }
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Function đang lắng nghe tại port ${PORT}`);
});