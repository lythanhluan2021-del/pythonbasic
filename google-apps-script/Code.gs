/**
 * =========================================================================
 * BỘ BỐC TÁCH DỮ LIỆU GOOGLE DRIVE & GOOGLE SHEETS CHO WEB APP HỌC PYTHON
 * Tác giả: Antigravity AI
 * =========================================================================
 * 
 * Hướng dẫn nhanh cho Thầy/Cô:
 * 1. Mở https://script.google.com/ và bấm "New project" (Dự án mới).
 * 2. Dán toàn bộ nội dung file này vào.
 * 3. Điền FOLDER_ID (ID của thư mục chứa bài học trên Google Drive của bạn) vào biến bên dưới.
 * 4. Bấm "Deploy" (Triển khai) -> "New deployment" -> Chọn loại "Web app".
 *    - Execute as: "Me" (Tôi)
 *    - Who has access: "Anyone" (Bất kỳ ai)
 * 5. Sao chép "Web app URL" và dán vào nút "Kết nối Google Drive" trên Web App.
 */

// === CẤU HÌNH THƯ MỤC CỦA BẠN ===
// Thư mục Python_Course_Data của bạn: https://drive.google.com/drive/u/1/folders/1NWZ_U-bGtqd5EnWGwUyauzqH3FkaBBjn
var ROOT_FOLDER_ID = "1NWZ_U-bGtqd5EnWGwUyauzqH3FkaBBjn";
var SPREADSHEET_NAME = "Python_Quan_Ly_Hoc_Sinh";

/**
 * Xử lý yêu cầu GET: Bốc tách bài học, bài tập hoặc kiểm tra kết nối
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
  
  try {
    if (action === "ping") {
      // Tự động kiểm tra và đảm bảo Google Sheet + các thư mục con nằm chuẩn trong thư mục dự án
      var root = getRootFolder();
      var ss = getOrCreateSpreadsheet();
      var folderLyThuyet = getOrCreateFolder("01_LyThuyet");
      var folderBaiTap = getOrCreateFolder("02_BaiTap");

      return jsonResponse({
        status: "success",
        message: "Kết nối thành công! Đã tự động tạo/chuyển file Google Sheet vào đúng thư mục Python_Course_Data của bạn.",
        folderName: root.getName(),
        folderId: root.getId(),
        spreadsheetName: SPREADSHEET_NAME,
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === "get_all_data") {
      return jsonResponse({
        status: "success",
        lessons: getLessonsFromDrive(),
        exercises: getExercisesFromDrive(),
        schoolStudents: getSchoolStudentsFromSheet(),
        googleUsers: getGoogleUsersFromSheet()
      });
    }

    if (action === "get_all_users") {
      return jsonResponse({
        status: "success",
        schoolStudents: getSchoolStudentsFromSheet(),
        googleUsers: getGoogleUsersFromSheet()
      });
    }

    if (action === "get_lessons") {
      return jsonResponse({
        status: "success",
        lessons: getLessonsFromDrive()
      });
    }

    if (action === "get_exercises") {
      return jsonResponse({
        status: "success",
        exercises: getExercisesFromDrive()
      });
    }

    return jsonResponse({ status: "error", message: "Hành động không hợp lệ: " + action });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Xử lý yêu cầu POST: Lưu kết quả nộp bài, đồng bộ tài khoản học sinh & tài khoản Google
 */
