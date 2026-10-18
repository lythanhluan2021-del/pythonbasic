/**
 * Admin Store: Quản lý cấu hình tính năng, giáo trình tùy biến,
 * và dữ liệu học sinh giữa Trang Quản Trị (Admin) và Trang Học Sinh (User).
 */

import { COURSE_MODULES } from './course-data.js';

export const STORAGE_KEYS = {
  SETTINGS: 'pysublime_settings',
  CURRICULUM: 'pysublime_custom_curriculum',
  DRIVE_API_URL: 'pysublime_drive_api_url',
  STUDENT_PROFILE: 'pysublime_student_profile',
  COMPLETED_LESSONS: 'pysublime_completed_lessons',
  SUBMITTED_EXERCISES: 'pysublime_submitted_exercises',
  SUBMISSION_LOGS: 'pysublime_submission_logs',
  SCHOOL_STUDENTS: 'pysublime_school_students',
  GOOGLE_USERS: 'pysublime_google_users',
  CURRENT_USER: 'pysublime_current_user',
  ADMIN_CREDENTIALS: 'pysublime_admin_credentials'
};

export const DEFAULT_SETTINGS = {
  layoutMode: 'simple',          // 'simple': 2 cột tinh gọn (Terminal ở dưới), 'split': 3 cột, 'tabs': từng bước
  showVirtualKeyboard: 'auto',    // 'auto': chỉ hiện trên mobile/touch, 'always': luôn hiện, 'never': luôn ẩn
  simplifiedHeader: true,        // Ẩn các nút kỹ thuật phức tạp (Drive config) khỏi header học sinh
  showHints: true,               // Hiển thị gợi ý khi làm bài
  autoOpenTerminal: true,        // Tự mở terminal khi chạy code/chấm điểm
  allowFreeNav: true,            // Cho phép học sinh tự do chọn bài học
  editorFontSize: 14,            // Cỡ chữ trong Ace Editor (13, 14, 16, 18)
  theme: 'monokai',
  siteTitle: 'PySublime',
  subTitle: 'Học Python Cơ Bản'
};

class AdminStore {
  constructor() {
    this.settings = this.loadSettings();
  }

  // === CẤU HÌNH TÍNH NĂNG (FEATURE SETTINGS) ===
  loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn("Không thể tải settings, dùng mặc định:", e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    window.dispatchEvent(new CustomEvent('pysublime_settings_changed', { detail: this.settings }));
    return this.settings;
  }

  getSettings() {
    return this.settings;
  }

