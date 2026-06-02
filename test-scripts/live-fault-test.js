const http = require('http');

const postData = JSON.stringify({
    user_id: "error_test_user",
    page_viewed: "live_stream_click",
    session_id: "live_sess"
});

const options = {
    hostname: 'localhost', port: 8080, path: '/analytics', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
};

function sendLiveRequest() {
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`✅ [${new Date().toLocaleTimeString()}] Ghi nhận sự kiện thành công! Status: 200 OK`);
            } else {
                console.log(`⚠️ [${new Date().toLocaleTimeString()}] Lớp Serverless báo lỗi tầng dữ liệu! Status: ${res.statusCode}`);
            }
        });
    });

    req.on('error', (e) => {
        console.log(`❌ [${new Date().toLocaleTimeString()}] KẾT NỐI BỊ ĐỨT GÃY: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

console.log("🔥 Bắt đầu luồng gửi request liên tục mỗi 300ms. Hãy thử tắt DB ngay bây giờ...");
// Cứ mỗi 300 mili-giây (0.3 giây) gửi 1 request liên tục
setInterval(sendLiveRequest, 300);