function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(rawData);
    var action = payload.action;

    if (action === "submit_exercise") {
      // Ghi điểm bài tập vào Google Sheet
      var result = recordExerciseSubmission(payload);
      return jsonResponse({ status: "success", message: "Đã lưu điểm thành công!", data: result });
    }

    if (action === "update_progress") {
      // Ghi nhận tiến độ học bài lý thuyết
      var result = recordLessonProgress(payload);
      return jsonResponse({ status: "success", message: "Đã cập nhật tiến độ!", data: result });
    }

    if (action === "sync_school_students") {
      // Đồng bộ danh sách học sinh trường vào Sheet Tai_Khoan_Hoc_Sinh
      var count = saveSchoolStudentsToSheet(payload.students || []);
      return jsonResponse({ status: "success", message: "Đã đồng bộ " + count + " tài khoản học sinh trường lên Google Sheet!" });
    }

    if (action === "sync_google_user") {
      // Ghi nhận / Cập nhật tài khoản Google vào Sheet Tai_Khoan_Google
      var res = recordGoogleUserToSheet(payload.profile || {});
      return jsonResponse({ status: "success", message: "Đã lưu tài khoản Google!", data: res });
    }

    if (action === "sync_from_drive_file") {
      // Bốc tách danh sách học sinh từ file (.csv, .json) mà thầy cô tải lên Drive
      var importResult = syncStudentsFromUploadedDriveFiles();
      return jsonResponse({ status: "success", message: importResult.message, count: importResult.count, students: importResult.students });
    }

    return jsonResponse({ status: "error", message: "Action POST không hợp lệ" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Bốc tách toàn bộ các file lý thuyết (.md, Google Docs, .txt) trong thư mục 01_LyThuyet
 */
function getLessonsFromDrive() {
  var lessons = [];
  var folder = getOrCreateFolder("01_LyThuyet");
  var files = folder.getFiles();

  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var mime = file.getMimeType();
    var content = "";

    if (mime === MimeType.GOOGLE_DOCS) {
      var doc = DocumentApp.openById(file.getId());
      content = doc.getBody().getText();
    } else {
      content = file.getBlob().getDataAsString("UTF-8");
    }

    lessons.push({
      id: file.getId(),
      filename: name,
      title: formatLessonTitle(name),
      content: content,
      lastUpdated: file.getLastUpdated().toISOString()
    });
  }

  // Sắp xếp bài theo thứ tự tên file (Bai_01, Bai_02,...)
  lessons.sort(function(a, b) {
    return a.filename.localeCompare(b.filename);
  });

  return lessons;
}

/**
 * Bốc tách các file bài tập (.json) trong thư mục 02_BaiTap
 */
function getExercisesFromDrive() {
  var exercises = [];
  var folder = getOrCreateFolder("02_BaiTap");
  var files = folder.getFiles();

  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    if (name.endsWith(".json")) {
      try {
        var raw = file.getBlob().getDataAsString("UTF-8");
        var parsed = JSON.parse(raw);
        parsed.fileId = file.getId();
        exercises.push(parsed);
      } catch (e) {
        // Bỏ qua nếu định dạng JSON lỗi
      }
    }
  }

  return exercises;
}

/**
 * Lấy danh sách tài khoản học sinh trường từ Google Sheet
 */
function getSchoolStudentsFromSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tai_Khoan_Hoc_Sinh");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var students = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    students.push({
      username: String(data[i][0]).trim(),
      fullName: String(data[i][1] || "").trim(),
      className: String(data[i][2] || "").trim(),
      password: String(data[i][3] || "123").trim(),
      status: String(data[i][4] || "active").toLowerCase() === "locked" ? "locked" : "active",
      lastLogin: data[i][5] ? String(data[i][5]) : null
    });
  }
  return students;
}

/**
 * Lấy danh sách người dùng đăng nhập bằng Google từ Google Sheet
 */
function getGoogleUsersFromSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tai_Khoan_Google");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var users = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    users.push({
      email: String(data[i][0]).trim(),
      fullName: String(data[i][1] || "").trim(),
      googleId: String(data[i][2] || "").trim(),
      avatar: String(data[i][3] || "").trim(),
      lastLogin: data[i][4] ? String(data[i][4]) : null
    });
  }
  return users;
}

/**
 * Lưu / Đồng bộ toàn bộ danh sách học sinh trường lên Google Sheet
 */
function saveSchoolStudentsToSheet(students) {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tai_Khoan_Hoc_Sinh");
  if (!sheet) {
    sheet = ss.insertSheet("Tai_Khoan_Hoc_Sinh");
  }

  // Xóa dữ liệu cũ trừ header
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // Ghi lại header nếu trống
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Mã Học Sinh / Tên Đăng Nhập", "Họ Và Tên", "Lớp", "Mật Khẩu", "Trạng Thái", "Lần Đăng Nhập Cuối"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#d9ead3");
  }

  var rows = [];
  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    rows.push([
      s.username || ("HS_" + (i + 1)),
      s.fullName || "",
      s.className || "",
      s.password || "123",
      s.status || "active",
      s.lastLogin || ""
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }

  return rows.length;
}

