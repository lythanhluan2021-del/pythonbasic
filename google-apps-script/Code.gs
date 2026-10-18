/**
 * =========================================================================
 * BỘ BỐC TÁCH DỮ LIỆU GOOGLE DRIVE & GOOGLE SHEETS CHO WEB APP HỌC PYTHON
 * Hệ Thống Quản Lý Toàn Diện: Giáo Trình, Bài Tập & Cơ Sở Dữ Liệu Tài Khoản
 * =========================================================================
 * 
 * Hướng dẫn nhanh cho Thầy/Cô:
 * 1. Mở https://script.google.com/ và mở dự án Apps Script hiện tại của Thầy/Cô.
 * 2. Thay thế toàn bộ mã nguồn cũ bằng nội dung file này.
 * 3. Kiểm tra biến ROOT_FOLDER_ID bên dưới (đã điền sẵn ID thư mục của Thầy/Cô).
 * 4. Bấm biểu tượng 💾 (Lưu) hoặc Ctrl + S.
 * 5. Bấm "Deploy" (Triển khai) -> "Manage deployments" (Quản lý các bản triển khai)
 *    -> Bấm biểu tượng ✏️ (Chỉnh sửa) ở góc phải
 *    -> Ở mục Version (Phiên bản): Chọn "New version" (Phiên bản mới)
 *    -> Bấm nút "Deploy" (Triển khai).
 */

// === CẤU HÌNH THƯ MỤC CỦA BẠN ===
// Thư mục Python_Course_Data của Thầy/Cô: https://drive.google.com/drive/u/1/folders/1NWZ_U-bGtqd5EnWGwUyauzqH3FkaBBjn
var ROOT_FOLDER_ID = "1NWZ_U-bGtqd5EnWGwUyauzqH3FkaBBjn";
var SPREADSHEET_NAME = "Python_Quan_Ly_Hoc_Sinh";

/**
 * Xử lý yêu cầu GET: Bốc tách bài học, bài tập hoặc kiểm tra kết nối & cấu trúc DB
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
  
  try {
    var root = getRootFolder();
    var ss = getOrCreateSpreadsheet();
    // Đảm bảo cấu trúc 4 Sheet chuẩn luôn luôn tồn tại
    ensureDatabaseStructure(ss);

    if (action === "ping" || action === "init_database") {
      var folderLyThuyet = getOrCreateFolder("01_LyThuyet");
      var folderBaiTap = getOrCreateFolder("02_BaiTap");

      return jsonResponse({
        status: "success",
        message: "Kết nối thành công! Đã khởi tạo và đồng bộ cấu trúc 4 Sheet CSDL chuẩn vào đúng thư mục Python_Course_Data.",
        folderName: root.getName(),
        folderId: root.getId(),
        spreadsheetName: SPREADSHEET_NAME,
        spreadsheetUrl: ss.getUrl(),
        tabs: ["Tai_Khoan_Admin", "Tai_Khoan_Hoc_Sinh", "Tai_Khoan_Google", "Bang_Diem_Bai_Tap"],
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === "get_all_data") {
      return jsonResponse({
        status: "success",
        lessons: getLessonsFromDrive(),
        exercises: getExercisesFromDrive(),
        adminAccount: getAdminFromSheet(),
        schoolStudents: getSchoolStudentsFromSheet(),
        googleUsers: getGoogleUsersFromSheet()
      });
    }

    if (action === "get_all_users") {
      return jsonResponse({
        status: "success",
        adminAccount: getAdminFromSheet(),
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
 * Xử lý yêu cầu POST: Đồng bộ CSDL học sinh (hỗ trợ >1000 hàng), Admin, Google Users & Điểm số
 */
