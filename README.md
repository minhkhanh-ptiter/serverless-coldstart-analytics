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

### 3. Thực hiện các kịch bản kiểm thử

Mở một terminal mới song song (giữ nguyên terminal Docker đang chạy) và thực hiện lệnh:

* **Kịch bản 1: Đo đạc hiệu năng và trễ Cold Start (TTFB)**

```bash
node test-scripts/benchmark.js

```

* **Kịch bản 2: Bơm tải lớn giả lập luồng dữ liệu quy mô ~50.000 bản ghi**

```bash
node test-scripts/seed.js

```

* **Kịch bản 3: Thử nghiệm khả năng chịu lỗi và tự phục hồi khi tắt đột ngột Database**

```bash
node test-scripts/live-fault-test.js

```
*(Trong lúc luồng log đang chạy, thực hiện lệnh docker stop analytics_postgres để ngắt DB và docker start analytics_postgres để kiểm tra tính năng khôi phục tự động).*

---

## 📊 Kết quả Thực Nghiệm & Phân Tích

Mô hình thực nghiệm ghi nhận sự chênh lệch rõ rệt về thời gian phản hồi cho byte đầu tiên (**TTFB - Time to First Byte**) qua các kịch bản:

| Kịch bản Test | Trạng thái hệ thống | Thời gian TTFB (ms) | Hành vi kết nối Database |
| --- | --- | --- | --- |
| **Warm Request 1** | Khởi động ban đầu | **143.47 ms** | Thời gian nạp môi trường ứng dụng và tạo lập Connection Pool. |
| **Warm Request 2** | Hệ thống ấm dần | **7.85 ms** | Pool kết nối đi vào hoạt động, triệt tiêu độ trễ bắt tay mạng. |
| **Warm Request 3** | Hệ thống ấm (Warm) | **6.55 ms** | Đạt trạng thái tối ưu tối đa nhờ tái sử dụng kết nối tĩnh từ Pool. |
| **Cold Request** | Hồi sinh sau 32s ngủ | **131.61 ms** | Chịu chi phí phạt (Cold Start Penalty) để nạp lại runtime và pool. |
| **Warm-back Request** | Ổn định sau Cold Start | **13.98 ms** | Hệ thống lập tức hồi phục về mức độ trễ thấp nhờ mượn pool mở sẵn. |
| **Database Down** | Nút lưu trữ bị ngắt | *500 / Network Error* | Tầng ứng dụng cô lập hoàn toàn lỗi mạng, không sập crash mã nguồn. |
| **Database Recovery** | Nút lưu trữ hồi sinh | *Tự động về 200 OK* | Hệ thống tự động thiết lập lại Pool kết nối (Self-healing thành công). |

### Biện luận lý thuyết (Özsu & Valduriez)

Dựa trên lý thuyết hệ quản trị cơ sở dữ liệu phân tán của **Özsu và Valduriez**, chi phí thiết lập kết nối TCP/IP qua mạng giữa các nút tính toán và lưu trữ vô cùng tốn tài nguyên. Thực nghiệm cho thấy TTFB vọt lên gấp gần **20 lần** (từ `6.55 ms` lên `131.61 ms`) khi xảy ra hiện tượng khởi động nguội.

Việc duy trì một Connection Pool tĩnh ở lớp phạm vi toàn cục (`Global Scope`) là chiến lược kiến trúc bắt buộc trong Serverless nhằm triệt tiêu độ trễ truyền thông này. Đồng thời, kiến trúc tách biệt hoàn toàn giữa Stateless Compute và Stateful Storage kết hợp Docker Volume giúp bảo toàn tuyệt đối tính toàn vẹn (`Data Persistence`) của bộ dữ liệu clickstream quy mô lớn ngay cả khi xảy ra sự cố sập nút phân tán ngẫu nhiên.