/**
 * Ghi nhận hoặc cập nhật người dùng Google vào Google Sheet
 */
function recordGoogleUserToSheet(profile) {
  if (!profile || !profile.email) return null;

  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tai_Khoan_Google");
  if (!sheet) {
    sheet = ss.insertSheet("Tai_Khoan_Google");
    sheet.appendRow(["Email", "Họ Và Tên", "Google ID", "Ảnh Đại Diện", "Lần Đăng Nhập Cuối"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#cfe2f3");
  }

  var data = sheet.getDataRange().getValues();
  var targetEmail = String(profile.email).toLowerCase().trim();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === targetEmail) {
      foundRow = i + 1;
      break;
    }
  }

  var now = new Date().toLocaleString("vi-VN");
  if (foundRow > 0) {
    // Cập nhật dòng đã có
    sheet.getRange(foundRow, 2).setValue(profile.fullName || profile.name || "");
    sheet.getRange(foundRow, 4).setValue(profile.avatar || profile.picture || "");
    sheet.getRange(foundRow, 5).setValue(now);
  } else {
    // Thêm dòng mới
    sheet.appendRow([
      targetEmail,
      profile.fullName || profile.name || "Người dùng Google",
      profile.googleId || profile.sub || "",
      profile.avatar || profile.picture || "",
      now
    ]);
  }

  return { email: targetEmail, updated: true };
}

/**
 * Tự động bốc tách danh sách học sinh từ file (.csv, .json) tải lên thư mục Python_Course_Data
 */
function syncStudentsFromUploadedDriveFiles() {
  var root = getRootFolder();
  var files = root.getFiles();
  var imported = [];

  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName().toLowerCase();

    // Bốc tách từ file JSON (ví dụ: danh_sach_hoc_sinh.json)
    if (name.includes("hoc_sinh") && name.endsWith(".json")) {
      try {
        var content = file.getBlob().getDataAsString("UTF-8");
        var list = JSON.parse(content);
        if (Array.isArray(list)) {
          imported = imported.concat(list);
        }
      } catch (e) {}
    }

    // Bốc tách từ file CSV (ví dụ: hocsinh_10a1.csv)
    if (name.includes("hoc_sinh") && name.endsWith(".csv")) {
      try {
        var csvContent = file.getBlob().getDataAsString("UTF-8");
        var lines = Utilities.parseCsv(csvContent);
        // Bỏ qua header
        for (var i = 1; i < lines.length; i++) {
          var row = lines[i];
          if (row.length >= 2 && row[0]) {
            imported.push({
              username: String(row[0]).trim(),
              fullName: String(row[1] || "").trim(),
              className: String(row[2] || "Lớp Mới").trim(),
              password: String(row[3] || "123").trim()
            });
          }
        }
      } catch (e) {}
    }
  }

  if (imported.length > 0) {
    saveSchoolStudentsToSheet(imported);
    return { count: imported.length, students: imported, message: "Đã bốc tách thành công " + imported.length + " học sinh từ file tải lên Google Drive!" };
  }

  return { count: 0, students: [], message: "Không tìm thấy file danh_sach_hoc_sinh (.csv hoặc .json) trong thư mục Drive." };
}

/**
 * Ghi nhận điểm số bài nộp của học sinh vào Google Sheet
 */
