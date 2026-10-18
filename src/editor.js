/**
 * Sublime Text Web Editor Controller: Quản lý trình soạn thảo phong cách Sublime Text (Monokai)
 * và Bàn phím trợ lực gõ code ảo cho điện thoại di động
 */

export class SublimeEditor {
  constructor(containerId, statusBarId) {
    this.containerId = containerId;
    this.statusBarId = statusBarId;
    this.editor = null;
    this.tabs = [
      { id: 'main.py', title: 'main.py', content: '# Viết mã Python tại đây\nprint("Hello from Sublime Text Mobile!")\n', isModified: false }
    ];
    this.activeTabId = 'main.py';
  }

  async init() {
    // Chờ thư viện Ace Editor nạp sẵn từ CDN
    if (!window.ace) {
      await this.loadAceLibrary();
    }

    this.editor = window.ace.edit(this.containerId);
    this.editor.setTheme("ace/theme/monokai");
    this.editor.session.setMode("ace/mode/python");

    // Tùy biến chuẩn Sublime Text
    this.editor.setOptions({
      fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
      fontSize: "14px",
      tabSize: 4,
      useSoftTabs: true,
      showPrintMargin: false,
      highlightActiveLine: true,
      wrap: true,
      showFoldWidgets: true,
      cursorStyle: "smooth",
      behavioursEnabled: true
    });

    // Cập nhật status bar khi con trỏ di chuyển
    this.editor.selection.on('changeCursor', () => {
      this.updateStatusBar();
    });

    this.editor.session.on('change', () => {
      const activeTab = this.getActiveTab();
      if (activeTab) {
        activeTab.content = this.editor.getValue();
        activeTab.isModified = true;
        this.renderTabs();
      }
    });

    // Nạp tab đầu tiên
    this.editor.setValue(this.tabs[0].content, -1);
    this.renderTabs();
    this.updateStatusBar();
  }

  loadAceLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/ace.js";
      script.onload = () => {
        // Tải thêm mode python & theme monokai nếu cần
        resolve();
      };
      script.onerror = () => reject(new Error("Không thể tải thư viện Ace Editor"));
      document.head.appendChild(script);
    });
  }

  getCode() {
    return this.editor ? this.editor.getValue() : '';
  }

  setCode(code) {
    if (this.editor) {
      this.editor.setValue(code, -1);
      const activeTab = this.getActiveTab();
      if (activeTab) {
        activeTab.content = code;
        activeTab.isModified = false;
        this.renderTabs();
      }
    }
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  selectTab(tabId) {
    const target = this.tabs.find(t => t.id === tabId);
    if (!target) return;

    this.activeTabId = tabId;
    this.editor.setValue(target.content, -1);
    this.renderTabs();
    this.updateStatusBar();
  }

  createOrUpdateTab(tabId, title, content) {
    let existing = this.tabs.find(t => t.id === tabId);
    if (existing) {
      existing.content = content;
      existing.title = title;
      existing.isModified = false;
    } else {
      existing = { id: tabId, title, content, isModified: false };
      this.tabs.push(existing);
    }
    this.selectTab(tabId);
  }

  renderTabs() {
    const tabContainer = document.getElementById('sublime-tabs-container');
    if (!tabContainer) return;

    tabContainer.innerHTML = '';
    this.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `sublime-tab ${tab.id === this.activeTabId ? 'active' : ''}`;
      tabEl.innerHTML = `
        <span class="tab-icon">🐍</span>
        <span class="tab-title">${tab.title}</span>
        ${tab.isModified ? '<span class="tab-dot" title="Chưa lưu">●</span>' : ''}
        ${this.tabs.length > 1 ? `<span class="tab-close" data-id="${tab.id}">×</span>` : ''}
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close')) {
          e.stopPropagation();
          this.closeTab(tab.id);
        } else {
          this.selectTab(tab.id);
        }
      });

      tabContainer.appendChild(tabEl);
    });
  }

  closeTab(tabId) {
    if (this.tabs.length <= 1) return;
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    this.tabs.splice(index, 1);
    if (this.activeTabId === tabId) {
      const nextTab = this.tabs[Math.max(0, index - 1)];
      this.selectTab(nextTab.id);
    } else {
      this.renderTabs();
    }
  }

  updateStatusBar() {
    const statusEl = document.getElementById(this.statusBarId);
    if (!statusEl || !this.editor) return;

    const cursor = this.editor.getCursorPosition();
    const line = cursor.row + 1;
    const col = cursor.column + 1;
    const linesCount = this.editor.session.getLength();

    statusEl.innerHTML = `
      <div class="status-left">
        <span class="status-item"><i class="icon-line">Ln ${line}, Col ${col}</i></span>
        <span class="status-item">${linesCount} dòng</span>
      </div>
      <div class="status-right">
        <span class="status-item">Python 3.12</span>
        <span class="status-item">UTF-8</span>
        <span class="status-item">Spaces: 4</span>
      </div>
    `;
  }

  // === CÁC THAO TÁC CỦA BÀN PHÍM ẢO TRỢ LỰC TRÊN ĐIỆN THOẠI ===

  insertTab() {
    this.editor.insert("    ");
    this.editor.focus();
  }

  indentSelection() {
    this.editor.blockIndent();
    this.editor.focus();
  }

  outdentSelection() {
    this.editor.blockOutdent();
    this.editor.focus();
  }

  insertText(text, cursorOffset = 0) {
    this.editor.insert(text);
    if (cursorOffset !== 0) {
      const pos = this.editor.getCursorPosition();
      this.editor.moveCursorTo(pos.row, pos.column + cursorOffset);
    }
    this.editor.focus();
  }

  moveCursorLeft() {
    this.editor.navigateLeft(1);
    this.editor.focus();
  }

  moveCursorRight() {
    this.editor.navigateRight(1);
    this.editor.focus();
  }

  undo() {
    this.editor.undo();
    this.editor.focus();
  }

  redo() {
    this.editor.redo();
    this.editor.focus();
  }

  clear() {
    this.editor.setValue("", -1);
    this.editor.focus();
  }
}