  // === QUẢN LÝ GIÁO TRÌNH (CURRICULUM MANAGEMENT) ===
  getCurriculum() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRICULUM);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc giáo trình tùy biến, dùng giáo trình gốc:", e);
    }
    return COURSE_MODULES;
  }

  saveCurriculum(modules) {
    localStorage.setItem(STORAGE_KEYS.CURRICULUM, JSON.stringify(modules));
    window.dispatchEvent(new CustomEvent('pysublime_curriculum_changed', { detail: modules }));
  }

  resetCurriculumToDefault() {
    localStorage.removeItem(STORAGE_KEYS.CURRICULUM);
    window.dispatchEvent(new CustomEvent('pysublime_curriculum_changed', { detail: COURSE_MODULES }));
    return COURSE_MODULES;
  }

  addLesson(moduleId, lessonData) {
    const curriculum = this.getCurriculum();
    const mod = curriculum.find(m => m.id === moduleId);
    if (!mod) throw new Error("Không tìm thấy chương " + moduleId);

    const newId = lessonData.id || `bai-${Date.now().toString().slice(-4)}`;
    const newLesson = {
      ...lessonData,
      id: newId
    };

    mod.lessons.push(newLesson);
    this.saveCurriculum(curriculum);
    return newLesson;
  }

  updateLesson(lessonId, updatedData) {
    const curriculum = this.getCurriculum();
    let found = false;

    for (const mod of curriculum) {
      const idx = mod.lessons.findIndex(l => l.id === lessonId);
      if (idx !== -1) {
        mod.lessons[idx] = { ...mod.lessons[idx], ...updatedData };
        found = true;
        break;
      }
    }

    if (!found) throw new Error("Không tìm thấy bài học ID: " + lessonId);
    this.saveCurriculum(curriculum);
  }

  deleteLesson(lessonId) {
    const curriculum = this.getCurriculum();
    for (const mod of curriculum) {
      const idx = mod.lessons.findIndex(l => l.id === lessonId);
      if (idx !== -1) {
        mod.lessons.splice(idx, 1);
        this.saveCurriculum(curriculum);
        return true;
      }
    }
    return false;
  }

  findLesson(lessonId) {
    const curriculum = this.getCurriculum();
    for (const mod of curriculum) {
      const l = mod.lessons.find(item => item.id === lessonId);
      if (l) return { lesson: l, module: mod };
    }
    return null;
  }

  // === QUẢN LÝ BÀI NỘP VÀ HỌC SINH (STUDENT SUBMISSIONS) ===
  recordSubmissionLog(record) {
    try {
      const logs = this.getSubmissionLogs();
      logs.unshift({
        id: 'sub_' + Date.now(),
        timestamp: new Date().toISOString(),
        ...record
      });
      // Giới hạn 200 bài nộp gần nhất
      const trimmed = logs.slice(0, 200);
      localStorage.setItem(STORAGE_KEYS.SUBMISSION_LOGS, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("Lỗi lưu lịch sử nộp bài:", e);
    }
  }

  getSubmissionLogs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSION_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  clearSubmissionLogs() {
    localStorage.removeItem(STORAGE_KEYS.SUBMISSION_LOGS);
    localStorage.removeItem(STORAGE_KEYS.SUBMITTED_EXERCISES);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED_LESSONS);
  }

  // === QUẢN LÝ TÀI KHOẢN HỌC SINH TRƯỜNG (SCHOOL STUDENTS) ===
  getSchoolStudents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL_STUDENTS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Tự động dọn sạch nếu là mock data mẫu cũ
          const isOldMock = parsed.length > 0 && parsed.every(s => 
            s.username.startsWith('HS10A1_0') && ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Đức', 'Đặng Ngọc Hoa'].includes(s.fullName)
          );
          if (isOldMock) {
            localStorage.setItem(STORAGE_KEYS.SCHOOL_STUDENTS, JSON.stringify([]));
            return [];
          }
          return parsed;
        }
      }
    } catch (e) {}

    return [];
  }

  saveSchoolStudents(students) {
    localStorage.setItem(STORAGE_KEYS.SCHOOL_STUDENTS, JSON.stringify(students));
    window.dispatchEvent(new CustomEvent('pysublime_users_changed', { detail: { type: 'school', count: students.length } }));
  }

  clearAllSchoolStudents() {
    this.saveSchoolStudents([]);
    return 0;
  }

  addSchoolStudent(student) {
    const list = this.getSchoolStudents();
    const username = student.username.trim().toUpperCase();
    if (list.some(s => s.username.toUpperCase() === username)) {
      throw new Error(`Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`);
    }

    const newStudent = {
      username: username,
      fullName: student.fullName.trim(),
      className: student.className.trim(),
      password: student.password || '123',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    list.unshift(newStudent);
    this.saveSchoolStudents(list);
    return newStudent;
  }

  updateSchoolStudent(username, updatedData) {
    const list = this.getSchoolStudents();
    const idx = list.findIndex(s => s.username.toUpperCase() === username.toUpperCase());
    if (idx === -1) throw new Error("Không tìm thấy học sinh: " + username);

    list[idx] = { ...list[idx], ...updatedData };
    this.saveSchoolStudents(list);
    return list[idx];
  }

  deleteSchoolStudent(username) {
    let list = this.getSchoolStudents();
    list = list.filter(s => s.username.toUpperCase() !== username.toUpperCase());
    this.saveSchoolStudents(list);
  }

  bulkGenerateStudents({ prefix = 'HS', className = '10A1', count = 10, defaultPassword = '123', passwordPattern = 'fixed' }) {
    const list = this.getSchoolStudents();
    const cleanClass = className.trim().replace(/\s+/g, '');
    const cleanPrefix = prefix.trim().toUpperCase();
    const generated = [];

    for (let i = 1; i <= count; i++) {
      const stt = i < 10 ? `0${i}` : `${i}`;
      const username = `${cleanPrefix}${cleanClass}_${stt}`;
      
      let pass = defaultPassword || '123';
      if (passwordPattern === 'user') {
        pass = `${username}@123`;
      }

      const existingIdx = list.findIndex(s => s.username.toUpperCase() === username);
      if (existingIdx !== -1) {
        list[existingIdx].password = pass;
        list[existingIdx].className = className;
      } else {
        const studentObj = {
          username: username,
          fullName: `Học sinh ${stt} (${className})`,
          className: className,
          password: pass,
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: null
        };
        list.push(studentObj);
        generated.push(studentObj);
      }
    }

    this.saveSchoolStudents(list);
    return { totalCreated: generated.length, totalList: list.length };
  }

  bulkResetPassword(usernames, newPassword = '123') {
    const list = this.getSchoolStudents();
    let count = 0;
    const targetSet = new Set(usernames.map(u => u.toUpperCase()));

    list.forEach(s => {
      if (targetSet.has(s.username.toUpperCase())) {
        s.password = newPassword;
        count++;
      }
    });

    this.saveSchoolStudents(list);
    return count;
  }

  importStudentsFromList(rows) {
    const list = this.getSchoolStudents();
    let added = 0;

    rows.forEach(r => {
      if (!r.username || !r.fullName) return;
      const u = r.username.trim().toUpperCase();
      const existingIdx = list.findIndex(s => s.username.toUpperCase() === u);
      if (existingIdx !== -1) {
        list[existingIdx] = { ...list[existingIdx], ...r, username: u };
      } else {
        list.push({
          username: u,
          fullName: r.fullName.trim(),
          className: r.className || 'Tự do',
          password: r.password || '123',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: null
        });
        added++;
      }
    });

    this.saveSchoolStudents(list);
    return added;
  }

  // === QUẢN LÝ TÀI KHOẢN GOOGLE (GOOGLE USERS) ===
  getGoogleUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GOOGLE_USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  saveGoogleUsers(users) {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('pysublime_users_changed', { detail: { type: 'google', count: users.length } }));
  }

  addOrUpdateGoogleUser(profile) {
    const list = this.getGoogleUsers();
    const email = profile.email.toLowerCase().trim();
    const idx = list.findIndex(u => u.email.toLowerCase() === email);

    const userObj = {
      email: email,
      fullName: profile.fullName || profile.name || 'Người dùng Google',
      googleId: profile.googleId || profile.sub || 'G-' + Date.now(),
      avatar: profile.avatar || profile.picture || '',
      status: 'active',
      lastLogin: new Date().toISOString()
    };

    if (idx !== -1) {
      list[idx] = { ...list[idx], ...userObj };
    } else {
      userObj.createdAt = new Date().toISOString();
      list.unshift(userObj);
    }

    this.saveGoogleUsers(list);
    return userObj;
  }

  deleteGoogleUser(email) {
    let list = this.getGoogleUsers();
    list = list.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    this.saveGoogleUsers(list);
  }

  toggleUserStatus(userType, identifier) {
    if (userType === 'school') {
      const list = this.getSchoolStudents();
      const s = list.find(item => item.username.toUpperCase() === identifier.toUpperCase());
      if (s) {
        s.status = s.status === 'locked' ? 'active' : 'locked';
        this.saveSchoolStudents(list);
        return s.status;
      }
    } else {
      const list = this.getGoogleUsers();
      const u = list.find(item => item.email.toLowerCase() === identifier.toLowerCase());
      if (u) {
        u.status = u.status === 'locked' ? 'active' : 'locked';
        this.saveGoogleUsers(list);
        return u.status;
      }
    }
    return null;
  }

  // === PHIÊN ĐĂNG NHẬP (SESSION MANAGEMENT) ===
  getCurrentUser() {
    try {
      const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (sessionRaw) return JSON.parse(sessionRaw);

      const localRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (localRaw) return JSON.parse(localRaw);
    } catch (e) {}
    return null;
  }

  setCurrentUser(user) {
    if (!user) {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
    window.dispatchEvent(new CustomEvent('pysublime_auth_changed', { detail: user }));
  }

  logoutCurrentUser() {
    this.setCurrentUser(null);
  }

  verifyStudentLogin(username, password) {
    const list = this.getSchoolStudents();
    const u = username.trim().toUpperCase();
    const student = list.find(s => s.username.toUpperCase() === u);

    if (!student) {
      throw new Error(`Không tìm thấy tài khoản học sinh "${username}". Vui lòng kiểm tra lại!`);
    }

    if (student.status === 'locked') {
      throw new Error(`Tài khoản "${username}" hiện đang bị tạm khóa. Vui lòng liên hệ giáo viên!`);
    }

    if (student.password !== password) {
      throw new Error(`Mật khẩu không chính xác!`);
    }

    // Cập nhật lastLogin
    student.lastLogin = new Date().toISOString();
    this.saveSchoolStudents(list);

    const sessionUser = {
      type: 'school',
      role: 'student',
      username: student.username,
      fullName: student.fullName,
      className: student.className,
      avatar: '',
      loginAt: new Date().toISOString()
    };

    this.setCurrentUser(sessionUser);
    return sessionUser;
  }

  // === QUẢN TRỊ VIÊN (ADMIN AUTHENTICATION) ===
  getAdminCredentials() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDENTIALS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      username: 'admin',
      password: 'admin123'
    };
  }

  saveAdminCredentials(username, password) {
    const creds = {
      username: (username || 'admin').trim(),
      password: (password || 'admin123').trim()
    };
    localStorage.setItem(STORAGE_KEYS.ADMIN_CREDENTIALS, JSON.stringify(creds));
    return creds;
  }

  verifyAdminLogin(username, password) {
    const creds = this.getAdminCredentials();
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    if (u !== creds.username.toLowerCase()) {
      throw new Error(`Tên đăng nhập quản trị không đúng! (Mặc định: ${creds.username})`);
    }

    if (p !== creds.password) {
      throw new Error(`Mật khẩu quản trị không đúng! (Mặc định: admin123)`);
    }

    const adminUser = {
      type: 'admin',
      role: 'admin',
      username: creds.username,
      fullName: 'Quản Trị Viên (Admin)',
      email: 'admin@pysublime.local',
      loginAt: new Date().toISOString()
    };

    this.setCurrentUser(adminUser);
    return adminUser;
  }

  isAdminLoggedIn() {
    const user = this.getCurrentUser();
    return Boolean(user && user.role === 'admin');
  }

  // === THỐNG KÊ TỔNG QUAN (ANALYTICS) ===
  getAnalytics() {
    const curriculum = this.getCurriculum();
    const totalModules = curriculum.length;
    let totalLessons = 0;
    let totalExercises = 0;

    curriculum.forEach(m => {
      totalLessons += m.lessons.length;
      m.lessons.forEach(l => {
        if (l.practice) totalExercises++;
      });
    });

    const logs = this.getSubmissionLogs();
    const uniqueStudents = new Set(logs.map(l => l.studentId || l.studentName)).size;
    const passedCount = logs.filter(l => l.passed).length;
    const passRate = logs.length > 0 ? Math.round((passedCount / logs.length) * 100) : 0;

    const driveUrl = localStorage.getItem(STORAGE_KEYS.DRIVE_API_URL) || '';
    const isDriveConnected = Boolean(driveUrl && driveUrl.startsWith('https://script.google.com'));

    const schoolStudents = this.getSchoolStudents();
    const googleUsers = this.getGoogleUsers();

    return {
      totalModules,
      totalLessons,
      totalExercises,
      totalSubmissions: logs.length,
      uniqueStudents: Math.max(uniqueStudents, logs.length > 0 ? 1 : 0),
      totalSchoolStudents: schoolStudents.length,
      totalGoogleUsers: googleUsers.length,
      passRate,
      isDriveConnected,
      driveUrl
    };
  }
}

export const adminStore = new AdminStore();