function recordExerciseSubmission(payload) {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Bang_Diem_Bai_Tap");
  if (!sheet) {
    sheet = ss.insertSheet("Bang_Diem_Bai_Tap");
    sheet.appendRow(["Thời Gian", "Loại Tài Khoản", "Tên Đăng Nhập / Email", "Họ Và Tên", "Lớp", "Mã Bài Tập", "Điểm Số", "Trạng Thái", "Mã Nguồn Đã Nộp"]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#fff2cc");
  }

  var row = [
    new Date().toLocaleString("vi-VN"),
    payload.userType || (payload.email ? "Google" : "Học Sinh Trường"),
    payload.username || payload.email || payload.studentId || "ANONYMOUS",
    payload.fullName || payload.studentName || "Học sinh ẩn danh",
    payload.className || "Tự do",
    payload.exerciseId || "Unknown",
    payload.score || 10,
    payload.passed ? "ĐẠT (Passed)" : "CHƯA ĐẠT (Failed)",
    payload.submittedCode || ""
  ];

  sheet.appendRow(row);
  return { recordedAt: new Date().toISOString() };
}

/**
 * Ghi nhận tiến độ đọc bài lý thuyết
 */
function recordLessonProgress(payload) {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tien_Do_Hoc_Tap");
  if (!sheet) {
    sheet = ss.insertSheet("Tien_Do_Hoc_Tap");
    sheet.appendRow(["Thời Gian", "Mã Học Sinh / Email", "Mã Bài Học", "Trạng Thái"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#cfe2f3");
  }

  sheet.appendRow([
    new Date().toLocaleString("vi-VN"),
    payload.username || payload.studentId || "ANONYMOUS",
    payload.lessonId || "Unknown",
    "Đã Hoàn Thành"
  ]);

  return { recordedAt: new Date().toISOString() };
}

// === CÁC HÀM TIỆN ÍCH HỖ TRỢ ===

function getRootFolder() {
  if (ROOT_FOLDER_ID && ROOT_FOLDER_ID.trim() !== "") {
    try {
      return DriveApp.getFolderById(ROOT_FOLDER_ID.trim());
    } catch (e) {
      console.warn("Không mở được thư mục theo ROOT_FOLDER_ID: " + e.message);
    }
  }

  var it = DriveApp.getFoldersByName("Python_Course_Data");
  if (it.hasNext()) {
    return it.next();
  }
  return DriveApp.createFolder("Python_Course_Data");
}

function getOrCreateFolder(subfolderName) {
  var root = getRootFolder();
  var subIt = root.getFoldersByName(subfolderName);
  if (subIt.hasNext()) {
    return subIt.next();
  }
  return root.createFolder(subfolderName);
}

function getOrCreateSpreadsheet() {
  var root = getRootFolder();

  // 1. Kiểm tra xem file đã nằm trong thư mục dự án chưa
  var folderFiles = root.getFilesByName(SPREADSHEET_NAME);
  if (folderFiles.hasNext()) {
    return SpreadsheetApp.open(folderFiles.next());
  }

  // 2. Nếu file trước đó bị tạo ở ngoài My Drive, di chuyển ngay vào thư mục dự án
  var rootDriveFiles = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (rootDriveFiles.hasNext()) {
    var existingFile = rootDriveFiles.next();
    try {
      existingFile.moveTo(root);
    } catch (e) {
      root.addFile(existingFile);
      DriveApp.getRootFolder().removeFile(existingFile);
    }
    return SpreadsheetApp.open(existingFile);
  }

  // 3. Nếu chưa từng tạo, tạo mới Spreadsheet và đưa ngay vào thư mục dự án
  var ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  var ssFile = DriveApp.getFileById(ss.getId());
  try {
    ssFile.moveTo(root);
  } catch (e) {
    root.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
  }

  // Thiết lập 3 Tab Sheets chuẩn
  // Tab 1: Tài khoản học sinh trường
  var s1 = ss.getActiveSheet();
  s1.setName("Tai_Khoan_Hoc_Sinh");
  s1.appendRow(["Mã Học Sinh / Tên Đăng Nhập", "Họ Và Tên", "Lớp", "Mật Khẩu", "Trạng Thái", "Lần Đăng Nhập Cuối"]);
  s1.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#d9ead3");

  // Tab 2: Tài khoản Google
  var s2 = ss.insertSheet("Tai_Khoan_Google");
  s2.appendRow(["Email", "Họ Và Tên", "Google ID", "Ảnh Đại Diện", "Lần Đăng Nhập Cuối"]);
  s2.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#cfe2f3");

  // Tab 3: Bảng điểm
  var s3 = ss.insertSheet("Bang_Diem_Bai_Tap");
  s3.appendRow(["Thời Gian", "Loại Tài Khoản", "Tên Đăng Nhập / Email", "Họ Và Tên", "Lớp", "Mã Bài Tập", "Điểm Số", "Trạng Thái", "Mã Nguồn Đã Nộp"]);
  s3.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#fff2cc");

  return ss;
}

function formatLessonTitle(filename) {
  return filename
    .replace(/\.(md|txt|docx|json)$/i, "")
    .replace(/_/g, " ");
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
