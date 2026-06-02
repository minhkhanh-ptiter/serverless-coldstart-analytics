const http = require('http');

// Cấu hình request gửi tới Serverless Function
const postData = JSON.stringify({
    user_id: "student_ptit_130",
    page_viewed: "dashboard_click",
    session_id: "session_" + Math.random().toString(36).substring(7)
});

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/analytics',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

// Hàm thực hiện 1 request và đo chính xác chỉ số TTFB
function measureRequest(label) {
    return new Promise((resolve) => {
        const startTime = process.hrtime.bigint(); // Thời gian bắt đầu (nano giây)
        let ttfbDurationMs = 0; // Khai báo ở phạm vi hàm để mọi sự kiện đều dùng được
        
        const req = http.request(options, (res) => {
            // Sự kiện 'readable' hoặc nhận được chunk đầu tiên chính là mốc tính TTFB
            res.once('readable', () => {
                const ttfbTime = process.hrtime.bigint();
                ttfbDurationMs = Number(ttfbTime - startTime) / 1000000; // Đổi sang mili-giây
                console.log(`📊 [${label}] TTFB (Time to First Byte): ${ttfbDurationMs.toFixed(2)} ms`);
            });

            // Nhận hết dữ liệu
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const endTime = process.hrtime.bigint();
                const totalDurationMs = Number(endTime - startTime) / 1000000;
                resolve({ ttfb: ttfbDurationMs, total: totalDurationMs });
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Lỗi kết nối khi test [${label}]: ${e.message}`);
            resolve(null);
        });

        req.write(postData);
        req.end();
    });
}

// Kịch bản chạy Test theo vòng đời Serverless
async function runBenchmark() {
    console.log("=== BẮT ĐẦU CHƯƠNG TRÌNH ĐO ĐẠC PERFORMANCE (CHỦ ĐỀ 130) ===");
    
    // 1. Test WARM START (Gửi các request liên tiếp khi container đang bật sẵn)
    console.log("\n⚡ Đang đo kịch bản WARM START...");
    await measureRequest("Warm Request 1");
    await measureRequest("Warm Request 2");
    await measureRequest("Warm Request 3");

    // 2. Mô phỏng chờ COLD START
    console.log("\n⏰ Vui lòng chờ 32 giây để Container tự sập (Scale to Zero)...");
    let countdown = 32;
    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            process.stdout.write(`Thời gian còn lại: ${countdown}s \r`);
        } else {
            clearInterval(interval);
        }
    }, 1000);

    setTimeout(async () => {
        console.log("\n❄️ Container đã sập và tự Restart. Bây giờ gửi request mới để kích hoạt COLD START...");
        await measureRequest("Cold Request (Scale from Zero)");
        
        console.log("\n🔥 Gửi tiếp request ngay sau đó để xem tốc độ hồi phục về trạng thái WARM:");
        await measureRequest("Warm-back Request");
        
        console.log("\n=== KẾT THÚC BÀI TEST ===");
    }, 32000);
}

runBenchmark();