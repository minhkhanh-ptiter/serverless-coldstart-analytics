Dưới đây là toàn bộ nội dung file `README.md` được viết dưới dạng mã Markdown nguyên bản để bạn dễ dàng copy trực tiếp vào VS Code:

```markdown
# Topic 130 - Serverless "Cold-Start" Data Persistence: "Event-Driven Analytics"

## 📝 Giới thiệu Dự án
Dự án này nghiên cứu và mô phỏng hiện tượng khởi động nguội (**Cold Start**) trong kiến trúc Serverless (cấu hình tự động tắt sau 30 giây nhàn rỗi - Scale to Zero) và đánh giá hệ quả của nó tới việc quản lý kết nối cơ sở dữ liệu (**Database Connection Pooling**). Hệ thống xử lý luồng dữ liệu sự kiện Clickstream được xây dựng bằng nền tảng Node.js, lưu trữ phân tán bền vững trên PostgreSQL và điều phối thông qua Docker Compose.

---

## 🏗️ Kiến trúc Hệ thống
Hệ thống được thiết kế theo mô hình tách biệt độc lập giữa tính toán và lưu trữ:
* **Stateless Compute Layer:** Node.js Express App (Serverless Function giả lập tự động tắt sau 30s không nhận request bằng lệnh `process.exit(0)`).
* **Stateful Storage Layer:** PostgreSQL 15 (Sử dụng Docker Volume Persistence để bảo toàn dữ liệu clickstream khi container tính toán bị hủy hoặc restart).

---

## 🛠️ Công nghệ Sử dụng
* **Môi trường & Điều phối:** Docker, Docker Compose (Cấu hình Multi-stage build để tối ưu hóa kích thước Image).
* **Backend Runtime:** Node.js (Express, pg driver).
* **Database:** PostgreSQL 15 Alpine.

---

## 🚀 Hướng dẫn Cài đặt & Chạy Thực Nghiệm

### 1. Yêu cầu hệ thống
* Đã cài đặt **Docker** và **Docker Compose**.
* Máy host cài đặt **Node.js** để chạy script kiểm thử.

### 2. Khởi chạy môi trường hệ thống
Mở terminal tại thư mục gốc của dự án và chạy câu lệnh sau để build và kích hoạt hệ thống:
```bash
docker compose up --build

```

*Đợi cho đến khi thấy log báo `🚀 Function đang lắng nghe tại port 8080`. Hệ thống sẽ tự động tắt container ứng dụng sau 30s nếu không nhận được request nào.*

### 3. Chạy Script đo đạc kiểm thử Performance (TTFB)

Mở một terminal mới song song (giữ nguyên terminal Docker đang chạy) và thực hiện lệnh:

```bash
node test-scripts/benchmark.js

```

---

## 📊 Kết quả Thực Nghiệm & Phân Tích

Mô hình thực nghiệm ghi nhận sự chênh lệch rõ rệt về thời gian phản hồi cho byte đầu tiên (**TTFB - Time to First Byte**) qua các kịch bản:

| Kịch bản Test | Trạng thái hệ thống | Thời gian TTFB (ms) | Hành vi kết nối Database |
| --- | --- | --- | --- |
| **Warm Request 1** | Container đang ngủ sâu | *Socket hang up* | Hệ thống bị đứt gãy kết nối do Docker đang dựng lại runtime. |
| **Warm Request 2** | Khởi động container | **~79.07 ms** | Thiết lập ban đầu và khởi tạo Global Connection Pool. |
| **Warm Request 3** | Hệ thống ấm (Warm) | **~5.52 ms** | Tối ưu tối đa nhờ tái sử dụng kết nối có sẵn từ Pool. |
| **Cold Request** | Hồi sinh sau 32s ngủ | **~76.07 ms** | Chịu chi phí phạt (Cold Start Penalty) để nạp lại runtime và pool. |
| **Warm-back Request** | Ổn định sau Cold Start | **~6.84 ms** | Hệ thống quay lại trạng thái tối ưu. |

### Biện luận lý thuyết (Özsu & Valduriez)

Dựa trên lý thuyết hệ quản trị cơ sở dữ liệu phân tán của **Özsu và Valduriez**, chi phí thiết lập kết nối TCP/IP qua mạng giữa các nút tính toán và lưu trữ vô cùng tốn tài nguyên. Thực nghiệm cho thấy TTFB vọt lên gấp gần **14 lần** (từ `5.52 ms` lên `76.07 ms`) khi xảy ra hiện tượng khởi động nguội. Việc sử dụng Connection Pool ở phạm vi toàn cục (`Global Scope`) là chiến lược bắt buộc trong kiến trúc Serverless nhằm triệt tiêu độ trễ này cho các request kế tiếp.

```