function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(rawData);
    var action = payload.action;

    var ss = getOrCreateSpreadsheet();
    ensureDatabaseStructure(ss);

    // 1. Đồng bộ toàn bộ CSDL (Học sinh + Admin)
    if (action === "sync_database" || action === "sync_all") {
      var studentCount = 0;
      if (Array.isArray(payload.students)) {
        studentCount = saveSchoolStudentsToSheet(payload.students);
      }
      if (payload.admin) {
        saveAdminCredentialsToSheet(payload.admin);
      }
      return jsonResponse({
        status: "success",
        message: "Đã lưu " + studentCount + " học sinh và cập nhật tài khoản Admin lên Google Sheet thành công!",
        studentCount: studentCount
      });
    }

    // 2. Đồng bộ danh sách học sinh trường
    if (action === "sync_school_students") {
      var count = saveSchoolStudentsToSheet(payload.students || []);
      if (payload.admin) {
        saveAdminCredentialsToSheet(payload.admin);
      }
      return jsonResponse({
        status: "success",
        message: "Đã đồng bộ thành công " + count + " tài khoản học sinh lên Google Sheet Tai_Khoan_Hoc_Sinh!",
        count: count
      });
    }

    // 3. Đồng bộ tài khoản quản trị Admin
    if (action === "sync_admin") {
      saveAdminCredentialsToSheet(payload.admin || {});
      return jsonResponse({ status: "success", message: "Đã lưu thông tin tài khoản Admin lên Google Sheet!" });
    }

    // 4. Ghi nhận người dùng Google đăng nhập
    if (action === "sync_google_user") {
      var res = recordGoogleUserToSheet(payload.profile || {});
      return jsonResponse({ status: "success", message: "Đã lưu tài khoản Google!", data: res });
    }

    // 5. Ghi điểm làm bài tập
    if (action === "submit_exercise") {
      var result = recordExerciseSubmission(payload);
      return jsonResponse({ status: "success", message: "Đã lưu điểm thành công!", data: result });
    }

    // 6. Cập nhật tiến độ lý thuyết
    if (action === "update_progress") {
      var prog = recordLessonProgress(payload);
      return jsonResponse({ status: "success", message: "Đã cập nhật tiến độ!", data: prog });
    }

    // 7. Bốc tách danh sách học sinh từ file (.csv, .json) trên Drive
    if (action === "sync_from_drive_file") {
      var importResult = syncStudentsFromUploadedDriveFiles();
      return jsonResponse({
        status: "success",
        message: importResult.message,
        count: importResult.count,
        students: importResult.students
      });
    }

    return jsonResponse({ status: "error", message: "Action POST không hợp lệ: " + action });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * =========================================================================
 * THIẾT LẬP VÀ ĐẢM BẢO CẤU TRÚC 4 SHEET CSDL CHUẨN
 * =========================================================================
 */
function ensureDatabaseStructure(ss) {
  // --- 1. Tab Tai_Khoan_Admin (Tài khoản Quản trị) ---
  var adminSheet = ss.getSheetByName("Tai_Khoan_Admin");
  if (!adminSheet) {
    adminSheet = ss.insertSheet("Tai_Khoan_Admin");
  }
  if (adminSheet.getLastRow() === 0) {
    adminSheet.appendRow(["Tên Đăng Nhập", "Mật Khẩu", "Họ Và Tên", "Quyền Hạn", "Trạng Thái", "Lần Cập Nhật Cuối"]);
    adminSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f4cccc");
    adminSheet.appendRow(["admin", "admin123", "Quản Trị Viên Hệ Thống", "SuperAdmin", "Hoạt Động", new Date().toLocaleString("vi-VN")]);
  }

  // --- 2. Tab Tai_Khoan_Hoc_Sinh (Tài khoản Học sinh nhà trường) ---
  var schoolSheet = ss.getSheetByName("Tai_Khoan_Hoc_Sinh");
  if (!schoolSheet) {
    // Nếu trước đó đang dùng tab tên Danh_Sach_Hoc_Sinh thì tự động đổi tên thành Tai_Khoan_Hoc_Sinh
    var oldSheet = ss.getSheetByName("Danh_Sach_Hoc_Sinh");
    if (oldSheet) {
      oldSheet.setName("Tai_Khoan_Hoc_Sinh");
      schoolSheet = oldSheet;
    } else {
      schoolSheet = ss.insertSheet("Tai_Khoan_Hoc_Sinh");
    }
  }
  if (schoolSheet.getLastRow() === 0) {
    schoolSheet.appendRow(["Mã Học Sinh / Tên Đăng Nhập", "Họ Và Tên", "Lớp", "Mật Khẩu", "Trạng Thái", "Lần Đăng Nhập Cuối"]);
    schoolSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#d9ead3");
  }

  // --- 3. Tab Tai_Khoan_Google (Tài khoản Google ngoài trường) ---
  var googleSheet = ss.getSheetByName("Tai_Khoan_Google");
  if (!googleSheet) {
    googleSheet = ss.insertSheet("Tai_Khoan_Google");
  }
  if (googleSheet.getLastRow() === 0) {
    googleSheet.appendRow(["Email", "Họ Và Tên", "Google ID", "Ảnh Đại Diện", "Lần Đăng Nhập Cuối"]);
    googleSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#cfe2f3");
  }

  // --- 4. Tab Bang_Diem_Bai_Tap (Sổ điểm & bài làm nộp tự động) ---
  var scoreSheet = ss.getSheetByName("Bang_Diem_Bai_Tap");
  if (!scoreSheet) {
    scoreSheet = ss.insertSheet("Bang_Diem_Bai_Tap");
  }
  if (scoreSheet.getLastRow() === 0) {
    scoreSheet.appendRow(["Thời Gian", "Loại Tài Khoản", "Tên Đăng Nhập / Email", "Họ Và Tên", "Lớp", "Mã Bài Tập", "Điểm Số", "Trạng Thái", "Mã Nguồn Đã Nộp"]);
    scoreSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#fff2cc");
  }

  return ss;
}

