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
        students: getStudentRoster()
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
 * Xử lý yêu cầu POST: Lưu kết quả nộp bài, điểm số và tiến độ học sinh
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
 * Lấy danh sách học sinh từ Google Sheet
 */
function getStudentRoster() {
  var sheet = getOrCreateSpreadsheet().getSheetByName("Danh_Sach_Hoc_Sinh");
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Chỉ có dòng tiêu đề

  var students = [];
  for (var i = 1; i < data.length; i++) {
    students.push({
      studentId: data[i][0],
      fullName: data[i][1],
      className: data[i][2],
      note: data[i][3] || ""
    });
  }
  return students;
}

/**
 * Ghi nhận điểm số bài nộp của học sinh vào Google Sheet
 */
function recordExerciseSubmission(payload) {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Bang_Diem_Bai_Tap");
  if (!sheet) {
    sheet = ss.insertSheet("Bang_Diem_Bai_Tap");
    sheet.appendRow(["Thời Gian", "Mã Học Sinh", "Tên Học Sinh", "Mã Bài Tập", "Điểm Số", "Trạng Thái", "Mã Nguồn Đã Nộp"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#d9ead3");
  }

  var row = [
    new Date(),
    payload.studentId || "ANONYMOUS",
    payload.studentName || "Học sinh ẩn danh",
    payload.exerciseId || "Unknown",
    payload.score || 100,
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
    sheet.appendRow(["Thời Gian", "Mã Học Sinh", "Mã Bài Học", "Trạng Thái"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#cfe2f3");
  }

  sheet.appendRow([
    new Date(),
    payload.studentId || "ANONYMOUS",
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

  // Nếu không có hoặc lỗi ID, tìm hoặc tạo thư mục "Python_Course_Data"
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

  var s1 = ss.getActiveSheet();
  s1.setName("Danh_Sach_Hoc_Sinh");
  s1.appendRow(["Mã Học Sinh", "Họ Và Tên", "Lớp", "Ghi Chú"]);
  s1.appendRow(["HS01", "Nguyễn Văn An", "10A1", "Học sinh mẫu"]);
  s1.appendRow(["HS02", "Trần Thị Bình", "10A1", "Học sinh mẫu"]);
  s1.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#fff2cc");

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
