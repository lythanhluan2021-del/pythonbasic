/**
 * Application Controller: Điều phối toàn bộ hoạt động của Web App
 */

import { SublimeEditor } from './editor.js';
import { PyodideRunner } from './pyodide-runner.js';
import { DriveSyncManager } from './drive-sync.js';
import { adminStore } from './admin-store.js';

class PySublimeApp {
  constructor() {
    this.editor = new SublimeEditor('ace-editor-instance', 'sublime-status-bar');
    this.runner = new PyodideRunner();
    this.driveSync = new DriveSyncManager();
    this.settings = adminStore.getSettings();
    this.currentModules = adminStore.getCurriculum();
    this.currentLesson = null;
    this.activeView = 'ide'; // 'theory', 'ide', 'terminal'
    this.pendingInputResolver = null;
  }

  async init() {
    // 0. Bắt buộc đăng nhập trước khi vào học (Login-First Gate)
    const currentUser = adminStore.getCurrentUser();
    if (!currentUser) {
      window.location.replace('/login.html');
      return;
    }

    console.log("Khởi động PySublime Web App với người dùng:", currentUser.fullName);

    // 1. Áp dụng cấu hình tính năng từ Admin Store
    this.applySettings(this.settings);

    // 2. Khởi tạo Editor Ace
    await this.editor.init();
    if (this.settings.editorFontSize) {
      this.editor.editor.setFontSize(`${this.settings.editorFontSize}px`);
    }

    // Tự động lưu bản nháp code khi học sinh đang gõ (Auto-save draft trên điện thoại)
    let autoSaveTimer = null;
    this.editor.editor.session.on('change', () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        if (this.currentLesson) {
          const currentCode = this.editor.getCode();
          localStorage.setItem(`python_draft_${this.currentLesson.id}`, currentCode);
        }
      }, 400);
    });

    // 3. Thiết lập bài học đầu tiên
    this.setupCurriculum();
    if (this.currentModules.length > 0 && this.currentModules[0].lessons.length > 0) {
      this.selectLesson(this.currentModules[0].lessons[0].id);
    }

    // 4. Gắn sự kiện giao diện
    this.bindEvents();

    // 5. Cập nhật trạng thái Drive & Profile
    this.updateDriveStatusUI();
    this.updateStudentBadgeUI();

    // 6. Khởi tạo Pyodide trong nền (để khi bấm Run là sẵn sàng ngay)
    this.runner.init((msg) => {
      this.logTerminal(`[Hệ Thống]: ${msg}\n`, 'info');
    }).catch(err => {
      this.logTerminal(`[Cảnh Báo]: ${err.message}\n`, 'error');
    });
  }

  applySettings(settings) {
    this.settings = settings || adminStore.getSettings();
    const ws = document.getElementById('main-workspace');
    if (ws) {
      ws.classList.remove('layout-simple', 'layout-split', 'layout-tabs');
      ws.classList.add(`layout-${this.settings.layoutMode || 'simple'}`);
    }

    // Bàn phím ảo
    document.body.classList.remove('show-vk-always', 'hide-vk-always');
    if (this.settings.showVirtualKeyboard === 'always') {
      document.body.classList.add('show-vk-always');
    } else if (this.settings.showVirtualKeyboard === 'never') {
      document.body.classList.add('hide-vk-always');
    }

    // Header tinh gọn
    if (this.settings.simplifiedHeader !== false) {
      document.body.classList.add('simplified-header');
    } else {
      document.body.classList.remove('simplified-header');
    }

    // Cỡ chữ editor
    if (this.editor && this.editor.editor && this.settings.editorFontSize) {
      this.editor.editor.setFontSize(`${this.settings.editorFontSize}px`);
    }
  }

  bindEvents() {
    // === LẮNG NGHE THAY ĐỔI CẤU HÌNH TỪ ADMIN DASHBOARD ===
    window.addEventListener('pysublime_settings_changed', (e) => {
      this.applySettings(e.detail);
    });

    window.addEventListener('pysublime_curriculum_changed', (e) => {
      this.currentModules = e.detail;
      this.setupCurriculum();
      if (this.currentModules[0] && this.currentModules[0].lessons[0]) {
        this.selectLesson(this.currentModules[0].lessons[0].id);
      }
    });

    // === NÚT ẨN/HIỆN LÝ THUYẾT (TẬP TRUNG TOÀN MÀN HÌNH IDE) ===
    const btnToggleTheory = document.getElementById('btn-toggle-theory');
    if (btnToggleTheory) {
      btnToggleTheory.addEventListener('click', () => this.toggleTheorySidebar());
    }

    // === NÚT DOCK / THU GỌN TERMINAL ===
    const btnDockTerm = document.getElementById('btn-dock-term-toggle');
    if (btnDockTerm) {
      btnDockTerm.addEventListener('click', () => this.toggleTerminalDrawer());
    }

    const btnToggleTermDirect = document.getElementById('btn-toggle-terminal-view');
    if (btnToggleTermDirect) {
      btnToggleTermDirect.addEventListener('click', () => this.toggleTerminalDrawer());
    }

    // === CHUYỂN ĐỔI TAB BOTTOM NAVIGATION BAR (CHUẨN MOBILE APP) ===
    document.querySelectorAll('.bnav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) {
          this.switchView(view);
        }
      });
    });

    // === CÁC NÚT TRONG TAB TÀI KHOẢN TRÊN DI ĐỘNG (VIEW 4: PANEL ACCOUNT) ===
    document.getElementById('acc-btn-back-code')?.addEventListener('click', () => this.switchView('ide'));
    document.getElementById('acc-btn-download-code')?.addEventListener('click', () => {
      const lessonId = this.currentLesson ? this.currentLesson.id : 'bai_tap';
      this.editor.downloadCode(`${lessonId}.py`);
      this.showToast(`Đã tải file "${lessonId}.py" về thiết bị!`);
    });
    document.getElementById('acc-btn-reset-code')?.addEventListener('click', () => {
      this.resetCurrentLessonCode();
    });
    document.getElementById('acc-btn-drive')?.addEventListener('click', () => this.openDriveModal());
    document.getElementById('mobile-btn-logout')?.addEventListener('click', () => {
      const currentUser = adminStore.getCurrentUser();
      const name = currentUser ? currentUser.fullName : 'bạn';
      if (confirm(`Bạn có chắc chắn muốn đăng xuất khỏi tài khoản "${name}" không?`)) {
        adminStore.logoutCurrentUser();
        window.location.href = '/login.html';
      }
    });

    // === NÚT ĐIỀU KHIỂN BOTTOM DRAWER CONSOLE TRÊN MOBILE ===
    document.getElementById('btn-drawer-close')?.addEventListener('click', () => this.closeMobileDrawer());
    document.getElementById('drawer-overlay')?.addEventListener('click', () => this.closeMobileDrawer());
    document.getElementById('btn-drawer-expand')?.addEventListener('click', () => this.toggleMobileDrawerExpand());
    document.getElementById('drawer-drag-header')?.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        this.toggleMobileDrawerExpand();
      }
    });

    // === NÚT TĂNG/GIẢM CỠ CHỮ DI ĐỘNG (A- / A+) ===
    document.getElementById('btn-mobile-font-inc')?.addEventListener('click', () => {
      const newSize = this.editor.increaseFontSize();
      this.showToast(`Cỡ chữ: ${newSize}px`);
    });
    document.getElementById('btn-mobile-font-dec')?.addEventListener('click', () => {
      const newSize = this.editor.decreaseFontSize();
      this.showToast(`Cỡ chữ: ${newSize}px`);
    });

    // === CHUYỂN ĐỔI TAB VIEW TRÊN ĐIỆN THOẠI (FALLBACK) ===
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // === BÀN PHÍM ẢO TRỢ LỰC CODE CHO ĐIỆN THOẠI ===
    this.bindVirtualKeyboardEvents();

    // === NÚT CHẠY CODE ===
    const runBtn = document.getElementById('btn-run-code');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runCurrentCode());
    }

    // === NÚT NỘP BÀI TẬP / CHẤM ĐIỂM (CẢ TRÊN TOOLBAR VÀ TERMINAL) ===
    const submitPracticeBtn = document.getElementById('btn-submit-practice');
    if (submitPracticeBtn) {
      submitPracticeBtn.addEventListener('click', () => this.gradeCurrentPractice());
    }

    const submitDirectBtn = document.getElementById('btn-submit-practice-direct');
    if (submitDirectBtn) {
      submitDirectBtn.addEventListener('click', () => this.gradeCurrentPractice());
    }

    // === NÚT QUAY LẠI TRÌNH SOẠN THẢO TỪ TERMINAL TRÊN MOBILE ===
    const btnBackToIde = document.getElementById('btn-back-to-ide');
    if (btnBackToIde) {
      btnBackToIde.addEventListener('click', () => this.switchView('ide'));
    }

    // === NÚT ĐẶT LẠI MÃ NGUỒN MẪU BAN ĐẦU ===
    const btnResetCode = document.getElementById('btn-reset-current-code');
    if (btnResetCode) {
      btnResetCode.addEventListener('click', () => {
        if (!this.currentLesson) return;
        const activeTab = this.editor.getActiveTab();
        const isPractice = activeTab && activeTab.id.includes('bai_tap');
        const template = isPractice 
          ? (this.currentLesson.practice?.initialCode || '')
          : (this.currentLesson.sampleCode || '');

        if (confirm("Bạn có muốn đặt lại mã nguồn bài này về mẫu ban đầu không? (Bản nháp tự lưu của bài này sẽ được làm mới)")) {
          if (this.currentLesson) {
            localStorage.removeItem(`python_draft_${this.currentLesson.id}`);
          }
          this.editor.setCode(template);
          this.logTerminal(`\n🔄 [Hệ thống]: Đã đặt lại mã nguồn về mẫu ban đầu.\n`, 'info');
        }
      });
    }

    // === NÚT ĐỒNG BỘ GOOGLE DRIVE ===
    const btnDriveModal = document.getElementById('btn-open-drive-modal');
    if (btnDriveModal) {
      btnDriveModal.addEventListener('click', () => this.openDriveModal());
    }

    // === NÚT TÀI KHOẢN HỌC SINH / ADMIN: BẬT/TẮT MENU TÍCH HỢP ĐĂNG XUẤT ===
    const btnStudentBadge = document.getElementById('student-badge-btn');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const userWrapper = document.getElementById('user-account-wrapper');

    if (btnStudentBadge && userDropdownMenu) {
      btnStudentBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userDropdownMenu.classList.contains('show');
        if (isOpen) {
          this.closeUserDropdown();
        } else {
          this.openUserDropdown();
        }
      });

      // Đóng menu khi click ra ngoài
      document.addEventListener('click', (e) => {
        if (userWrapper && !userWrapper.contains(e.target)) {
          this.closeUserDropdown();
        }
      });

      // Đóng khi nhấn phím Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeUserDropdown();
        }
      });
    }

    // === NÚT ĐĂNG XUẤT NẰM TRONG MENU TÀI KHOẢN ===
    const btnDropdownLogout = document.getElementById('dropdown-btn-logout');
    if (btnDropdownLogout) {
      btnDropdownLogout.addEventListener('click', () => {
        const currentUser = adminStore.getCurrentUser();
        const name = currentUser ? currentUser.fullName : 'bạn';
        if (confirm(`Bạn có chắc chắn muốn thoát khỏi tài khoản "${name}" không?`)) {
          adminStore.logoutCurrentUser();
          window.location.href = '/login.html';
        }
      });
    }

    // Nút tải file mã nguồn Python về máy
    const btnDownloadPy = document.getElementById('dropdown-btn-download-py');
    if (btnDownloadPy) {
      btnDownloadPy.addEventListener('click', () => {
        this.closeUserDropdown();
        const lessonId = this.currentLesson ? this.currentLesson.id : 'bai_tap';
        this.editor.downloadCode(`${lessonId}.py`);
        this.logTerminal(`\n📥 [Tải về]: Đã tải file "${lessonId}.py" về thiết bị thành công!\n`, 'info');
      });
    }

    // Nút đặt lại mã nguồn trong Menu tài khoản
    const btnDropdownReset = document.getElementById('dropdown-btn-reset-code');
    if (btnDropdownReset) {
      btnDropdownReset.addEventListener('click', () => {
        this.closeUserDropdown();
        document.getElementById('btn-reset-current-code')?.click();
      });
    }

    // Nút mở Google Drive trong Menu tài khoản (chỉ dành cho Admin)
    const btnDropdownDrive = document.getElementById('dropdown-btn-drive');
    if (btnDropdownDrive) {
      btnDropdownDrive.addEventListener('click', () => {
        this.closeUserDropdown();
        this.openDriveModal();
      });
    }

    // === MODAL EVENTS ===
    this.bindModalEvents();

    // === TERMINAL CONTROLS ===
    const btnClearTerm = document.getElementById('btn-clear-terminal');
    if (btnClearTerm) {
      btnClearTerm.addEventListener('click', () => {
        const screen = document.getElementById('terminal-screen');
        if (screen) screen.innerHTML = '';
        const drawerScreen = document.getElementById('drawer-terminal-screen');
        if (drawerScreen) drawerScreen.innerHTML = '';
      });
    }
  }

  showToast(msg) {
    let toast = document.getElementById('app-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-floating-toast';
      toast.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(20,21,18,0.95);border:1px solid #fd971f;color:#f8f8f2;padding:8px 16px;border-radius:20px;font-size:12.5px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,0.6);z-index:99999;transition:all 0.3s ease;opacity:0;pointer-events:none;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 1800);
  }

  switchView(view) {
    this.activeView = view;

    // Cập nhật Bottom Navigation Bar di động
    document.querySelectorAll('.bnav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Cập nhật nút nav cũ nếu có
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Cập nhật panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${view}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    if (view === 'terminal') {
      const badge = document.getElementById('bnav-terminal-badge');
      if (badge) badge.style.display = 'none';
      this.closeMobileDrawer();
    }

    // Resize editor nếu chuyển vào IDE
    if (view === 'ide' && this.editor.editor) {
      setTimeout(() => this.editor.editor.resize(), 50);
    }
  }

  openMobileDrawer() {
    const drawer = document.getElementById('mobile-console-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const statusTag = document.getElementById('drawer-status-tag');
    if (drawer) {
      drawer.classList.add('open');
      if (statusTag) statusTag.textContent = 'Đang chạy';
    }
    if (overlay) {
      overlay.classList.add('show');
    }
    const badge = document.getElementById('bnav-terminal-badge');
    if (badge) badge.style.display = 'inline-block';
  }

  closeMobileDrawer() {
    const drawer = document.getElementById('mobile-console-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) {
      drawer.classList.remove('open', 'expanded');
    }
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  toggleMobileDrawerExpand() {
    const drawer = document.getElementById('mobile-console-drawer');
    if (drawer) {
      drawer.classList.toggle('expanded');
      const expandBtn = document.getElementById('btn-drawer-expand');
      if (expandBtn) {
        expandBtn.textContent = drawer.classList.contains('expanded') ? '⤓' : '⤢';
      }
    }
  }

  toggleTheorySidebar() {
    const theory = document.getElementById('panel-theory');
    const textSpan = document.getElementById('theory-toggle-text');
    if (!theory) return;

    theory.classList.toggle('collapsed');
    const isCollapsed = theory.classList.contains('collapsed');
    if (textSpan) {
      textSpan.textContent = isCollapsed ? 'Hiện Lý Thuyết' : 'Ẩn Lý Thuyết';
    }
    if (this.editor && this.editor.editor) {
      setTimeout(() => this.editor.editor.resize(), 80);
    }
  }

  toggleTerminalDrawer() {
    const term = document.getElementById('panel-terminal');
    const toggleBtn = document.getElementById('btn-dock-term-toggle');
    if (!term) return;

    if (window.innerWidth < 992) {
      this.switchView(this.activeView === 'terminal' ? 'ide' : 'terminal');
      return;
    }

    term.classList.toggle('collapsed');
    const isCollapsed = term.classList.contains('collapsed');
    if (toggleBtn) {
      toggleBtn.textContent = isCollapsed ? '▲' : '▼';
    }
    if (this.editor && this.editor.editor) {
      setTimeout(() => this.editor.editor.resize(), 80);
    }
  }

  openTerminalDrawer() {
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      this.openMobileDrawer();
    } else {
      const term = document.getElementById('panel-terminal');
      if (term) {
        term.classList.remove('collapsed');
        const toggleBtn = document.getElementById('btn-dock-term-toggle');
        if (toggleBtn) toggleBtn.textContent = '▼';
      }
      if (this.editor && this.editor.editor) {
        setTimeout(() => this.editor.editor.resize(), 80);
      }
    }
  }

  bindVirtualKeyboardEvents() {
    const vkContainer = document.getElementById('mobile-virtual-keyboard');
    if (!vkContainer) return;

    vkContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.vk-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      const char = btn.dataset.char;

      if (action === 'autocomplete') {
        this.editor.triggerAutocomplete();
      } else if (action === 'tab') {
        this.editor.insertTab();
      } else if (action === 'enter') {
        this.editor.insertEnter();
      } else if (action === 'backspace') {
        this.editor.backspace();
      } else if (action === 'indent') {
        this.editor.indentSelection();
      } else if (action === 'outdent') {
        this.editor.outdentSelection();
      } else if (action === 'nav-left') {
        this.editor.moveCursorLeft();
      } else if (action === 'nav-right') {
        this.editor.moveCursorRight();
      } else if (action === 'undo') {
        this.editor.undo();
      } else if (action === 'redo') {
        this.editor.redo();
      } else if (action === 'clear') {
        this.editor.clear();
      } else if (btn.dataset.snippet) {
        const snippet = btn.dataset.snippet;
        if (snippet === 'print()') {
          this.editor.insertText('print()', -1);
        } else if (snippet === 'input()') {
          this.editor.insertText('input()', -1);
        } else {
          this.editor.insertText(snippet);
        }
      } else if (char) {
        // Chèn ký tự thông minh (cặp ngoặc đặt con trỏ ở giữa)
        if (char === '()') {
          this.editor.insertText('()', -1);
        } else if (char === '[]') {
          this.editor.insertText('[]', -1);
        } else if (char === '{}') {
          this.editor.insertText('{}', -1);
        } else if (char === '""') {
          this.editor.insertText('""', -1);
        } else if (char === "''") {
          this.editor.insertText("''", -1);
        } else {
          this.editor.insertText(char);
        }
      }
    });
  }

  setupCurriculum() {
    const selector = document.getElementById('lesson-dropdown-select');
    if (!selector) return;

    const completed = this.driveSync.getCompletedLessons();
    selector.innerHTML = '';
    this.currentModules.forEach(module => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = module.title;

      module.lessons.forEach(lesson => {
        const isDone = completed.includes(lesson.id);
        const option = document.createElement('option');
        option.value = lesson.id;
        option.textContent = `${isDone ? '✅ ' : '📖 '}${lesson.title} (${lesson.duration})`;
        optGroup.appendChild(option);
      });

      selector.appendChild(optGroup);
    });

    selector.addEventListener('change', (e) => {
      this.selectLesson(e.target.value);
    });

    this.updateLearningProgressUI();
  }

  /**
   * Cập nhật thanh tiến độ học tập VIP & Gamification (XP, Rank Level)
   */
  updateLearningProgressUI() {
    const fill = document.getElementById('learning-progress-fill');
    const xpEl = document.getElementById('user-total-xp');
    const countEl = document.getElementById('user-completed-count');
    const rankTitle = document.getElementById('user-rank-title');
    const rankIcon = document.getElementById('user-rank-icon');

    if (!fill || !countEl) return;

    let totalLessons = 0;
    this.currentModules.forEach(m => totalLessons += (m.lessons || []).length);
    if (totalLessons === 0) totalLessons = 1;

    const completed = this.driveSync.getCompletedLessons();
    const count = completed.length;
    const pct = Math.min(100, Math.round((count / totalLessons) * 100));
    const xp = count * 100;

    fill.style.width = `${pct}%`;
    countEl.textContent = `${count}/${totalLessons}`;
    if (xpEl) xpEl.textContent = xp;

    // Cấp bậc danh hiệu học sinh
    if (rankTitle && rankIcon) {
      if (count >= 10) {
        rankIcon.textContent = '👑';
        rankTitle.textContent = 'Cao Thủ Python';
      } else if (count >= 6) {
        rankIcon.textContent = '🏹';
        rankTitle.textContent = 'Chiến Binh Python';
      } else if (count >= 3) {
        rankIcon.textContent = '⚡';
        rankTitle.textContent = 'Tập Sự Python';
      } else {
        rankIcon.textContent = '🌱';
        rankTitle.textContent = 'Tân Binh Python';
      }
    }
  }

  /**
   * Lấy bài học kế tiếp trong lộ trình
   */
  getNextLesson() {
    if (!this.currentLesson) return null;
    let foundCurrent = false;
    for (const mod of this.currentModules) {
      for (const lesson of mod.lessons) {
        if (foundCurrent) return lesson;
        if (lesson.id === this.currentLesson.id) {
          foundCurrent = true;
        }
      }
    }
    return null;
  }

  selectLesson(lessonId) {
    let foundLesson = null;
    for (const mod of this.currentModules) {
      const l = mod.lessons.find(item => item.id === lessonId);
      if (l) {
        foundLesson = l;
        break;
      }
    }

    if (!foundLesson) return;
    this.currentLesson = foundLesson;

    // Cập nhật selector
    const selector = document.getElementById('lesson-dropdown-select');
    if (selector && selector.value !== lessonId) {
      selector.value = lessonId;
    }

    // Render Lý thuyết
    this.renderLessonTheory(foundLesson);

    // Mở code vào tab IDE: Ưu tiên tải bản nháp học sinh đang viết dở (Auto-saved Draft)
    const savedDraft = localStorage.getItem(`python_draft_${foundLesson.id}`);
    const codeToLoad = (savedDraft !== null && savedDraft.trim().length > 0)
      ? savedDraft
      : (foundLesson.sampleCode || '# Viết mã Python tại đây\n');
    this.editor.createOrUpdateTab('main.py', 'main.py', codeToLoad);
  }

  renderLessonTheory(lesson) {
    const theoryBody = document.getElementById('lesson-markdown-body');
    if (!theoryBody) return;

    // Simple markdown renderer for headers, bold, tables, and code snippets
    let html = lesson.theory
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/`([^`]+)`/gim, '<code style="color: #fd971f; background: #191a18; padding: 2px 5px; border-radius: 4px;">$1</code>')
      .replace(/\n\n/gim, '<p></p>');

    theoryBody.innerHTML = html;

    // Render nút nạp code mẫu
    const sampleBox = document.getElementById('lesson-sample-code-box');
    if (sampleBox) {
      sampleBox.innerHTML = `
        <div class="code-preview-header">
          <span class="code-lang-tag">🐍 Python Code Mẫu</span>
          <button class="btn-open-in-ide" id="btn-load-sample-code">⚡ Nạp vào Sublime IDE</button>
        </div>
        <pre class="code-snippet-pre"><code>${this.escapeHtml(lesson.sampleCode || '')}</code></pre>
      `;

      document.getElementById('btn-load-sample-code').addEventListener('click', () => {
        this.editor.setCode(lesson.sampleCode);
        this.switchView('ide');
      });
    }

    // Render phần bài tập thực hành
    const practiceBox = document.getElementById('lesson-practice-container');
    if (practiceBox && lesson.practice) {
      practiceBox.style.display = 'block';
      practiceBox.innerHTML = `
        <div class="practice-title">
          <span>🎯</span> ${lesson.practice.title}
        </div>
        <p style="font-size: 14px; color: #d6d6d0; white-space: pre-line;">${lesson.practice.description}</p>
        <button class="btn-start-practice" id="btn-start-challenge">
          <span>💻</span> Làm Thử Thách Này Trên Sublime IDE
        </button>
      `;

      document.getElementById('btn-start-challenge').addEventListener('click', () => {
        this.editor.createOrUpdateTab('bai_tap.py', 'bai_tap.py', lesson.practice.initialCode);
        this.switchView('ide');
      });
    } else if (practiceBox) {
      practiceBox.style.display = 'none';
    }
  }

  async runCurrentCode() {
    const code = this.editor.getCode();
    if (!code.trim()) {
      alert("Vui lòng nhập mã Python trước khi chạy!");
      return;
    }

    // Mở ngăn Terminal để hiển thị kết quả
    this.openTerminalDrawer();

    const screen = document.getElementById('terminal-screen');
    const timestamp = new Date().toLocaleTimeString();
    this.logTerminal(`\n--- [ĐANG CHẠY]: ${timestamp} ---\n`, 'info');

    const runBtn = document.getElementById('btn-run-code');
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>⏳ Đang chạy...</span>';
    }

    try {
      const res = await this.runner.runCode(code, {
        onOutput: (text) => this.logTerminal(text, 'output'),
        onError: (err) => this.logTerminal(err, 'error'),
        onInputPrompt: (promptText) => this.showInputPrompt(promptText)
      });

      const drawerStatus = document.getElementById('drawer-status-tag');
      if (res.success) {
        this.logTerminal(`\n✔ [Kết thúc chương trình: Mã 0 (Thành công)]\n`, 'info');
        if (drawerStatus) drawerStatus.textContent = 'Xong (Mã 0)';
      } else {
        if (drawerStatus) drawerStatus.textContent = 'Có lỗi';
      }
    } catch (e) {
      this.logTerminal(`\n❌ [Lỗi hệ thống]: ${e.message}\n`, 'error');
      const drawerStatus = document.getElementById('drawer-status-tag');
      if (drawerStatus) drawerStatus.textContent = 'Lỗi';
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>▶ Chạy Code</span>';
      }
    }
  }

  async gradeCurrentPractice() {
    if (!this.currentLesson || !this.currentLesson.practice) {
      alert("Bài học này chưa có bộ câu hỏi thực hành tự chấm!");
      return;
    }

    const practice = this.currentLesson.practice;
    const code = this.editor.getCode();

    this.openTerminalDrawer();
    this.logTerminal(`\n--- [ĐANG CHẤM BÀI TẬP]: ${practice.title} ---\n`, 'info');

    const resultsPanel = document.getElementById('test-results-panel');
    const drawerResults = document.getElementById('drawer-results-box');
    if (resultsPanel) {
      resultsPanel.style.display = 'block';
      resultsPanel.innerHTML = '<div style="color: #e6db74;">⏳ Đang chạy qua các bộ Test Case ẩn...</div>';
    }
    if (drawerResults) {
      drawerResults.style.display = 'block';
      drawerResults.innerHTML = '<div style="color: #e6db74; padding: 10px;">⏳ Đang chấm điểm qua các bộ Test Case...</div>';
    }

    const testResults = await this.runner.runTestCases(code, practice.testCases);

    let html = `
      <div class="test-summary">
        <div>
          <strong>Kết quả:</strong> ${testResults.passedCount}/${testResults.totalCount} Test Case
        </div>
        <div class="test-score-badge ${testResults.allPassed ? 'pass' : 'fail'}">
          ${testResults.score} Điểm ${testResults.allPassed ? '🌟 ĐẠT' : '⚠️ CHƯA ĐẠT'}
        </div>
      </div>
    `;

    testResults.details.forEach(item => {
      html += `
        <div class="test-item-card ${item.passed ? 'passed' : 'failed'}">
          <div><strong>Test #${item.testNumber}:</strong> ${item.passed ? '✅ Chính xác' : '❌ Sai kết quả'}</div>
          ${item.input ? `<div>Đầu vào (Input): <code>${item.input}</code></div>` : ''}
          <div>Kết quả mong đợi: <code>${item.expected}</code></div>
          <div>Kết quả của bạn: <code>${item.actual}</code></div>
        </div>
      `;
    });

    if (resultsPanel) {
      resultsPanel.innerHTML = html;
    }
    if (drawerResults) {
      drawerResults.innerHTML = html;
    }
    const drawerStatus = document.getElementById('drawer-status-tag');
    if (drawerStatus) {
      drawerStatus.textContent = testResults.allPassed ? 'Đạt 100đ' : `${testResults.score}đ`;
    }

    // Tự động gửi kết quả lên Google Sheet
    const syncRes = await this.driveSync.submitExerciseResult(
      this.currentLesson.id,
      testResults.score,
      testResults.allPassed,
      code
    );

    if (testResults.allPassed) {
      await this.driveSync.markLessonCompleted(this.currentLesson.id);
      this.updateLearningProgressUI();
      this.setupCurriculum();

      this.logTerminal(`\n🎉 CHÚC MỪNG! Bạn đã hoàn thành xuất sắc thử thách này và nhận +100 XP!\n`, 'output');
      if (syncRes.syncedToDrive) {
        this.logTerminal(`📊 [Google Sheet]: Điểm ${testResults.score} đã được ghi tự động vào bảng điểm của giáo viên!\n`, 'info');
      }

      const nextLesson = this.getNextLesson();
      if (nextLesson && resultsPanel) {
        const nextBtnHtml = `
          <button class="btn-next-lesson" id="btn-next-lesson-action">
            <span>👉</span> Học Bài Tiếp Theo: ${this.escapeHtml(nextLesson.title)} ➔
          </button>
        `;
        resultsPanel.insertAdjacentHTML('beforeend', nextBtnHtml);
        document.getElementById('btn-next-lesson-action')?.addEventListener('click', () => {
          this.selectLesson(nextLesson.id);
          this.switchView('theory');
        });
      }
    } else {
      if (this.settings.showHints !== false) {
        this.logTerminal(`\n💡 Hãy đọc kỹ gợi ý: ${practice.hint || 'Kiểm tra lại công thức và điều kiện'}\n`, 'error');
      }
    }
  }

  logTerminal(text, type = 'output') {
    const screen = document.getElementById('terminal-screen');
    if (screen) {
      const span = document.createElement('span');
      span.className = `term-line-${type}`;
      span.textContent = text;
      screen.appendChild(span);
      screen.scrollTop = screen.scrollHeight;
    }

    const drawerScreen = document.getElementById('drawer-terminal-screen');
    if (drawerScreen) {
      const span2 = document.createElement('span');
      span2.className = `term-line-${type}`;
      span2.textContent = text;
      drawerScreen.appendChild(span2);
      drawerScreen.scrollTop = drawerScreen.scrollHeight;
    }
  }

  showInputPrompt(promptText) {
    return new Promise((resolve) => {
      // Hiển thị modal prompt nhập liệu
      const promptBox = document.getElementById('mobile-input-prompt-box');
      const promptLabel = document.getElementById('prompt-text-label');
      const promptInput = document.getElementById('prompt-field-input');
      const promptForm = document.getElementById('prompt-submit-form');

      if (!promptBox || !promptInput) {
        // Fallback sang window.prompt nếu thiếu DOM
        resolve(window.prompt(promptText) || '');
        return;
      }

      promptLabel.textContent = `🐍 Python input(): ${promptText || 'Nhập dữ liệu từ bàn phím'}`;
      promptInput.value = '';
      promptBox.style.display = 'block';
      promptInput.focus();

      const onSubmit = (e) => {
        e.preventDefault();
        const value = promptInput.value;
        promptBox.style.display = 'none';
        promptForm.removeEventListener('submit', onSubmit);
        resolve(value);
      };

      promptForm.addEventListener('submit', onSubmit);
    });
  }

  // === GOOGLE DRIVE MODAL & SYNC ===
  openDriveModal() {
    const modal = document.getElementById('modal-google-drive');
    const inputUrl = document.getElementById('input-drive-api-url');
    if (modal && inputUrl) {
      inputUrl.value = this.driveSync.getApiUrl();
      modal.classList.add('show');
    }
  }

  closeDriveModal() {
    const modal = document.getElementById('modal-google-drive');
    if (modal) modal.classList.remove('show');
  }

  openStudentModal() {
    const modal = document.getElementById('modal-student-profile');
    if (modal) {
      const user = adminStore.getCurrentUser();
      const p = user ? {
        studentId: user.username || user.email,
        fullName: user.fullName,
        className: user.className || (user.type === 'google' ? 'Google Account' : '')
      } : this.driveSync.student;

      const inputId = document.getElementById('input-student-id');
      const inputName = document.getElementById('input-student-name');
      const inputClass = document.getElementById('input-student-class');

      if (inputId) inputId.value = p.studentId || '';
      if (inputName) inputName.value = p.fullName || '';
      if (inputClass) inputClass.value = p.className || '';

      modal.classList.add('show');
    }
  }

  closeStudentModal() {
    const modal = document.getElementById('modal-student-profile');
    if (modal) modal.classList.remove('show');
  }

  bindModalEvents() {
    // Đóng modal
    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeDriveModal();
        this.closeStudentModal();
      });
    });

    // Test & Lưu Google Drive API
    const btnSaveDrive = document.getElementById('btn-save-drive-config');
    const btnTestDrive = document.getElementById('btn-test-drive-connection');
    const driveStatusText = document.getElementById('drive-test-status');

    if (btnTestDrive) {
      btnTestDrive.addEventListener('click', async () => {
        const url = document.getElementById('input-drive-api-url').value;
        driveStatusText.textContent = "⏳ Đang kiểm tra kết nối tới Google Drive...";
        driveStatusText.style.color = "#e6db74";

        try {
          const res = await this.driveSync.testConnection(url);
          driveStatusText.textContent = "✅ " + (res.message || "Kết nối Google Apps Script thành công!");
          driveStatusText.style.color = "#a6e22e";
        } catch (err) {
          driveStatusText.textContent = "❌ Lỗi: " + err.message;
          driveStatusText.style.color = "#f92672";
        }
      });
    }

    if (btnSaveDrive) {
      btnSaveDrive.addEventListener('click', async () => {
        const url = document.getElementById('input-drive-api-url').value;
        this.driveSync.setApiUrl(url);
        this.updateDriveStatusUI();

        // Bốc tách dữ liệu từ Drive
        btnSaveDrive.disabled = true;
        btnSaveDrive.textContent = "Đang đồng bộ...";

        try {
          const syncResult = await this.driveSync.syncFromDrive();
          alert(syncResult.message);
          this.closeDriveModal();
        } catch (e) {
          alert("Lưu URL thành công. Lỗi khi bốc tách: " + e.message);
        } finally {
          btnSaveDrive.disabled = false;
          btnSaveDrive.textContent = "Lưu & Bốc Tách Dữ Liệu";
        }
      });
    }

    // Lưu Profile Học Sinh
    const btnSaveStudent = document.getElementById('btn-save-student-profile');
    if (btnSaveStudent) {
      btnSaveStudent.addEventListener('click', () => {
        const profile = {
          studentId: document.getElementById('input-student-id').value.trim() || 'HS-001',
          fullName: document.getElementById('input-student-name').value.trim() || 'Học sinh',
          className: document.getElementById('input-student-class').value.trim() || '10A1'
        };
        this.driveSync.saveStudentProfile(profile);
        this.updateStudentBadgeUI();
        this.closeStudentModal();
        alert("Đã cập nhật thông tin học sinh!");
      });
    }
  }

  updateDriveStatusUI() {
    const btnDrive = document.getElementById('btn-open-drive-modal');
    if (!btnDrive) return;

    if (this.driveSync.isConnected()) {
      btnDrive.classList.add('connected');
      btnDrive.innerHTML = '<span>🟢 Drive: Đã Kết Nối</span>';
    } else {
      btnDrive.classList.remove('connected');
      btnDrive.innerHTML = '<span>📁 Kết Nối Google Drive</span>';
    }
  }

  openUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    const btn = document.getElementById('student-badge-btn');
    if (menu) menu.classList.add('show');
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  closeUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    const btn = document.getElementById('student-badge-btn');
    if (menu) menu.classList.remove('show');
    if (btn) {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  updateStudentBadgeUI() {
    const badgeLabel = document.getElementById('user-pill-label');
    const badgeBtn = document.getElementById('student-badge-btn');
    const currentUser = adminStore.getCurrentUser();

    // Các thành phần trong Menu Dropdown
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownRole = document.getElementById('dropdown-user-role');
    const dropdownClass = document.getElementById('dropdown-user-class');
    const dropdownId = document.getElementById('dropdown-user-id');
    const classRow = document.getElementById('dropdown-meta-class-row');
    const idRow = document.getElementById('dropdown-meta-id-row');
    const linkAdmin = document.getElementById('dropdown-link-admin');
    const adminHeaderLink = document.getElementById('btn-admin-header-link');

    if (currentUser) {
      this.driveSync.student = {
        studentId: currentUser.username || currentUser.email,
        fullName: currentUser.fullName,
        className: currentUser.className || (currentUser.type === 'google' ? 'Google Account' : '')
      };

      const isAdmin = currentUser.role === 'admin' || currentUser.type === 'admin';

      if (adminHeaderLink) {
        adminHeaderLink.style.display = isAdmin ? 'inline-flex' : 'none';
      }

      if (badgeBtn) {
        badgeBtn.classList.remove('admin-tier', 'student-tier');
        if (isAdmin) {
          badgeBtn.classList.add('admin-tier');
          badgeBtn.title = 'Quản trị viên: Admin - Bấm để mở menu tùy chọn & Đăng xuất';
        } else {
          badgeBtn.classList.add('student-tier');
          badgeBtn.title = `Học sinh: ${currentUser.fullName} - Bấm để mở menu hồ sơ & Đăng xuất`;
        }
      }

      if (badgeLabel) {
        if (isAdmin) {
          badgeLabel.innerHTML = `🛡️ <strong>Admin</strong>`;
        } else if (currentUser.type === 'school') {
          badgeLabel.innerHTML = `🎓 <strong>${this.escapeHtml(currentUser.fullName)}</strong>`;
        } else {
          badgeLabel.innerHTML = `🌐 <strong>${this.escapeHtml(currentUser.fullName)}</strong>`;
        }
      }

      // Điền thông tin vào dropdown
      if (dropdownAvatar) {
        dropdownAvatar.textContent = isAdmin ? '🛡️' : (currentUser.type === 'google' ? '🌐' : '🎓');
      }
      if (dropdownName) {
        dropdownName.textContent = currentUser.fullName || (isAdmin ? 'Quản Trị Viên' : 'Học sinh');
      }
      if (dropdownRole) {
        dropdownRole.textContent = isAdmin ? 'Quản Trị Viên (Admin)' : (currentUser.type === 'google' ? 'Tài Khoản Google' : 'Học Sinh');
        dropdownRole.className = `dropdown-role-badge ${isAdmin ? 'admin' : ''}`;
      }
      if (dropdownClass && classRow) {
        if (currentUser.className) {
          classRow.style.display = 'flex';
          dropdownClass.textContent = currentUser.className;
        } else {
          classRow.style.display = 'none';
        }
      }
      if (dropdownId && idRow) {
        const idVal = currentUser.username || currentUser.email;
        if (idVal) {
          idRow.style.display = 'flex';
          dropdownId.textContent = idVal;
        } else {
          idRow.style.display = 'none';
        }
      }
      if (linkAdmin) {
        linkAdmin.style.display = isAdmin ? 'flex' : 'none';
      }

      // CHỈ ADMIN MỚI ĐƯỢC PHÉP XEM VÀ CẤU HÌNH GOOGLE DRIVE CMS
      const btnDriveModal = document.getElementById('btn-open-drive-modal');
      const dropdownBtnDrive = document.getElementById('dropdown-btn-drive');
      if (btnDriveModal) {
        btnDriveModal.style.display = isAdmin ? 'inline-flex' : 'none';
      }
      if (dropdownBtnDrive) {
        dropdownBtnDrive.style.display = isAdmin ? 'flex' : 'none';
      }

      // === ĐỒNG BỘ THÔNG TIN VÀO TAB TÀI KHOẢN DI ĐỘNG (VIEW 4: PANEL ACCOUNT) ===
      const mobAvatar = document.getElementById('mobile-acc-avatar');
      const mobName = document.getElementById('mobile-acc-name');
      const mobRole = document.getElementById('mobile-acc-role');
      const mobClass = document.getElementById('mobile-acc-class');
      const mobClassBox = document.getElementById('mobile-acc-class-box');
      const mobId = document.getElementById('mobile-acc-id');
      const mobIdBox = document.getElementById('mobile-acc-id-box');
      const mobRank = document.getElementById('mobile-acc-rank');
      const mobXp = document.getElementById('mobile-acc-xp');
      const mobLinkAdmin = document.getElementById('acc-link-admin');
      const mobBtnDrive = document.getElementById('acc-btn-drive');
      const bnavProfileLabel = document.getElementById('bnav-profile-label');

      if (mobAvatar) {
        mobAvatar.textContent = isAdmin ? '🛡️' : (currentUser.type === 'google' ? '🌐' : '🎓');
      }
      if (mobName) {
        mobName.textContent = currentUser.fullName || (isAdmin ? 'Quản Trị Viên' : 'Học sinh');
      }
      if (mobRole) {
        mobRole.textContent = isAdmin ? 'Quản Trị Viên (Admin)' : (currentUser.type === 'google' ? 'Tài Khoản Google' : 'Học Sinh');
      }
      if (mobClass && mobClassBox) {
        if (currentUser.className) {
          mobClassBox.style.display = 'flex';
          mobClass.textContent = currentUser.className;
        } else {
          mobClassBox.style.display = 'none';
        }
      }
      if (mobId && mobIdBox) {
        const idVal = currentUser.username || currentUser.email;
        if (idVal) {
          mobIdBox.style.display = 'flex';
          mobId.textContent = idVal;
        } else {
          mobIdBox.style.display = 'none';
        }
      }
      if (mobRank) {
        const rankTitle = document.getElementById('user-rank-title')?.textContent || 'Tân Binh Python';
        const rankIcon = document.getElementById('user-rank-icon')?.textContent || '🌱';
        mobRank.textContent = `${rankIcon} ${rankTitle}`;
      }
      if (mobXp) {
        const totalXp = this.driveSync.getTotalXP ? this.driveSync.getTotalXP() : (currentUser.xp || 0);
        mobXp.textContent = `${totalXp} XP`;
      }
      if (mobLinkAdmin) {
        mobLinkAdmin.style.display = isAdmin ? 'flex' : 'none';
      }
      if (mobBtnDrive) {
        mobBtnDrive.style.display = isAdmin ? 'flex' : 'none';
      }
      if (bnavProfileLabel) {
        // Tên ngắn gọn trên thanh điều hướng đáy
        const shortName = currentUser.fullName ? currentUser.fullName.split(' ').pop() : 'Tài Khoản';
        bnavProfileLabel.textContent = shortName.length <= 8 ? shortName : 'Tài Khoản';
      }
    } else {
      if (badgeLabel) {
        badgeLabel.innerHTML = `👤 Khách`;
      }
      if (dropdownName) {
        dropdownName.textContent = 'Khách viếng thăm';
      }
      if (dropdownRole) {
        dropdownRole.textContent = 'Chưa đăng nhập';
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// Khởi chạy ứng dụng khi DOM tải xong
window.addEventListener('DOMContentLoaded', () => {
  const app = new PySublimeApp();
  app.init();
  window.__PYS_APP = app; // Hỗ trợ debug nếu cần
});
