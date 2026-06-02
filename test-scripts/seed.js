const http = require('http');

console.log("🚀 Đang tiến hành bơm dữ liệu giả lập clickstream lớn vào hệ thống...");

// Hàm gửi 1 request
function sendRequest() {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            user_id: "user_" + Math.floor(Math.random() * 1000),
            page_viewed: ["homepage", "cart", "checkout", "product_detail"][Math.floor(Math.random() * 4)],
            session_id: "sess_" + Math.random().toString(36).substring(7)
        });

        const req = http.request({
            hostname: 'localhost', port: 8080, path: '/analytics', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        }, (res) => {
            res.on('data', () => {}); // Đọc luồng dữ liệu sạch
            res.on('end', () => resolve());
        });
        
        req.on('error', () => resolve()); // Bỏ qua lỗi kết nối tạm thời
        req.write(postData);
        req.end();
    });
}

// Chạy vòng lặp để bắn dữ liệu cực nhanh
async function main() {
    // Chạy đồng thời nhiều kết nối để tăng tốc
    for (let i = 0; i < 500; i++) {
        const promises = [];
        for (let j = 0; j < 100; j++) { // 500 vòng x 100 request = 50.000 records
            promises.push(sendRequest());
        }
        await Promise.all(promises);
        if (i % 50 === 0) console.log(`📈 Đã đẩy được khoảng ${(i * 100)} requests...`);
    }
    console.log("✨ Đã hoàn thành bơm tải luồng dữ liệu clickstream!");
}

main();