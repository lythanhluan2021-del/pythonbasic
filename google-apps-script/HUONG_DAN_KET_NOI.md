# Hướng Dẫn Kết Nối Google Drive Vào Web App Python

Chào bạn, đường dẫn bạn gửi: `https://drive.google.com/drive/u/0/my-drive` là trang chính "Drive của tôi". 

Để Web App có thể **tự động đọc các bài học, bài tập và tự lưu điểm vào Google Sheet** hoàn toàn miễn phí mà không cần máy chủ, bạn chỉ cần thực hiện 3 bước đơn giản dưới đây (chỉ mất 2 phút):

---

## 🚀 Bước 1: Tạo Thư Mục Lưu Trữ Trên Google Drive Của Bạn
1. Mở [Google Drive](https://drive.google.com/drive/u/0/my-drive) của bạn.
2. Bấm nút **Mới (+)** -> **Thư mục mới** -> Đặt tên là `Python_Course_Data`.
3. Bấm mở thư mục `Python_Course_Data` vừa tạo.
4. Nhìn lên thanh địa chỉ trình duyệt, đường link sẽ có dạng:
   `https://drive.google.com/drive/u/0/folders/1A2b3C4d5E6f7G8h9...`
   👉 **Dãy ký tự sau chữ `folders/` chính là FOLDER ID của bạn** (Ví dụ: `1A2b3C4d5E6f7G8h9...`).

---

## ⚡ Bước 2: Tạo Cầu Nối Tự Động (Google Apps Script)
1. Truy cập vào trang: **[https://script.google.com/home](https://script.google.com/home)**
2. Bấm nút **Dự án mới (New Project)** ở góc trên bên trái.
3. Xóa hết code mặc định trong ô soạn thảo và **Dán toàn bộ nội dung file [Code.gs](file:///d:/WEB-APP/Python/google-apps-script/Code.gs)** vào.
4. *(Tùy chọn)*: Tại dòng số 20, bạn có thể dán `FOLDER ID` ở Bước 1 vào `var ROOT_FOLDER_ID = "DÁN_VÀO_ĐÂY";` (nếu không dán, hệ thống sẽ tự động tạo thư mục và Google Sheet cho bạn).
5. Bấm nút **Lưu (Biểu tượng đĩa mềm 💾)** hoặc nhấn `Ctrl + S`.

---

## 🌐 Bước 3: Triển Khai (Deploy) Lấy Đường Dẫn Kết Nối
1. Ở góc trên bên phải trang Apps Script, bấm nút màu xanh **Triển khai (Deploy)** -> Chọn **Triển khai mới (New deployment)**.
2. Bấm vào biểu tượng bánh răng ⚙ bên cạnh "Chọn loại", chọn **Ứng dụng web (Web app)**.
3. Điền các mục như sau:
   * **Mô tả**: `Python Web App Connector`
   * **Thực thi dưới dạng (Execute as)**: Chọn **Tôi (Me)**
   * **Ai có quyền truy cập (Who has access)**: Chọn **Bất kỳ ai (Anyone)** *(để học sinh trên điện thoại có thể đọc bài và nộp code)*
4. Bấm nút **Triển khai (Deploy)**.
5. Google sẽ yêu cầu "Ủy quyền truy cập" (Authorize access):
   * Bấm **Ủy quyền truy cập** -> Chọn tài khoản Google của bạn -> Bấm **Nâng cao (Advanced)** -> Bấm **Đi tới Dự án (không an toàn)** -> Bấm **Cho phép (Allow)**.
6. Sau khi xong, bạn sẽ nhận được một đường link **URL ứng dụng web (Web app URL)** có dạng:
   `https://script.google.com/macros/s/AKfycbx.../exec`
7. Bấm **Sao chép (Copy)** đường link này!

---

## 📱 Bước 4: Dán Vào Web App
Mở Web App lên, bấm nút **"Google Drive 🔄"** ở góc trên, dán đường link `https://script.google.com/macros/s/.../exec` vào và bấm **"Lưu & Đồng Bộ"**.

Ngay lập tức:
* Web App sẽ tải danh sách bài học và bài tập từ Google Drive của bạn.
* Google Drive của bạn sẽ tự động xuất hiện file Google Sheet `Python_Quan_Ly_Hoc_Sinh` để bạn theo dõi điểm và bài làm của học sinh theo thời gian thực!
