/**
 * Drive Sync Module: Kết nối Google Drive & Google Sheets thông qua Google Apps Script Web App
 */

import { adminStore, STORAGE_KEYS } from './admin-store.js';
import { COURSE_MODULES } from './course-data.js';

export const DEFAULT_DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbwwi50hUCxhDU1SUEul3tknaQiKrb-NjpAft4Qz76kLpYG6VdCeAirtFmHSBTEtp0fP/exec';

export class DriveSyncManager {
  constructor() {
    this.apiUrl = localStorage.getItem(STORAGE_KEYS.DRIVE_API_URL) || DEFAULT_DRIVE_API_URL;
    this.student = this.loadStudentProfile();
  }

  getApiUrl() {
    return this.apiUrl;
  }

  setApiUrl(url) {
    this.apiUrl = url ? url.trim() : '';
    localStorage.setItem(STORAGE_KEYS.DRIVE_API_URL, this.apiUrl);
  }

  isConnected() {
    return Boolean(this.apiUrl && this.apiUrl.startsWith('https://script.google.com'));
  }

  loadStudentProfile() {
    const user = adminStore.getCurrentUser();
    if (user) {
      return {
        studentId: user.username || user.email,
        fullName: user.fullName,
        className: user.className || (user.type === 'google' ? 'Google Account' : '')
      };
    }

    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_PROFILE);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      studentId: 'Khách',
      fullName: 'Khách Tự Do',
      className: 'Tự do'
    };
  }

  saveStudentProfile(profile) {
    this.student = { ...this.student, ...profile };
    localStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(this.student));
  }

  /**
   * Kiểm tra kết nối tới Google Apps Script Web App
   */
  async testConnection(urlToTest) {
    const targetUrl = urlToTest || this.apiUrl;
    if (!targetUrl) throw new Error("Chưa nhập đường dẫn Google Apps Script Web App");

    const endpoint = targetUrl.includes('?') 
      ? `${targetUrl}&action=ping` 
      : `${targetUrl}?action=ping`;

    const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
    if (!res.ok) throw new Error(`Lỗi HTTP ${res.status}: Không thể kết nối tới Google Drive`);
    const data = await res.json();
    return data;
  }

  /**
   * Tải danh sách tài khoản học sinh & Google từ Google Sheet
   */
  async fetchUsersFromSheet() {
    if (!this.isConnected()) return null;
    try {
      const endpoint = this.apiUrl.includes('?') 
        ? `${this.apiUrl}&action=get_all_users` 
        : `${this.apiUrl}?action=get_all_users`;
      const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.status === 'success') {
        if (Array.isArray(data.schoolStudents) && data.schoolStudents.length > 0) {
          adminStore.saveSchoolStudents(data.schoolStudents);
        }
        if (Array.isArray(data.googleUsers)) {
          adminStore.saveGoogleUsers(data.googleUsers);
        }
        return data;
      }
    } catch (e) {
      console.warn("Không thể tải danh sách tài khoản từ Google Sheet:", e);
    }
    return null;
  }

  /**
   * Đồng bộ bài học và bài tập từ Google Drive
   */
  async syncFromDrive() {
    if (!this.isConnected()) {
      return {
        source: 'local',
        modules: COURSE_MODULES,
        message: 'Đang dùng giáo trình cục bộ có sẵn (chưa kết nối Google Drive).'
      };
    }

    try {
      const endpoint = this.apiUrl.includes('?')
        ? `${this.apiUrl}&action=get_all_data`
        : `${this.apiUrl}?action=get_all_data`;

      const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
      const data = await res.json();

      if (data && data.status === 'success') {
        if (data.lessons && data.lessons.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_LESSONS, JSON.stringify(data.lessons));
        }
        return {
          source: 'drive',
          lessons: data.lessons || [],
          exercises: data.exercises || [],
          students: data.students || [],
          message: 'Đã bốc tách và đồng bộ dữ liệu từ Google Drive thành công!'
        };
      } else {
        throw new Error(data.message || 'Không thể lấy dữ liệu từ Google Drive');
      }
    } catch (err) {
      console.warn("Lỗi khi tải từ Google Drive, sử dụng cache nội bộ:", err);
      return {
        source: 'local_fallback',
        modules: COURSE_MODULES,
        error: err.message,
        message: 'Không kết nối được Drive lúc này, đã chuyển sang dùng bài học offline.'
      };
    }
  }

  /**
   * Gửi điểm và bài làm của học sinh lên Google Sheet
   */
  async submitExerciseResult(exerciseId, score, passed, submittedCode) {
    // 1. Lưu cục bộ
    const saved = this.getSubmittedExercises();
    saved[exerciseId] = {
      score,
      passed,
      submittedCode,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.SUBMITTED_EXERCISES, JSON.stringify(saved));

    // Ghi vào lịch sử bài nộp cho trang Quản Trị Admin
    adminStore.recordSubmissionLog({
      studentId: this.student.studentId,
      studentName: this.student.fullName,
      className: this.student.className,
      exerciseId: exerciseId,
      score: score,
      passed: passed,
      submittedCode: submittedCode
    });

    // 2. Gửi lên Google Sheet nếu có kết nối
    if (this.isConnected()) {
      try {
        const payload = {
          action: 'submit_exercise',
          studentId: this.student.studentId,
          studentName: this.student.fullName,
          exerciseId: exerciseId,
          score: score,
          passed: passed,
          submittedCode: submittedCode
        };

        await fetch(this.apiUrl, {
          method: 'POST',
          mode: 'no-cors', // Google Apps Script thường yêu cầu no-cors khi POST từ browser
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return { success: true, syncedToDrive: true };
      } catch (err) {
        console.error("Lỗi đồng bộ điểm lên Google Sheet:", err);
        return { success: true, syncedToDrive: false, error: err.message };
      }
    }

    return { success: true, syncedToDrive: false };
  }

  /**
   * Ghi nhận hoàn thành bài học
   */
  async markLessonCompleted(lessonId) {
    const list = this.getCompletedLessons();
    if (!list.includes(lessonId)) {
      list.push(lessonId);
      localStorage.setItem(STORAGE_KEYS.COMPLETED_LESSONS, JSON.stringify(list));
    }

    if (this.isConnected()) {
      try {
        const payload = {
          action: 'update_progress',
          studentId: this.student.studentId,
          lessonId: lessonId
        };
        await fetch(this.apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {}
    }
  }

  getCompletedLessons() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_LESSONS)) || [];
    } catch (e) {
      return [];
    }
  }

  getSubmittedExercises() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMITTED_EXERCISES)) || {};
    } catch (e) {
      return {};
    }
  }
}