/**
 * Lưu / Đồng bộ toàn bộ danh sách học sinh trường lên Google Sheet
 * Đặc biệt: Tự động mở rộng số hàng khi danh sách vượt quá 1000 học sinh (ví dụ: 1297 học sinh)
 */
function saveSchoolStudentsToSheet(students) {
  var ss = getOrCreateSpreadsheet();
  ensureDatabaseStructure(ss);

  var sheet = ss.getSheetByName("Tai_Khoan_Hoc_Sinh");
  if (!sheet) {
    sheet = ss.insertSheet("Tai_Khoan_Hoc_Sinh");
  }

  var studentList = Array.isArray(students) ? students : [];

  // 1. Đảm bảo số hàng trong Sheet đủ chứa toàn bộ danh sách (vượt qua giới hạn 1000 hàng mặc định)
  var neededRows = studentList.length + 50;
  var currentMaxRows = sheet.getMaxRows();
  if (currentMaxRows < neededRows) {
    sheet.insertRowsAfter(currentMaxRows, neededRows - currentMaxRows);
  }

  // 2. Xóa toàn bộ nội dung cũ nhanh chóng
  sheet.clearContents();

  // 3. Thiết lập lại hàng tiêu đề chuẩn
  sheet.getRange(1, 1, 1, 6).setValues([["Mã Học Sinh / Tên Đăng Nhập", "Họ Và Tên", "Lớp", "Mật Khẩu", "Trạng Thái", "Lần Đăng Nhập Cuối"]]);
  sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#d9ead3");

  // 4. Chuẩn bị dữ liệu ghi hàng loạt
  var rows = [];
  for (var i = 0; i < studentList.length; i++) {
    var s = studentList[i];
    rows.push([
      String(s.username || ("HS_" + (i + 1))),
      String(s.fullName || ""),
      String(s.className || ""),
      String(s.password || "123"),
      String(s.status || "active"),
      String(s.lastLogin || "Chưa đăng nhập")
    ]);
  }

  // 5. Ghi toàn bộ dữ liệu chỉ với 1 lệnh duy nhất (cực nhanh, không bị timeout)
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }

  return rows.length;
}

/**
 * Lưu thông tin tài khoản Quản trị Admin vào Google Sheet
 */
