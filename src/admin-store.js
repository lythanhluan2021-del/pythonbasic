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
  SUBMISSION_LOGS: 'pysublime_submission_logs'
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

    return {
      totalModules,
      totalLessons,
      totalExercises,
      totalSubmissions: logs.length,
      uniqueStudents: Math.max(uniqueStudents, logs.length > 0 ? 1 : 0),
      passRate,
      isDriveConnected,
      driveUrl
    };
  }
}

export const adminStore = new AdminStore();
