/**
 * Admin Dashboard Controller
 * Quản lý toàn bộ tính năng, giáo trình, cấu hình Drive và học sinh.
 */

import { adminStore } from './admin-store.js';
import { DriveSyncManager } from './drive-sync.js';
import { DEFAULT_SCHOOL_STUDENTS } from './default-students.js';
import * as XLSX from 'xlsx';

class AdminController {
  constructor() {
    this.driveSync = new DriveSyncManager();
    this.curriculum = adminStore.getCurriculum();
    this.settings = adminStore.getSettings();
  }

  init() {
    // 0. Bắt buộc đăng nhập tài khoản Quản trị viên (Admin Protection Guard)
    if (!adminStore.isAdminLoggedIn()) {
      window.location.replace('/login.html?redirect=admin');
      return;
    }

    console.log("Khởi động PySublime Admin Dashboard...");
    this.bindNavigation();
    this.loadOverview();
    this.loadFeatureSettings();
    this.renderCurriculum();
    this.loadDriveConfig();
    this.loadStudentSubmissions();
    this.loadUserManagement();
    this.bindActionButtons();
  }

  // === THÔNG BÁO TOAST ===
  showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `<span>${isError ? '❌' : '✅'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // === ĐIỀU HƯỚNG TABS SIDEBAR ===
  bindNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const panels = document.querySelectorAll('.admin-panel');
    const pageTitle = document.getElementById('admin-page-title');

    const titleMap = {
      'panel-overview': '<span>📊</span> Bảng Điều Khiển Tổng Quan',
      'panel-features': '<span>🎛️</span> Quản Lý Tính Năng & Giao Diện',
      'panel-curriculum': '<span>📚</span> Quản Lý Bài Học & Giáo Trình',
      'panel-drive': '<span>☁️</span> Kết Nối Google Drive & Sheets CMS',
      'panel-users': '<span>👥</span> Quản Lý Tài Khoản Người Dùng',
      'panel-students': '<span>🎓</span> Sổ Điểm & Lịch Sử Bài Nộp'
    };

    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.dataset.target;

        menuItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');

        panels.forEach(p => p.classList.remove('active'));
        const activePanel = document.getElementById(targetId);
        if (activePanel) {
          activePanel.classList.add('active');
        }

        if (pageTitle && titleMap[targetId]) {
          pageTitle.innerHTML = titleMap[targetId];
        }

        // Tải lại dữ liệu tương ứng
        if (targetId === 'panel-overview') this.loadOverview();
        if (targetId === 'panel-users') this.loadUserManagement();
        if (targetId === 'panel-students') this.loadStudentSubmissions();
        if (targetId === 'panel-curriculum') this.renderCurriculum();
      });
    });
  }

  // === 1. TỔNG QUAN HỆ THỐNG ===
  loadOverview() {
    const stats = adminStore.getAnalytics();
    
    document.getElementById('stat-total-lessons').textContent = stats.totalLessons;
    document.getElementById('stat-total-modules').textContent = `${stats.totalModules} chương giáo trình`;
    document.getElementById('stat-total-exercises').textContent = stats.totalExercises;
    document.getElementById('stat-total-students').textContent = stats.uniqueStudents;
    document.getElementById('stat-total-submissions').textContent = `${stats.totalSubmissions} bài nộp`;
    document.getElementById('stat-pass-rate').textContent = `${stats.passRate}%`;

    // Cập nhật trạng thái Drive trên header
    const pill = document.getElementById('admin-drive-status-pill');
    const pillText = document.getElementById('admin-drive-status-text');
    if (pill && pillText) {
      if (stats.isDriveConnected) {
        pill.className = 'status-pill connected';
        pillText.textContent = 'Drive: Đã kết nối';
      } else {
        pill.className = 'status-pill offline';
        pillText.textContent = 'Drive: Chưa kết nối';
      }
    }

    // Render danh sách gần đây & Bảng vàng vinh danh
    this.renderRecentSubmissions();
    this.renderLeaderboard();
  }

  renderRecentSubmissions() {
    const tbody = document.getElementById('tbody-recent-submissions');
    if (!tbody) return;

    const logs = adminStore.getSubmissionLogs();
    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
            Chưa có bài tập nào được nộp. Khi học sinh làm bài trên IDE kết quả sẽ tự động lưu vào đây!
          </td>
        </tr>
      `;
      return;
    }

    const recent = logs.slice(0, 5);
    tbody.innerHTML = recent.map(item => {
      const timeStr = new Date(item.timestamp).toLocaleString('vi-VN');
      const passClass = item.passed ? 'pass' : 'fail';
      const passText = item.passed ? 'ĐẠT' : 'CHƯA ĐẠT';
      return `
        <tr>
          <td><span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted);">${timeStr}</span></td>
          <td><strong>${this.escape(item.studentName || 'Học sinh')}</strong> (${this.escape(item.studentId || '')})</td>
          <td>${this.escape(item.className || 'Tự do')}</td>
          <td><code>${this.escape(item.exerciseId || '')}</code></td>
          <td><strong style="color: ${item.passed ? 'var(--accent-green)' : 'var(--accent-pink)'}">${item.score || 0}đ</strong></td>
          <td><span class="score-badge ${passClass}">${passText}</span></td>
          <td>
            <button class="btn-icon-action btn-view-code" data-id="${item.id}" title="Xem code học sinh đã nộp">
              👁️
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.openViewSubmissionModal(id);
      });
    });
  }

  renderLeaderboard() {
    const container = document.getElementById('leaderboard-students-container');
    if (!container) return;

    const logs = adminStore.getSubmissionLogs();
    if (!logs || logs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 32px 20px;">
          <div style="font-size: 32px; margin-bottom: 8px;">🌟</div>
          <div style="font-weight: 700; font-size: 15px; color: var(--text-main); margin-bottom: 4px;">
            Bảng Vàng Chưa Có Dữ Liệu
          </div>
          <div style="font-size: 13px;">
            Khi học sinh hoàn thành các thử thách Python trên IDE, top học sinh xuất sắc nhất sẽ được vinh danh tự động tại đây!
          </div>
        </div>
      `;
      return;
    }

    // Nhóm bài làm theo từng học sinh
    const studentMap = new Map();
    logs.forEach(log => {
      const key = log.studentId || log.studentName || 'Ẩn danh';
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          id: log.studentId || '',
          name: log.studentName || 'Học sinh',
          className: log.className || 'Tự do',
          passedExercises: new Set(),
          maxScores: new Map(),
          totalSubmissions: 0,
          lastActive: log.timestamp
        });
      }

      const st = studentMap.get(key);
      st.totalSubmissions++;
      if (log.timestamp > st.lastActive) {
        st.lastActive = log.timestamp;
      }
      if (log.className && st.className === 'Tự do') {
        st.className = log.className;
      }

      const currentScore = log.score || 0;
      const prevScore = st.maxScores.get(log.exerciseId) || 0;
      if (currentScore > prevScore) {
        st.maxScores.set(log.exerciseId, currentScore);
      }

      if (log.passed) {
        st.passedExercises.add(log.exerciseId);
      }
    });

    const ranked = Array.from(studentMap.values()).map(st => {
      let totalScore = 0;
      st.maxScores.forEach(val => totalScore += val);
      return {
        id: st.id,
        name: st.name,
        className: st.className,
        passedCount: st.passedExercises.size,
        totalScore: totalScore,
        totalSubmissions: st.totalSubmissions,
        lastActive: st.lastActive
      };
    });

    // Sắp xếp: Số bài đạt DESC, Tổng điểm DESC
    ranked.sort((a, b) => {
      if (b.passedCount !== a.passedCount) return b.passedCount - a.passedCount;
      return b.totalScore - a.totalScore;
    });

    const topStudents = ranked.slice(0, 6);
    const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️', '🎖️'];
    const rankTitles = ['Thủ Khoa', 'Á Khoa', 'Top 3 Xuất Sắc', 'Top 4', 'Top 5', 'Top 6'];

    container.innerHTML = `
      <div class="leaderboard-grid">
        ${topStudents.map((st, idx) => {
          const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
          const medal = medals[idx] || '🎖️';
          const title = rankTitles[idx] || `Hạng ${idx + 1}`;
          return `
            <div class="leaderboard-card ${rankClass}">
              <div class="leaderboard-rank-badge" title="${title}">
                ${medal}
              </div>
              <div class="leaderboard-info">
                <div class="leaderboard-name" title="${this.escape(st.name)}">${this.escape(st.name)}</div>
                <div class="leaderboard-meta">
                  <span>🏫 Lớp: <strong>${this.escape(st.className)}</strong></span>
                  ${st.id ? `<span>• <code>${this.escape(st.id)}</code></span>` : ''}
                </div>
                <div class="leaderboard-stats">
                  <span class="stat-pill passed">🎯 ${st.passedCount} bài đạt</span>
                  <span class="stat-pill score">⚡ ${st.totalScore} XP</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // === 2. QUẢN LÝ TÍNH NĂNG (FEATURE SETTINGS) ===
  loadFeatureSettings() {
    const s = this.settings;

    const layoutSelect = document.getElementById('setting-layout-mode');
    if (layoutSelect) layoutSelect.value = s.layoutMode || 'simple';

    const vkSelect = document.getElementById('setting-virtual-keyboard');
    if (vkSelect) vkSelect.value = s.showVirtualKeyboard || 'auto';

    const headerCheck = document.getElementById('setting-simplified-header');
    if (headerCheck) headerCheck.checked = s.simplifiedHeader !== false;

    const hintsCheck = document.getElementById('setting-show-hints');
    if (hintsCheck) hintsCheck.checked = s.showHints !== false;

    const autoTermCheck = document.getElementById('setting-auto-terminal');
    if (autoTermCheck) autoTermCheck.checked = s.autoOpenTerminal !== false;

    const freeNavCheck = document.getElementById('setting-free-nav');
    if (freeNavCheck) freeNavCheck.checked = s.allowFreeNav !== false;

    const fontSelect = document.getElementById('setting-font-size');
    if (fontSelect) fontSelect.value = s.editorFontSize || '14';
  }

  saveFeatureSettings() {
    const newSettings = {
      layoutMode: document.getElementById('setting-layout-mode').value,
      showVirtualKeyboard: document.getElementById('setting-virtual-keyboard').value,
      simplifiedHeader: document.getElementById('setting-simplified-header').checked,
      showHints: document.getElementById('setting-show-hints').checked,
      autoOpenTerminal: document.getElementById('setting-auto-terminal').checked,
      allowFreeNav: document.getElementById('setting-free-nav').checked,
      editorFontSize: parseInt(document.getElementById('setting-font-size').value, 10) || 14
    };

    adminStore.saveSettings(newSettings);
    this.settings = newSettings;
    this.showToast("Đã lưu cấu hình tính năng! Giao diện học sinh được cập nhật tức thì.");
  }

  // === 3. QUẢN LÝ GIÁO TRÌNH & BÀI HỌC ===
  renderCurriculum(filterQuery = '') {
    const container = document.getElementById('curriculum-accordion-container');
    if (!container) return;

    this.curriculum = adminStore.getCurriculum();
    const query = filterQuery.toLowerCase().trim();

    container.innerHTML = this.curriculum.map((mod, modIdx) => {
      const filteredLessons = mod.lessons.filter(l => {
        if (!query) return true;
        return l.title.toLowerCase().includes(query) || (l.practice && l.practice.title.toLowerCase().includes(query));
      });

      if (query && filteredLessons.length === 0) return '';

      const lessonsHtml = filteredLessons.map(lesson => {
        const hasPractice = Boolean(lesson.practice);
        return `
          <div class="lesson-row" data-id="${lesson.id}">
            <div class="lesson-meta">
              <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-orange);">${lesson.id}</span>
              <span class="lesson-name">${this.escape(lesson.title)}</span>
              <span style="font-size: 11px; color: var(--text-muted);">⏱ ${lesson.duration || '5 phút'}</span>
              ${hasPractice ? '<span class="lesson-badge has-practice">🎯 Thử Thách</span>' : ''}
            </div>
            <div class="lesson-actions">
              <button class="btn-icon-action btn-edit-lesson" data-id="${lesson.id}" title="Chỉnh sửa bài học">✏️</button>
              <button class="btn-icon-action delete btn-delete-lesson" data-id="${lesson.id}" title="Xóa bài học">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="module-accordion" data-module-id="${mod.id}">
          <div class="module-header">
            <div class="module-title-box">
              <span style="color: var(--accent-orange);">📁</span>
              <span class="module-title">${this.escape(mod.title)}</span>
              <span class="module-count">${filteredLessons.length} bài học</span>
            </div>
            <span style="color: var(--text-muted); font-size: 12px;">▼</span>
          </div>
          <div class="lesson-list">
            ${lessonsHtml || '<div style="padding: 12px 18px; color: var(--text-dim); font-size: 13px;">Không có bài học nào trong chương này</div>'}
          </div>
        </div>
      `;
    }).join('');

    // Sự kiện mở/đóng accordion
    container.querySelectorAll('.module-header').forEach(header => {
      header.addEventListener('click', () => {
        const list = header.nextElementSibling;
        if (list) {
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Sự kiện sửa & xóa bài học
    container.querySelectorAll('.btn-edit-lesson').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditLessonModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-delete-lesson').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDeleteLesson(btn.dataset.id);
      });
    });
  }

  openAddLessonModal(defaultModuleId = null) {
    const modal = document.getElementById('modal-lesson-editor');
    const title = document.getElementById('lesson-modal-title');
    title.textContent = '➕ Thêm Bài Học Mới';

    document.getElementById('form-lesson-id').value = '';
    document.getElementById('form-lesson-title').value = '';
    document.getElementById('form-lesson-duration').value = '10 phút';
    document.getElementById('form-lesson-theory').value = '';
    document.getElementById('form-lesson-sample-code').value = '# Code Python mẫu:\n';
    document.getElementById('form-practice-title').value = '';
    document.getElementById('form-practice-desc').value = '';
    document.getElementById('form-practice-init-code').value = '# Viết code của bạn tại đây:\n';
    document.getElementById('form-practice-expected').value = '';
    document.getElementById('form-practice-hint').value = '';

    // Populate module select
    const select = document.getElementById('form-module-select');
    select.innerHTML = this.curriculum.map(m => `
      <option value="${m.id}" ${m.id === defaultModuleId ? 'selected' : ''}>${this.escape(m.title)}</option>
    `).join('');

    modal.classList.add('show');
  }

  openEditLessonModal(lessonId) {
    const found = adminStore.findLesson(lessonId);
    if (!found) {
      this.showToast("Không tìm thấy bài học!", true);
      return;
    }

    const { lesson, module } = found;
    const modal = document.getElementById('modal-lesson-editor');
    const title = document.getElementById('lesson-modal-title');
    title.textContent = `✏️ Chỉnh Sửa: ${lesson.title}`;

    document.getElementById('form-lesson-id').value = lesson.id;
    document.getElementById('form-lesson-title').value = lesson.title || '';
    document.getElementById('form-lesson-duration').value = lesson.duration || '10 phút';
    document.getElementById('form-lesson-theory').value = lesson.theory || '';
    document.getElementById('form-lesson-sample-code').value = lesson.sampleCode || '';

    // Module select
    const select = document.getElementById('form-module-select');
    select.innerHTML = this.curriculum.map(m => `
      <option value="${m.id}" ${m.id === module.id ? 'selected' : ''}>${this.escape(m.title)}</option>
    `).join('');

    if (lesson.practice) {
      document.getElementById('form-practice-title').value = lesson.practice.title || '';
      document.getElementById('form-practice-desc').value = lesson.practice.description || '';
      document.getElementById('form-practice-init-code').value = lesson.practice.initialCode || '';
      const exp = lesson.practice.testCases && lesson.practice.testCases[0] ? lesson.practice.testCases[0].expected : '';
      document.getElementById('form-practice-expected').value = exp;
      document.getElementById('form-practice-hint').value = lesson.practice.hint || '';
    } else {
      document.getElementById('form-practice-title').value = '';
      document.getElementById('form-practice-desc').value = '';
      document.getElementById('form-practice-init-code').value = '';
      document.getElementById('form-practice-expected').value = '';
      document.getElementById('form-practice-hint').value = '';
    }

    modal.classList.add('show');
  }

  saveLessonForm() {
    const lessonId = document.getElementById('form-lesson-id').value.trim();
    const moduleId = document.getElementById('form-module-select').value;
    const title = document.getElementById('form-lesson-title').value.trim();
    const duration = document.getElementById('form-lesson-duration').value.trim() || '10 phút';
    const theory = document.getElementById('form-lesson-theory').value;
    const sampleCode = document.getElementById('form-lesson-sample-code').value;

    if (!title) {
      alert("Vui lòng nhập tiêu đề bài học!");
      return;
    }

    const practiceTitle = document.getElementById('form-practice-title').value.trim();
    let practice = null;
    if (practiceTitle) {
      practice = {
        title: practiceTitle,
        description: document.getElementById('form-practice-desc').value.trim(),
        initialCode: document.getElementById('form-practice-init-code').value,
        testCases: [
          {
            input: "",
            expected: document.getElementById('form-practice-expected').value
          }
        ],
        hint: document.getElementById('form-practice-hint').value.trim()
      };
    }

    const lessonData = {
      title,
      duration,
      theory,
      sampleCode,
      practice
    };

    if (lessonId) {
      // Cập nhật
      adminStore.updateLesson(lessonId, lessonData);
      this.showToast(`Đã cập nhật bài học "${title}" thành công!`);
    } else {
      // Thêm mới
      adminStore.addLesson(moduleId, lessonData);
      this.showToast(`Đã thêm bài học "${title}" vào giáo trình!`);
    }

    this.closeLessonModal();
    this.renderCurriculum();
    this.loadOverview();
  }

  confirmDeleteLesson(lessonId) {
    const found = adminStore.findLesson(lessonId);
    if (!found) return;

    if (confirm(`Bạn có chắc chắn muốn xóa bài học: "${found.lesson.title}" không?`)) {
      adminStore.deleteLesson(lessonId);
      this.showToast(`Đã xóa bài học ${lessonId}!`);
      this.renderCurriculum();
      this.loadOverview();
    }
  }

  closeLessonModal() {
    const modal = document.getElementById('modal-lesson-editor');
    if (modal) modal.classList.remove('show');
  }

  // === 4. CẤU HÌNH GOOGLE DRIVE CMS ===
  loadDriveConfig() {
    const input = document.getElementById('admin-drive-url-input');
    if (input) {
      input.value = this.driveSync.getApiUrl();
    }
  }

  async testDrivePing() {
    const input = document.getElementById('admin-drive-url-input');
    const url = input ? input.value.trim() : '';
    const resBox = document.getElementById('drive-ping-result-box');
    
    if (!url) {
      this.showToast("Chưa nhập đường dẫn Google Apps Script Web App!", true);
      return;
    }

    resBox.style.display = 'block';
    resBox.style.background = 'rgba(230, 219, 116, 0.1)';
    resBox.style.border = '1px solid var(--accent-yellow)';
    resBox.style.color = 'var(--accent-yellow)';
    resBox.innerHTML = `⏳ Đang gửi yêu cầu Ping tới Google Apps Script...`;

    const startTime = performance.now();
    try {
      const data = await this.driveSync.testConnection(url);
      const latency = Math.round(performance.now() - startTime);

      resBox.style.background = 'rgba(166, 226, 46, 0.1)';
      resBox.style.border = '1px solid var(--accent-green)';
      resBox.style.color = 'var(--accent-green)';
      resBox.innerHTML = `
        <div>✅ <strong>KẾT NỐI THÀNH CÔNG! (Độ trễ: ${latency}ms)</strong></div>
        <div style="font-size: 12px; margin-top: 4px; color: var(--text-main);">${this.escape(data.message || JSON.stringify(data))}</div>
      `;
      this.showToast("Kết nối Google Drive hoàn toàn sẵn sàng!");
    } catch (err) {
      resBox.style.background = 'rgba(249, 38, 114, 0.1)';
      resBox.style.border = '1px solid var(--accent-pink)';
      resBox.style.color = 'var(--accent-pink)';
      resBox.innerHTML = `
        <div>❌ <strong>KẾT NỐI THẤT BẠI</strong></div>
        <div style="font-size: 12px; margin-top: 4px; color: var(--text-main);">${this.escape(err.message)}</div>
      `;
      this.showToast("Lỗi kiểm tra Google Drive: " + err.message, true);
    }
  }

  saveDriveUrl() {
    const input = document.getElementById('admin-drive-url-input');
    const url = input ? input.value.trim() : '';
    this.driveSync.setApiUrl(url);
    this.showToast("Đã lưu cấu hình Google Apps Script Web App!");
    this.loadOverview();
  }

  async syncDriveNow() {
    const btn = document.getElementById('btn-admin-sync-drive-now');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Đang đồng bộ...</span>';
    }

    try {
      const res = await this.driveSync.syncFromDrive();
      this.showToast(res.message);
      this.loadOverview();
      this.renderCurriculum();
    } catch (err) {
      this.showToast("Lỗi bốc tách: " + err.message, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔄 Bốc Tách Dữ Liệu Ngay</span>';
      }
    }
  }

  // === 5. QUẢN LÝ HỌC SINH & BÀI NỘP ===
  loadStudentSubmissions() {
    const tbody = document.getElementById('tbody-all-submissions');
    if (!tbody) return;

    const logs = adminStore.getSubmissionLogs();
    const query = (document.getElementById('input-search-students')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filter-submission-status')?.value || 'all';

    const filtered = logs.filter(item => {
      const matchQuery = !query || 
        (item.studentName && item.studentName.toLowerCase().includes(query)) ||
        (item.studentId && item.studentId.toLowerCase().includes(query)) ||
        (item.className && item.className.toLowerCase().includes(query));

      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'passed' && item.passed) ||
        (statusFilter === 'failed' && !item.passed);

      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
            Không có dữ liệu bài nộp nào phù hợp.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const timeStr = new Date(item.timestamp).toLocaleString('vi-VN');
      const passClass = item.passed ? 'pass' : 'fail';
      const passText = item.passed ? '🌟 ĐẠT' : '⚠️ CHƯA ĐẠT';

      return `
        <tr>
          <td><span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted);">${timeStr}</span></td>
          <td><code>${this.escape(item.studentId || 'HS-001')}</code></td>
          <td><strong>${this.escape(item.studentName || 'Học sinh')}</strong></td>
          <td>${this.escape(item.className || 'Tự do')}</td>
          <td><span style="color: var(--accent-yellow); font-family: var(--font-mono);">${this.escape(item.exerciseId || '')}</span></td>
          <td><strong style="color: ${item.passed ? 'var(--accent-green)' : 'var(--accent-pink)'}">${item.score || 0}đ</strong></td>
          <td><span class="score-badge ${passClass}">${passText}</span></td>
          <td>
            <button class="btn-admin-secondary btn-view-sub-code" data-id="${item.id}" style="padding: 4px 8px; font-size: 11.5px;">
              👁️ Xem Mã Code
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-sub-code').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openViewSubmissionModal(btn.dataset.id);
      });
    });
  }

  openViewSubmissionModal(submissionId) {
    const logs = adminStore.getSubmissionLogs();
    const item = logs.find(l => l.id === submissionId);
    if (!item) return;

    const modal = document.getElementById('modal-view-submission');
    const metaBox = document.getElementById('submission-meta-info');
    const codePre = document.getElementById('submission-code-content');

    metaBox.innerHTML = `
      <div style="margin-bottom: 8px;">
        Học sinh: <strong>${this.escape(item.studentName)}</strong> (${this.escape(item.studentId)}) - Lớp: <strong>${this.escape(item.className)}</strong>
      </div>
      <div style="margin-bottom: 12px;">
        Bài tập: <code>${this.escape(item.exerciseId)}</code> | Điểm: <strong style="color: ${item.passed ? 'var(--accent-green)' : 'var(--accent-pink)'}">${item.score}đ (${item.passed ? 'ĐẠT' : 'CHƯA ĐẠT'})</strong> | Lúc: ${new Date(item.timestamp).toLocaleString('vi-VN')}
      </div>
    `;

    codePre.textContent = item.submittedCode || '# Học sinh không có nội dung code';
    modal.classList.add('show');
  }

  exportGrades() {
    const logs = adminStore.getSubmissionLogs();
    if (!logs || logs.length === 0) {
      this.showToast("Chưa có bài nộp nào để xuất báo cáo!", true);
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Bang_Diem_Python_${dateStr}`;

    // Thử xuất bảng tính chuẩn Excel (.xlsx) với thư viện SheetJS
    try {
      const xlsxLib = (typeof XLSX !== 'undefined' && XLSX.utils) ? XLSX : (window.XLSX && window.XLSX.utils ? window.XLSX : null);
      if (xlsxLib) {
        const rows = logs.map((l, idx) => ({
          "STT": idx + 1,
          "Thời Gian Nộp": new Date(l.timestamp).toLocaleString('vi-VN'),
          "Mã Học Sinh": l.studentId || '',
          "Họ Và Tên": l.studentName || 'Học sinh',
          "Lớp": l.className || 'Tự do',
          "Mã Bài Tập": l.exerciseId || '',
          "Điểm Số": l.score || 0,
          "Kết Quả": l.passed ? "ĐẠT" : "CHƯA ĐẠT",
          "Mã Nguồn Python": l.submittedCode || ''
        }));

        const ws = xlsxLib.utils.json_to_sheet(rows);
        // Thiết lập độ rộng cột trực quan
        ws['!cols'] = [
          { wch: 6 },
          { wch: 22 },
          { wch: 15 },
          { wch: 24 },
          { wch: 12 },
          { wch: 20 },
          { wch: 10 },
          { wch: 14 },
          { wch: 60 }
        ];

        const wb = xlsxLib.utils.book_new();
        xlsxLib.utils.book_append_sheet(wb, ws, "Bảng Điểm Python");
        xlsxLib.writeFile(wb, `${fileName}.xlsx`);

        this.showToast("✅ Đã xuất bảng điểm Excel (.xlsx) chuẩn thành công!");
        return;
      }
    } catch (err) {
      console.warn("Lỗi xuất Excel với SheetJS, chuyển sang fallback CSV:", err);
    }

    // Fallback: Xuất file CSV định dạng UTF-8 BOM
    this.exportGradesCSV();
  }

  exportGradesCSV() {
    const logs = adminStore.getSubmissionLogs();
    if (!logs || logs.length === 0) {
      this.showToast("Chưa có bài nộp nào để xuất báo cáo!", true);
      return;
    }

    const headers = ["STT", "Thời Gian Nộp", "Mã Học Sinh", "Họ Và Tên", "Lớp", "Bài Tập", "Điểm Số", "Đạt Yêu Cầu"];
    const rows = logs.map((l, idx) => [
      idx + 1,
      `"${new Date(l.timestamp).toLocaleString('vi-VN')}"`,
      `"${l.studentId || ''}"`,
      `"${l.studentName || ''}"`,
      `"${l.className || ''}"`,
      `"${l.exerciseId || ''}"`,
      l.score || 0,
      l.passed ? "ĐẠT" : "CHƯA ĐẠT"
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Diem_Python_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast("Đã xuất file bảng điểm CSV thành công!");
  }

  // === 5.5 QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG (USERS MANAGEMENT) ===
  loadUserManagement() {
    this.renderSchoolStudents();
    this.renderGoogleUsers();
    this.renderAdminAccountInfo();
    this.bindUserSubtabs();
    this.bindUserActionEvents();
  }

  renderAdminAccountInfo() {
    const creds = adminStore.getAdminCredentials();
    const inputUser = document.getElementById('admin-acc-username');
    const inputPwd = document.getElementById('admin-acc-password');
    if (inputUser) inputUser.value = creds.username;
    if (inputPwd) inputPwd.value = creds.password;
  }

  bindUserSubtabs() {
    const tabs = document.querySelectorAll('.auth-subtab-btn');
    const subpanels = document.querySelectorAll('.subpanel-user');

    tabs.forEach(btn => {
      btn.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.dataset.target;
        subpanels.forEach(p => {
          if (p.id === targetId) {
            p.style.display = 'block';
          } else {
            p.style.display = 'none';
          }
        });
      };
    });
  }

  renderSchoolStudents() {
    const tbody = document.getElementById('tbody-school-users');
    if (!tbody) return;

    const list = adminStore.getSchoolStudents();
    const badge = document.getElementById('badge-count-school-users');
    if (badge) badge.textContent = list.length;

    // Cập nhật bộ lọc lớp học
    const classSelect = document.getElementById('filter-school-class');
    const selectedClass = classSelect ? classSelect.value : 'all';
    if (classSelect) {
      const classes = Array.from(new Set(list.map(s => s.className).filter(Boolean)));
      classSelect.innerHTML = '<option value="all">Tất cả lớp</option>' + 
        classes.map(c => `<option value="${this.escape(c)}" ${c === selectedClass ? 'selected' : ''}>Lớp ${this.escape(c)}</option>`).join('');
    }

    const searchQuery = (document.getElementById('search-school-user')?.value || '').toLowerCase().trim();
    const filterClass = classSelect ? classSelect.value : 'all';

    const filtered = list.filter(s => {
      const matchSearch = !searchQuery || 
        s.username.toLowerCase().includes(searchQuery) || 
        s.fullName.toLowerCase().includes(searchQuery);
      const matchClass = filterClass === 'all' || s.className === filterClass;
      return matchSearch && matchClass;
    });

    if (filtered.length === 0) {
      const isTotalEmpty = list.length === 0;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 36px 20px;">
            <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
            <div style="font-weight: 700; font-size: 15px; color: var(--text-main); margin-bottom: 6px;">
              ${isTotalEmpty ? 'Danh Sách Học Sinh Đang Trống' : 'Không Tìm Thấy Học Sinh Phù Hợp'}
            </div>
            <div style="font-size: 13px; max-width: 460px; margin: 0 auto; line-height: 1.5;">
              ${isTotalEmpty 
                ? 'Thầy/Cô có thể bấm <strong>📥 Nhập Từ File</strong> để tải file danh sách của trường, hoặc dùng <strong>⚡ Tạo Hàng Loạt</strong> / <strong>➕ Thêm Học Sinh</strong>.'
                : 'Thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc lớp về "Tất cả lớp".'}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const isLocked = s.status === 'locked';
      return `
        <tr data-username="${this.escape(s.username)}">
          <td><code style="color: var(--accent-orange); font-weight: 700; font-size: 13px;">${this.escape(s.username)}</code></td>
          <td><strong>${this.escape(s.fullName)}</strong></td>
          <td><span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; font-size: 12px;">${this.escape(s.className)}</span></td>
          <td>
            <div class="user-pwd-box">
              <span class="pwd-val" data-pwd="${this.escape(s.password)}">••••••</span>
              <button class="btn-icon-action btn-toggle-pwd" title="Xem/Ẩn mật khẩu" style="width: 24px; height: 24px; font-size: 10px;">👁️</button>
            </div>
          </td>
          <td>
            <span class="user-status-badge ${isLocked ? 'locked' : 'active'}">
              ${isLocked ? '🔒 Đã khóa' : '🟢 Hoạt động'}
            </span>
          </td>
          <td><span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${s.lastLogin ? new Date(s.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-icon-action btn-edit-student" data-username="${this.escape(s.username)}" title="Sửa thông tin">✏️</button>
              <button class="btn-icon-action btn-lock-student" data-username="${this.escape(s.username)}" title="${isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}">${isLocked ? '🔓' : '🔒'}</button>
              <button class="btn-icon-action delete btn-delete-student" data-username="${this.escape(s.username)}" title="Xóa tài khoản">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Toggle hiện mật khẩu
    tbody.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.onclick = () => {
        const valSpan = btn.previousElementSibling;
        if (!valSpan) return;
        if (valSpan.textContent === '••••••') {
          valSpan.textContent = valSpan.dataset.pwd;
          btn.textContent = '🙈';
        } else {
          valSpan.textContent = '••••••';
          btn.textContent = '👁️';
        }
      };
    });

    // Sửa học sinh
    tbody.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.onclick = () => this.openEditStudentModal(btn.dataset.username);
    });

    // Khóa / Mở khóa
    tbody.querySelectorAll('.btn-lock-student').forEach(btn => {
      btn.onclick = () => {
        const u = btn.dataset.username;
        const newStatus = adminStore.toggleUserStatus('school', u);
        this.showToast(`Đã ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${u}!`);
        this.renderSchoolStudents();
      };
    });

    // Xóa học sinh
    tbody.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.onclick = () => {
        const u = btn.dataset.username;
        if (confirm(`Bạn có chắc chắn muốn xóa tài khoản học sinh "${u}" không?`)) {
          adminStore.deleteSchoolStudent(u);
          this.showToast(`Đã xóa tài khoản ${u}!`);
          this.renderSchoolStudents();
        }
      };
    });
  }

  renderGoogleUsers() {
    const tbody = document.getElementById('tbody-google-users');
    if (!tbody) return;

    const list = adminStore.getGoogleUsers();
    const badge = document.getElementById('badge-count-google-users');
    if (badge) badge.textContent = list.length;

    const query = (document.getElementById('search-google-user')?.value || '').toLowerCase().trim();
    const filtered = list.filter(u => {
      return !query || u.email.toLowerCase().includes(query) || u.fullName.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
            Chưa có người dùng nào đăng nhập bằng Google. Khi có người dùng truy cập bằng Google, danh sách sẽ xuất hiện tại đây!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const isLocked = u.status === 'locked';
      const avatarSrc = u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`;
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${avatarSrc}" class="user-avatar-small" alt="${this.escape(u.fullName)}">
              <strong>${this.escape(u.fullName)}</strong>
            </div>
          </td>
          <td><code style="color: var(--accent-cyan);">${this.escape(u.email)}</code></td>
          <td><span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${this.escape(u.googleId)}</span></td>
          <td>
            <span class="user-status-badge ${isLocked ? 'locked' : 'active'}">
              ${isLocked ? '🔒 Đã chặn' : '🟢 Cho phép'}
            </span>
          </td>
          <td><span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : 'Mới tạo'}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-icon-action btn-lock-google" data-email="${this.escape(u.email)}" title="${isLocked ? 'Bỏ chặn' : 'Chặn truy cập'}">${isLocked ? '🔓' : '🔒'}</button>
              <button class="btn-icon-action delete btn-delete-google" data-email="${this.escape(u.email)}" title="Xóa tài khoản Google">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-lock-google').forEach(btn => {
      btn.onclick = () => {
        const email = btn.dataset.email;
        const newStatus = adminStore.toggleUserStatus('google', email);
        this.showToast(`Đã ${newStatus === 'locked' ? 'chặn' : 'bỏ chặn'} người dùng ${email}!`);
        this.renderGoogleUsers();
      };
    });

    tbody.querySelectorAll('.btn-delete-google').forEach(btn => {
      btn.onclick = () => {
        const email = btn.dataset.email;
        if (confirm(`Bạn có chắc chắn muốn xóa người dùng Google "${email}" khỏi hệ thống không?`)) {
          adminStore.deleteGoogleUser(email);
          this.showToast(`Đã xóa người dùng Google ${email}!`);
          this.renderGoogleUsers();
        }
      };
    });
  }

  openAddStudentModal() {
    const modal = document.getElementById('modal-user-single');
    document.getElementById('user-single-modal-title').textContent = '➕ Thêm Học Sinh Mới';
    document.getElementById('form-user-edit-mode').value = 'add';
    document.getElementById('form-user-username').value = '';
    document.getElementById('form-user-username').disabled = false;
    document.getElementById('form-user-fullname').value = '';
    document.getElementById('form-user-class').value = '10A1';
    document.getElementById('form-user-password').value = '123';
    modal?.classList.add('show');
  }

  openEditStudentModal(username) {
    const list = adminStore.getSchoolStudents();
    const student = list.find(s => s.username.toUpperCase() === username.toUpperCase());
    if (!student) return;

    const modal = document.getElementById('modal-user-single');
    document.getElementById('user-single-modal-title').textContent = `✏️ Chỉnh Sửa: ${student.username}`;
    document.getElementById('form-user-edit-mode').value = 'edit';
    document.getElementById('form-user-username').value = student.username;
    document.getElementById('form-user-username').disabled = true;
    document.getElementById('form-user-fullname').value = student.fullName;
    document.getElementById('form-user-class').value = student.className;
    document.getElementById('form-user-password').value = student.password;
    modal?.classList.add('show');
  }

  saveSingleStudent() {
    const mode = document.getElementById('form-user-edit-mode').value;
    const username = document.getElementById('form-user-username').value.trim();
    const fullName = document.getElementById('form-user-fullname').value.trim();
    const className = document.getElementById('form-user-class').value.trim() || '10A1';
    const password = document.getElementById('form-user-password').value.trim() || '123';

    if (!username || !fullName) {
      alert("Vui lòng nhập đầy đủ Mã học sinh và Họ tên!");
      return;
    }

    try {
      if (mode === 'add') {
        adminStore.addSchoolStudent({ username, fullName, className, password });
        this.showToast(`Đã thêm học sinh ${username} thành công!`);
      } else {
        adminStore.updateSchoolStudent(username, { fullName, className, password });
        this.showToast(`Đã cập nhật học sinh ${username}!`);
      }
      document.getElementById('modal-user-single')?.classList.remove('show');
      this.renderSchoolStudents();
    } catch (err) {
      alert(err.message);
    }
  }

  updateBulkPreview() {
    const prefix = document.getElementById('bulk-prefix')?.value.trim().toUpperCase() || 'HS';
    const className = document.getElementById('bulk-class')?.value.trim().replace(/\s+/g, '') || '10A1';
    const count = parseInt(document.getElementById('bulk-count')?.value, 10) || 30;
    const previewEl = document.getElementById('bulk-preview-text');
    if (!previewEl) return;

    const maxDisplay = Math.min(count, 3);
    const parts = [];
    for (let i = 1; i <= maxDisplay; i++) {
      const stt = i < 10 ? `0${i}` : `${i}`;
      parts.push(`${prefix}${className}_${stt}`);
    }
    if (count > 3) {
      const lastStt = count < 10 ? `0${count}` : `${count}`;
      parts.push(`... ${prefix}${className}_${lastStt}`);
    }
    previewEl.textContent = parts.join(', ');
  }

  confirmBulkGenerate() {
    const prefix = document.getElementById('bulk-prefix')?.value.trim() || 'HS';
    const className = document.getElementById('bulk-class')?.value.trim() || '10A1';
    const count = parseInt(document.getElementById('bulk-count')?.value, 10) || 30;
    const passwordPattern = document.getElementById('bulk-password-type')?.value || 'fixed';
    const defaultPassword = document.getElementById('bulk-default-password')?.value.trim() || '123';

    const res = adminStore.bulkGenerateStudents({ prefix, className, count, passwordPattern, defaultPassword });
    this.showToast(`Đã tạo thành công ${count} tài khoản cho lớp ${className}!`);
    document.getElementById('modal-user-bulk')?.classList.remove('show');
    this.renderSchoolStudents();
  }

  openBulkResetModal() {
    const modal = document.getElementById('modal-user-reset-pwd');
    const select = document.getElementById('reset-target-class');
    if (select) {
      const list = adminStore.getSchoolStudents();
      const classes = Array.from(new Set(list.map(s => s.className).filter(Boolean)));
      select.innerHTML = '<option value="all">Toàn bộ tất cả học sinh</option>' + 
        classes.map(c => `<option value="${this.escape(c)}">Chỉ áp dụng Lớp ${this.escape(c)}</option>`).join('');
    }
    document.getElementById('reset-new-password').value = '123';
    modal?.classList.add('show');
  }

  confirmBulkResetPassword() {
    const targetClass = document.getElementById('reset-target-class')?.value || 'all';
    const newPassword = document.getElementById('reset-new-password')?.value.trim() || '123';
    const list = adminStore.getSchoolStudents();

    const targetUsernames = list
      .filter(s => targetClass === 'all' || s.className === targetClass)
      .map(s => s.username);

    if (targetUsernames.length === 0) {
      alert("Không có học sinh nào thuộc lớp này!");
      return;
    }

    if (confirm(`Bạn có chắc muốn đặt lại mật khẩu cho ${targetUsernames.length} học sinh thành "${newPassword}"?`)) {
      const count = adminStore.bulkResetPassword(targetUsernames, newPassword);
      this.showToast(`Đã đổi mật khẩu cho ${count} học sinh thành công!`);
      document.getElementById('modal-user-reset-pwd')?.classList.remove('show');
      this.renderSchoolStudents();
    }
  }

  async syncStudentsToDriveSheet() {
    if (!this.driveSync.isConnected()) {
      alert("Chưa kết nối Google Drive! Vui lòng vào tab Google Drive CMS để lưu Web App URL trước.");
      return;
    }

    const students = adminStore.getSchoolStudents();
    const adminCreds = adminStore.getAdminCredentials();
    const btn = document.getElementById('btn-sync-students-drive');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Đang lưu ${students.length} HS...</span>`;
    }

    try {
      this.showToast(`Đang gửi ${students.length} học sinh và tài khoản Admin lên Google Sheet...`);

      // Gửi POST dạng text/plain để không bị CORS preflight chặn trên Apps Script
      await fetch(this.driveSync.getApiUrl(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_database',
          students: students,
          admin: adminCreds
        })
      });

      this.showToast(`✅ Đã gửi lưu thành công ${students.length} học sinh & tài khoản Admin vào Google Sheet!`);
    } catch (e) {
      this.showToast("Lỗi đồng bộ lên Google Sheet: " + e.message, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>☁️ Lưu Lên Google Sheet</span>';
      }
    }
  }

  async syncAdminCredentialsToDrive() {
    if (!this.driveSync.isConnected()) {
      alert("Chưa kết nối Google Drive! Vui lòng vào tab Google Drive CMS để lưu Web App URL trước.");
      return;
    }

    const adminCreds = adminStore.getAdminCredentials();
    const btn = document.getElementById('btn-sync-admin-to-drive');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Đang lưu Admin...</span>';
    }

    try {
      await fetch(this.driveSync.getApiUrl(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_admin',
          admin: adminCreds
        })
      });

      this.showToast("✅ Đã lưu thông tin tài khoản Admin vào Sheet Tai_Khoan_Admin!");
    } catch (e) {
      this.showToast("Lỗi lưu tài khoản Admin: " + e.message, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>☁️ Lưu Lên Google Sheet (Tai_Khoan_Admin)</span>';
      }
    }
  }

  async syncGoogleUsersFromSheet() {
    if (!this.driveSync.isConnected()) {
      alert("Chưa kết nối Google Drive!");
      return;
    }

    const btn = document.getElementById('btn-sync-google-sheet');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang tải...";
    }

    try {
      const endpoint = this.driveSync.getApiUrl().includes('?')
        ? `${this.driveSync.getApiUrl()}&action=get_all_users`
        : `${this.driveSync.getApiUrl()}?action=get_all_users`;

      const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
      const data = await res.json();

      if (data && data.status === 'success') {
        if (Array.isArray(data.googleUsers)) {
          adminStore.saveGoogleUsers(data.googleUsers);
        }
        if (Array.isArray(data.schoolStudents) && data.schoolStudents.length > 0) {
          adminStore.saveSchoolStudents(data.schoolStudents);
        }
        this.showToast("Đã cập nhật danh sách người dùng từ Google Sheet thành công!");
        this.renderGoogleUsers();
        this.renderSchoolStudents();
      }
    } catch (e) {
      this.showToast("Lỗi tải từ Google Sheet: " + e.message, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "🔄 Tải Danh Sách Từ Google Sheet";
      }
    }
  }

  bindUserActionEvents() {
    // Tìm kiếm & lọc
    document.getElementById('search-school-user')?.addEventListener('input', () => this.renderSchoolStudents());
    document.getElementById('filter-school-class')?.addEventListener('change', () => this.renderSchoolStudents());
    document.getElementById('search-google-user')?.addEventListener('input', () => this.renderGoogleUsers());

    // Nút mở modal
    document.getElementById('btn-open-add-student-modal')?.addEventListener('click', () => this.openAddStudentModal());
    document.getElementById('btn-open-bulk-modal')?.addEventListener('click', () => {
      this.updateBulkPreview();
      document.getElementById('modal-user-bulk')?.classList.add('show');
    });
    document.getElementById('btn-open-bulk-reset-modal')?.addEventListener('click', () => this.openBulkResetModal());

    // Nút khôi phục danh sách 1.297 học sinh gốc
    document.getElementById('btn-restore-default-students')?.addEventListener('click', () => {
      if (confirm("Bạn có muốn nạp lại danh sách 1.297 học sinh chính thức của trường THPT Nguyễn Sinh Sắc không?")) {
        adminStore.saveSchoolStudents(DEFAULT_SCHOOL_STUDENTS);
        this.renderSchoolStudents();
        this.showToast("✅ Đã nạp lại thành công 1.297 học sinh gốc!");
      }
    });

    // Nút xóa toàn bộ học sinh
    document.getElementById('btn-clear-school-students')?.addEventListener('click', () => {
      const list = adminStore.getSchoolStudents();
      if (list.length === 0) {
        this.showToast("Danh sách học sinh hiện tại đã trống!");
        return;
      }
      if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${list.length} tài khoản học sinh không? Thao tác này sẽ dọn sạch danh sách để bạn tải lên danh sách học sinh của trường.`)) {
        adminStore.clearAllSchoolStudents();
        this.renderSchoolStudents();
        this.showToast("Đã xóa sạch toàn bộ danh sách học sinh!");
      }
    });

    // Modal đóng
    document.getElementById('btn-close-user-single-modal')?.addEventListener('click', () => {
      document.getElementById('modal-user-single')?.classList.remove('show');
    });
    document.getElementById('btn-cancel-user-single')?.addEventListener('click', () => {
      document.getElementById('modal-user-single')?.classList.remove('show');
    });
    document.getElementById('btn-save-user-single')?.addEventListener('click', () => this.saveSingleStudent());

    document.getElementById('btn-close-user-bulk-modal')?.addEventListener('click', () => {
      document.getElementById('modal-user-bulk')?.classList.remove('show');
    });
    document.getElementById('btn-cancel-user-bulk')?.addEventListener('click', () => {
      document.getElementById('modal-user-bulk')?.classList.remove('show');
    });
    document.getElementById('btn-confirm-user-bulk')?.addEventListener('click', () => this.confirmBulkGenerate());

    // Bulk preview dynamic update
    ['bulk-prefix', 'bulk-class', 'bulk-count'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updateBulkPreview());
    });

    // Reset password modal
    document.getElementById('btn-close-reset-pwd-modal')?.addEventListener('click', () => {
      document.getElementById('modal-user-reset-pwd')?.classList.remove('show');
    });
    document.getElementById('btn-cancel-reset-pwd')?.addEventListener('click', () => {
      document.getElementById('modal-user-reset-pwd')?.classList.remove('show');
    });
    document.getElementById('btn-confirm-reset-pwd')?.addEventListener('click', () => this.confirmBulkResetPassword());

    // Đồng bộ Drive & Sheets
    document.getElementById('btn-sync-students-drive')?.addEventListener('click', () => this.syncStudentsToDriveSheet());
    document.getElementById('btn-sync-google-sheet')?.addEventListener('click', () => this.syncGoogleUsersFromSheet());

    // Sự kiện quản lý tài khoản Admin trong Subpanel Admin
    document.getElementById('btn-toggle-admin-acc-pwd')?.addEventListener('click', () => {
      const pwdInput = document.getElementById('admin-acc-password');
      if (pwdInput) {
        pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      }
    });

    document.getElementById('btn-save-admin-acc')?.addEventListener('click', () => {
      const u = document.getElementById('admin-acc-username')?.value.trim();
      const p = document.getElementById('admin-acc-password')?.value.trim();
      if (!u || !p) {
        alert("Vui lòng nhập tên đăng nhập và mật khẩu Admin!");
        return;
      }
      adminStore.saveAdminCredentials(u, p);
      this.showToast("Đã lưu cập nhật thông tin tài khoản Quản trị Admin!");
      if (this.driveSync.isConnected()) {
        this.syncAdminCredentialsToDrive();
      }
    });

    document.getElementById('btn-sync-admin-to-drive')?.addEventListener('click', () => {
      this.syncAdminCredentialsToDrive();
    });

    // Upload file danh sách học sinh (Hỗ trợ .xlsx, .xls, .csv, .json)
    const fileInput = document.getElementById('input-upload-students-file');
    document.getElementById('btn-import-students-file')?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        this.showToast(`Đang phân tích file ${file.name}...`);
        const parsedRows = await this.parseUploadedStudentsFile(file);

        if (parsedRows.length > 0) {
          const added = adminStore.importStudentsFromList(parsedRows);
          this.showToast(`Đã nhập thành công ${added} học sinh từ file ${file.name}!`);
          this.renderSchoolStudents();

          // Tự động lưu lên Google Sheet nếu Drive đã kết nối
          if (this.driveSync.isConnected()) {
            this.syncStudentsToDriveSheet();
          } else {
            this.showToast("Mẹo: Hãy kết nối Google Drive để lưu dữ liệu lên đám mây lâu dài!", false);
          }
        } else {
          alert("Không tìm thấy dữ liệu học sinh nào trong file!");
        }
      } catch (err) {
        alert(err.message);
      } finally {
        fileInput.value = '';
      }
    });
  }

  // === PHÂN TÍCH FILE DANH SÁCH HỌC SINH (HỖ TRỢ EXCEL .XLSX, .XLS, MOET CSDL, CSV, JSON) ===
  normalizeText(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parseUploadedStudentsFile(file) {
    return new Promise((resolve, reject) => {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            resolve(Array.isArray(data) ? data : []);
          } catch (err) {
            reject(new Error("Lỗi đọc file JSON: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.readAsText(file);
        return;
      }

      // Đọc file Excel (.xlsx, .xls) hoặc file bảng CSV / TXT
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = new Uint8Array(e.target.result);
          let workbook = null;

          // Thử nạp workbook với các phương thức giải mã khác nhau
          try {
            workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          } catch (err1) {
            try {
              const textContent = new TextDecoder('utf-8').decode(buffer);
              workbook = XLSX.read(textContent, { type: 'string' });
            } catch (err2) {
              try {
                const textWin = new TextDecoder('windows-1258').decode(buffer);
                workbook = XLSX.read(textWin, { type: 'string' });
              } catch (err3) {
                throw new Error("Không thể giải mã file Excel này: " + err1.message);
              }
            }
          }

          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error("File Excel không có trang tính (sheet) nào!");
          }

          const allParsedStudents = [];

          // Duyệt qua tất cả các trang tính trong file Excel (hỗ trợ file nhiều lớp)
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;

            const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            if (!rawGrid || rawGrid.length < 2) continue;

            // 1. Tìm lớp học mặc định từ tên Sheet hoặc các dòng tiêu đề trên cùng
            let defaultClass = '';
            const sheetClassMatch = sheetName.match(/([0-9]{1,2}\s*[a-zA-Z0-9_\-\.]+)/);
            if (sheetClassMatch) {
              defaultClass = sheetClassMatch[1].replace(/\s+/g, '').toUpperCase();
            }

            for (let r = 0; r < Math.min(rawGrid.length, 15); r++) {
              const rowText = rawGrid[r].map(c => String(c)).join(' ');
              const classMatch = rowText.match(/l[ớo]p\s*[:\-\s]?\s*([0-9]{1,2}\s*[a-zA-Z0-9_\-\.]+)/i);
              if (classMatch) {
                defaultClass = classMatch[1].replace(/\s+/g, '').toUpperCase();
                break;
              }
            }

            // 2. Chấm điểm tìm dòng tiêu đề thực sự (Header Row)
            let bestHeaderIdx = -1;
            let bestScore = 0;
            let bestColMap = {
              username: -1,
              name: -1,
              ho: -1,
              ten: -1,
              class: -1,
              password: -1,
              stt: -1
            };

            const maxScanRows = Math.min(rawGrid.length, 30);
            for (let r = 0; r < maxScanRows; r++) {
              const row = rawGrid[r];
              if (!row || !Array.isArray(row)) continue;

              const currentMap = {
                username: -1,
                name: -1,
                ho: -1,
                ten: -1,
                class: -1,
                password: -1,
                stt: -1
              };
              let score = 0;

              for (let c = 0; c < row.length; c++) {
                const norm = this.normalizeText(row[c]);
                if (!norm) continue;

                // Cột Mã định danh / Mã học sinh (MOET / CSDL Ngành / vnEdu / SMAS)
                if (norm.includes('ma dinh danh') || norm.includes('ma moet') || norm.includes('ma hoc sinh') || 
                    norm.includes('ma hs') || norm.includes('ma so') || norm.includes('username') || 
                    norm.includes('tai khoan') || norm.includes('ma dd') || norm === 'ma' || norm === 'id' ||
                    norm.includes('dinh danh') || norm.includes('csdl') || norm.includes('so dinh danh') ||
                    norm.includes('cccd') || norm.includes('so cccd')) {
                  if (currentMap.username === -1) {
                    currentMap.username = c;
                    score += 4;
                  }
                } 
                // Cột Họ và tên gộp
                else if (norm === 'ho va ten' || norm === 'ho ten' || norm.includes('ho va ten hoc sinh') || 
                         norm.includes('ho ten hoc sinh') || norm === 'fullname') {
                  if (currentMap.name === -1) {
                    currentMap.name = c;
                    score += 4;
                  }
                } 
                // Cột Họ / Chữ đệm riêng (MOET chuẩn tách Họ và chữ đệm)
                else if (norm === 'ho va chu dem' || norm === 'ho chu dem' || norm === 'ho va dem' || 
                         norm === 'ho dem' || norm === 'ho lot' || norm === 'ho' || norm.includes('chu dem')) {
                  if (currentMap.ho === -1) {
                    currentMap.ho = c;
                    score += 3;
                  }
                } 
                // Cột Tên riêng
                else if (norm === 'ten' || norm === 'ten hoc sinh' || norm === 'first name') {
                  if (currentMap.ten === -1) {
                    currentMap.ten = c;
                    score += 3;
                  }
                } 
                // Cột Lớp
                else if (norm === 'lop' || norm.startsWith('lop ') || norm.includes('lop hoc') || 
                         norm.includes('class') || norm === 'khoi') {
                  if (currentMap.class === -1) {
                    currentMap.class = c;
                    score += 2;
                  }
                } 
                // Cột Mật khẩu
                else if (norm.includes('mat khau') || norm.includes('password') || norm === 'mk' || norm === 'pass') {
                  if (currentMap.password === -1) {
                    currentMap.password = c;
                    score += 2;
                  }
                } 
                // Cột STT
                else if (norm === 'stt' || norm === 'so tt' || norm === 'so thu tu' || norm === 'thu tu' || norm === 'no') {
                  if (currentMap.stt === -1) {
                    currentMap.stt = c;
                    score += 2;
                  }
                }
                // Các cột phụ của MOET (ngày sinh, giới tính) giúp khẳng định dòng tiêu đề
                else if (norm.includes('ngay sinh') || norm.includes('nam sinh') || norm.includes('gioi tinh') || norm.includes('trang thai') || norm.includes('dan toc')) {
                  score += 1;
                }
              }

              // Dòng tiêu đề chuẩn cần đạt ít nhất 3 điểm và có ít nhất 1 trường nhận dạng
              if (score > bestScore && (currentMap.name !== -1 || (currentMap.ho !== -1 && currentMap.ten !== -1) || currentMap.username !== -1 || currentMap.ho !== -1 || currentMap.ten !== -1)) {
                bestScore = score;
                bestHeaderIdx = r;
                bestColMap = currentMap;
              }
            }

            // Kiểm tra xem dòng kế tiếp có phải là dòng tiêu đề phụ (Merged cell: Dòng 1 ghi Họ và tên gộp, Dòng 2 ghi Họ đệm - Tên)
            let isSubHeader = false;
            if (bestHeaderIdx !== -1 && bestHeaderIdx + 1 < rawGrid.length) {
              const nextRow = rawGrid[bestHeaderIdx + 1];
              if (Array.isArray(nextRow)) {
                for (let c = 0; c < nextRow.length; c++) {
                  const nextNorm = this.normalizeText(nextRow[c]);
                  if (!nextNorm) continue;
                  if (nextNorm.includes('chu dem') || nextNorm.includes('ho dem') || nextNorm === 'ho') {
                    bestColMap.ho = c;
                    isSubHeader = true;
                  } else if (nextNorm === 'ten' || nextNorm === 'ten hoc sinh') {
                    bestColMap.ten = c;
                    isSubHeader = true;
                  }
                }
              }
            }

            console.log(`[Excel Parser] Sheet "${sheetName}": Best Header Row = ${bestHeaderIdx} (isSubHeader=${isSubHeader}), Score = ${bestScore}`, bestColMap);

            const startRow = bestHeaderIdx !== -1 ? (isSubHeader ? bestHeaderIdx + 2 : bestHeaderIdx + 1) : 0;

            for (let r = startRow; r < rawGrid.length; r++) {
              const row = rawGrid[r];
              if (!row || !Array.isArray(row) || row.length === 0) continue;

              let username = '';
              let fullName = '';
              let className = defaultClass || '10A1';
              let password = '123';
              let stt = r - startRow + 1;

              if (bestHeaderIdx !== -1) {
                // Đọc Mã học sinh / Mã MOET
                if (bestColMap.username !== -1 && row[bestColMap.username] !== undefined && row[bestColMap.username] !== '') {
                  username = String(row[bestColMap.username]).trim();
                }

                // Đọc Họ và tên (gộp hoặc tách)
                if (bestColMap.name !== -1 && row[bestColMap.name]) {
                  fullName = String(row[bestColMap.name]).trim();
                  // Kiểm tra trường hợp ô header "Họ và tên" merge 2 cột: Cột hiện tại là Họ đệm, Cột kế tiếp là Tên
                  if (bestColMap.ten === -1 && bestColMap.name + 1 < row.length) {
                    const nextVal = String(row[bestColMap.name + 1] || '').trim();
                    if (nextVal && !nextVal.includes('/') && !nextVal.includes('-') && !/^\d+$/.test(nextVal)) {
                      const nextNorm = this.normalizeText(nextVal);
                      if (!['nam', 'nu', 'nam/nu'].includes(nextNorm) && nextVal.split(/\s+/).length <= 2) {
                        fullName = `${fullName} ${nextVal}`.trim();
                      }
                    }
                  }
                } else if (bestColMap.ho !== -1 || bestColMap.ten !== -1) {
                  const ho = bestColMap.ho !== -1 ? String(row[bestColMap.ho] || '').trim() : '';
                  const ten = bestColMap.ten !== -1 ? String(row[bestColMap.ten] || '').trim() : '';
                  fullName = `${ho} ${ten}`.trim();
                }

                // Đọc Lớp
                if (bestColMap.class !== -1 && row[bestColMap.class]) {
                  let cls = String(row[bestColMap.class]).trim().toUpperCase();
                  cls = cls.replace(/^L[ỚO]P\s*[:\-\s]*/i, '');
                  if (cls) className = cls;
                }

                // Đọc Mật khẩu
                if (bestColMap.password !== -1 && row[bestColMap.password]) {
                  password = String(row[bestColMap.password]).trim();
                }

                // Đọc STT
                if (bestColMap.stt !== -1 && row[bestColMap.stt] !== undefined && row[bestColMap.stt] !== '') {
                  const num = parseInt(row[bestColMap.stt], 10);
                  if (!isNaN(num)) stt = num;
                }
              } else {
                // Dự phòng vị trí cột khi không tìm thấy header
                username = String(row[0] || '').trim();
                fullName = String(row[1] || '').trim();
                className = String(row[2] || defaultClass || '10A1').trim();
                if (row[3]) password = String(row[3]).trim();
              }

              // Bỏ qua dòng trống
              if (!username && !fullName) continue;

              // Bỏ qua các dòng footer tổng kết cuối bảng (Tổng số, Người lập, Hiệu trưởng...)
              const normFull = this.normalizeText(fullName);
              const normUser = this.normalizeText(username);
              if (normFull.includes('tong so') || normFull.includes('hieu truong') || 
                  normFull.includes('nguoi lap') || normFull.includes('giao vien') ||
                  normUser.includes('tong so') || normUser.includes('hieu truong')) {
                continue;
              }

              // Nếu họ tên chỉ toàn số hoặc quá ngắn, bỏ qua (không phải học sinh)
              if (/^[0-9\.\-\s]+$/.test(fullName) && !username) continue;

              // Nếu thiếu username nhưng có họ tên, tự tạo username theo cú pháp HS{Lớp}_{STT}
              if (!username && fullName) {
                const sttStr = stt < 10 ? `0${stt}` : `${stt}`;
                username = `HS${className.replace(/\s+/g, '')}_${sttStr}`;
              }

              if (!fullName && username) {
                fullName = username;
              }

              // Chuẩn hóa Username: viết hoa, loại bỏ khoảng trắng
              const cleanUsername = username.replace(/\s+/g, '').toUpperCase();

              allParsedStudents.push({
                username: cleanUsername,
                fullName: fullName,
                className: className || '10A1',
                password: password || '123'
              });
            }
          }

          console.log(`[Excel Parser] Tổng cộng trích xuất được: ${allParsedStudents.length} học sinh`, allParsedStudents);
          resolve(allParsedStudents);
        } catch (err) {
          reject(new Error("Lỗi khi đọc file Excel: " + err.message));
        }
      };

      reader.onerror = () => reject(new Error("Không thể đọc file"));
      reader.readAsArrayBuffer(file);
    });
  }

  // === 6. SỰ KIỆN NÚT HÀNH ĐỘNG KHÁC ===
  bindActionButtons() {
    // Lưu tính năng
    document.getElementById('btn-save-feature-settings')?.addEventListener('click', () => {
      this.saveFeatureSettings();
    });

    // Thêm bài học mới
    document.getElementById('btn-add-new-lesson')?.addEventListener('click', () => {
      this.openAddLessonModal();
    });
    document.getElementById('btn-quick-add-lesson')?.addEventListener('click', () => {
      this.openAddLessonModal();
    });

    // Form modal
    document.getElementById('btn-close-lesson-modal')?.addEventListener('click', () => this.closeLessonModal());
    document.getElementById('btn-cancel-lesson-form')?.addEventListener('click', () => this.closeLessonModal());
    document.getElementById('btn-save-lesson-form')?.addEventListener('click', () => this.saveLessonForm());

    // Xem code modal
    document.getElementById('btn-close-sub-modal')?.addEventListener('click', () => {
      document.getElementById('modal-view-submission')?.classList.remove('show');
    });
    document.getElementById('btn-close-sub-modal-2')?.addEventListener('click', () => {
      document.getElementById('modal-view-submission')?.classList.remove('show');
    });

    // Tìm kiếm bài học
    document.getElementById('input-search-lessons')?.addEventListener('input', (e) => {
      this.renderCurriculum(e.target.value);
    });

    // Reset giáo trình gốc
    document.getElementById('btn-reset-default-curriculum')?.addEventListener('click', () => {
      if (confirm("Bạn có chắc chắn muốn khôi phục lại giáo trình Python tiêu chuẩn gốc không? Tất cả bài thêm/sửa tùy biến sẽ bị đặt lại!")) {
        adminStore.resetCurriculumToDefault();
        this.renderCurriculum();
        this.loadOverview();
        this.showToast("Đã khôi phục giáo trình mặc định thành công!");
      }
    });

    // Xuất giáo trình JSON
    document.getElementById('btn-export-curriculum-json')?.addEventListener('click', () => {
      const data = adminStore.getCurriculum();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `python_curriculum_${Date.now()}.json`;
      a.click();
      this.showToast("Đã tải về file JSON giáo trình!");
    });

    // Nhập giáo trình JSON
    const fileInput = document.getElementById('input-import-json-file');
    document.getElementById('btn-import-curriculum-json')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (Array.isArray(parsed) && parsed.length > 0) {
            adminStore.saveCurriculum(parsed);
            this.renderCurriculum();
            this.loadOverview();
            this.showToast("Đã nhập giáo trình mới từ file JSON thành công!");
          } else {
            throw new Error("Cấu trúc file JSON không hợp lệ (cần danh sách module)");
          }
        } catch (err) {
          this.showToast("Lỗi đọc file: " + err.message, true);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    // Google Drive
    document.getElementById('btn-admin-test-drive')?.addEventListener('click', () => this.testDrivePing());
    document.getElementById('btn-admin-save-drive')?.addEventListener('click', () => this.saveDriveUrl());
    document.getElementById('btn-admin-sync-drive-now')?.addEventListener('click', () => this.syncDriveNow());
    document.getElementById('btn-quick-sync-drive')?.addEventListener('click', () => {
      document.getElementById('menu-btn-drive')?.click();
      this.syncDriveNow();
    });

    // Quick buttons
    document.getElementById('btn-quick-open-settings')?.addEventListener('click', () => {
      document.getElementById('menu-btn-features')?.click();
    });

    document.getElementById('btn-quick-export-grades')?.addEventListener('click', () => {
      this.exportGrades();
    });

    // Học sinh & Bảng điểm
    document.getElementById('btn-export-grades-csv')?.addEventListener('click', () => this.exportGrades());
    document.getElementById('input-search-students')?.addEventListener('input', () => this.loadStudentSubmissions());
    document.getElementById('filter-submission-status')?.addEventListener('change', () => this.loadStudentSubmissions());

    document.getElementById('btn-clear-all-submissions')?.addEventListener('click', () => {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử điểm số và bài nộp của học sinh không? Hành động này không thể hoàn tác!")) {
        adminStore.clearSubmissionLogs();
        this.loadStudentSubmissions();
        this.loadOverview();
        this.showToast("Đã xóa toàn bộ lịch sử bài nộp học sinh!");
      }
    });

    // Đăng xuất Admin
    const handleAdminLogout = () => {
      if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi quyền Quản trị viên không?")) {
        adminStore.logoutCurrentUser();
        window.location.href = '/login.html?redirect=admin';
      }
    };
    document.getElementById('btn-admin-logout')?.addEventListener('click', handleAdminLogout);
    document.getElementById('btn-admin-top-logout')?.addEventListener('click', handleAdminLogout);
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Khởi chạy khi DOM sẵn sàng
window.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminController();
  admin.init();
  window.__ADMIN = admin;
});