function saveAdminCredentialsToSheet(admin) {
  var ss = getOrCreateSpreadsheet();
  ensureDatabaseStructure(ss);

  var sheet = ss.getSheetByName("Tai_Khoan_Admin");
  if (!sheet) {
    sheet = ss.insertSheet("Tai_Khoan_Admin");
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, 6).setValues([["Tên Đăng Nhập", "Mật Khẩu", "Họ Và Tên", "Quyền Hạn", "Trạng Thái", "Lần Cập Nhật Cuối"]]);
  sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f4cccc");

  sheet.getRange(2, 1, 1, 6).setValues([[
    String(admin.username || "admin"),
    String(admin.password || "admin123"),
    String(admin.fullName || "Quản Trị Viên Hệ Thống"),
    String(admin.role || "SuperAdmin"),
    "Hoạt Động",
    new Date().toLocaleString("vi-VN")
  ]]);

  return true;
}

/**
 * Lấy thông tin tài khoản Admin từ Google Sheet
 */
function getAdminFromSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tai_Khoan_Admin");
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  return {
    username: String(data[1][0] || "admin"),
    password: String(data[1][1] || "admin123"),
    fullName: String(data[1][2] || "Quản Trị Viên"),
    role: String(data[1][3] || "SuperAdmin"),
    status: String(data[1][4] || "Hoạt Động"),
    lastUpdated: data[1][5] ? String(data[1][5]) : null
  };
}

/**
 * Lấy danh sách tài khoản học sinh trường từ Google Sheet
 */
function getSchoolStudentsFromSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Tai_Khoan_Hoc_Sinh");
  if (!sheet) {
    sheet = ss.getSheetByName("Danh_Sach_Hoc_Sinh");
  }
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
 * Ghi nhận hoặc cập nhật người dùng Google vào Google Sheet
 */
function recordGoogleUserToSheet(profile) {
  if (!profile || !profile.email) return null;

  var ss = getOrCreateSpreadsheet();
  ensureDatabaseStructure(ss);

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
    sheet.getRange(foundRow, 2).setValue(profile.fullName || profile.name || "");
    sheet.getRange(foundRow, 4).setValue(profile.avatar || profile.picture || "");
    sheet.getRange(foundRow, 5).setValue(now);
  } else {
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
 * Ghi nhận điểm số bài nộp của học sinh vào Google Sheet
 */
function recordExerciseSubmission(payload) {
  var ss = getOrCreateSpreadsheet();
  ensureDatabaseStructure(ss);

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
    payload.fullName || payload.studentName || "Học sinh",
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
      } catch (e) {}
    }
  }

  return exercises;
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

    if (name.includes("hoc_sinh") && name.endsWith(".json")) {
      try {
        var content = file.getBlob().getDataAsString("UTF-8");
        var list = JSON.parse(content);
        if (Array.isArray(list)) {
          imported = imported.concat(list);
        }
      } catch (e) {}
    }

    if (name.includes("hoc_sinh") && name.endsWith(".csv")) {
      try {
        var csvContent = file.getBlob().getDataAsString("UTF-8");
        var lines = Utilities.parseCsv(csvContent);
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
    return { count: imported.length, students: imported, message: "Đã bốc tách thành công " + imported.length + " học sinh từ file trên Google Drive!" };
  }

  return { count: 0, students: [], message: "Không tìm thấy file danh_sach_hoc_sinh (.csv hoặc .json) trong thư mục Drive." };
}

// === CÁC HÀM TIỆN ÍCH HỆ THỐNG ===

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
    var ssExisting = SpreadsheetApp.open(folderFiles.next());
    ensureDatabaseStructure(ssExisting);
    return ssExisting;
  }

  // 2. Nếu file trước đó bị tạo ở My Drive gốc, chuyển ngay vào thư mục dự án
  var rootDriveFiles = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (rootDriveFiles.hasNext()) {
    var existingFile = rootDriveFiles.next();
    try {
      existingFile.moveTo(root);
    } catch (e) {
      root.addFile(existingFile);
      DriveApp.getRootFolder().removeFile(existingFile);
    }
    var ssMoved = SpreadsheetApp.open(existingFile);
    ensureDatabaseStructure(ssMoved);
    return ssMoved;
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

  ensureDatabaseStructure(ss);
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
