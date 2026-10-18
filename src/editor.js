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

    // Tùy biến chuẩn Sublime Text & Kích hoạt nhắc lệnh Autocomplete
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
      behavioursEnabled: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true
    });

    // Cài đặt bộ từ điển nhắc lệnh Python thông minh kèm giải thích tiếng Việt
    this.setupPythonAutocompletion();

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
      const loadScript = (src) => {
        return new Promise((res, rej) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = res;
          script.onerror = rej;
          document.head.appendChild(script);
        });
      };

      loadScript("https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/ace.js")
        .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/theme-monokai.min.js"))
        .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/mode-python.min.js"))
        .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/ext-language_tools.min.js"))
        .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/snippets/python.min.js"))
        .then(resolve)
        .catch(() => reject(new Error("Không thể tải thư viện Ace Editor")));
    });
  }

  setupPythonAutocompletion() {
    try {
      const langTools = window.ace.require ? window.ace.require("ace/ext/language_tools") : null;
      if (!langTools) return;

      const pythonKeywordsAndBuiltins = [
        // Nhóm 1: Các hàm xuất nhập và thông dụng nhất
        { caption: 'print(...)', value: 'print()', snippet: 'print(${1:})', meta: 'hàm in', score: 3000, docHTML: '<b>print(...)</b><br>Xuất văn bản, số, hoặc giá trị biến ra màn hình console.' },
        { caption: 'input(...)', value: 'input()', snippet: 'input("${1:Nhập: }")', meta: 'hàm nhập', score: 2900, docHTML: '<b>input(prompt)</b><br>Nhận chuỗi ký tự nhập vào từ bàn phím người dùng.' },
        { caption: 'len(...)', value: 'len()', snippet: 'len(${1:})', meta: 'độ dài chuỗi/list', score: 2800, docHTML: '<b>len(obj)</b><br>Trả về số lượng phần tử của chuỗi, list, tuple hoặc dict.' },
        { caption: 'range(...)', value: 'range()', snippet: 'range(${1:n})', meta: 'tạo dãy số', score: 2700, docHTML: '<b>range(start, stop, step)</b><br>Tạo dãy số nguyên liên tiếp để lặp với for.' },
        { caption: 'type(...)', value: 'type()', snippet: 'type(${1:})', meta: 'kiểu dữ liệu', score: 2600, docHTML: '<b>type(object)</b><br>Kiểm tra kiểu dữ liệu của biến hoặc giá trị.' },

        // Nhóm 2: Ép kiểu dữ liệu (Type Casting)
        { caption: 'int(...)', value: 'int()', snippet: 'int(${1:})', meta: 'ép kiểu int', score: 2500, docHTML: '<b>int(x)</b><br>Chuyển đổi chuỗi hoặc số thực thành số nguyên.' },
        { caption: 'float(...)', value: 'float()', snippet: 'float(${1:})', meta: 'ép kiểu float', score: 2400, docHTML: '<b>float(x)</b><br>Chuyển đổi chuỗi hoặc số nguyên thành số thực.' },
        { caption: 'str(...)', value: 'str()', snippet: 'str(${1:})', meta: 'ép kiểu string', score: 2300, docHTML: '<b>str(x)</b><br>Chuyển đổi giá trị bất kỳ thành chuỗi ký tự.' },
        { caption: 'bool(...)', value: 'bool()', snippet: 'bool(${1:})', meta: 'ép kiểu bool', score: 2200, docHTML: '<b>bool(x)</b><br>Chuyển đổi giá trị sang kiểu logic True/False.' },
        { caption: 'list(...)', value: 'list()', snippet: 'list(${1:})', meta: 'tạo danh sách', score: 2100, docHTML: '<b>list(iterable)</b><br>Tạo hoặc ép kiểu một tập hợp sang List.' },
        { caption: 'dict(...)', value: 'dict()', snippet: 'dict(${1:})', meta: 'tạo dictionary', score: 2000, docHTML: '<b>dict(...)</b><br>Tạo từ điển lưu trữ dữ liệu dạng khóa - giá trị (Key-Value).' },
        { caption: 'set(...)', value: 'set()', snippet: 'set(${1:})', meta: 'tạo tập hợp', score: 1900, docHTML: '<b>set(...)</b><br>Tạo tập hợp chứa các phần tử duy nhất, không trùng lặp.' },
        { caption: 'tuple(...)', value: 'tuple()', snippet: 'tuple(${1:})', meta: 'tạo tuple', score: 1800, docHTML: '<b>tuple(...)</b><br>Tạo bộ giá trị cố định không thể sửa sau khi khởi tạo.' },

        // Nhóm 3: Cấu trúc điều khiển & Vòng lặp
        { caption: 'for in range', value: 'for i in range():', snippet: 'for ${1:i} in range(${2:n}):\n    ${3:pass}', meta: 'vòng lặp for', score: 2800, docHTML: '<b>for i in range(n):</b><br>Lặp qua dãy số từ 0 đến n-1.' },
        { caption: 'for in list', value: 'for item in list:', snippet: 'for ${1:item} in ${2:danh_sach}:\n    ${3:pass}', meta: 'duyệt phần tử', score: 2750, docHTML: '<b>for item in list:</b><br>Duyệt qua từng phần tử trong chuỗi hoặc danh sách.' },
        { caption: 'while ...:', value: 'while :', snippet: 'while ${1:dieu_kien}:\n    ${2:pass}', meta: 'vòng lặp while', score: 2700, docHTML: '<b>while điều_kiện:</b><br>Vòng lặp thực thi liên tục khi điều kiện còn Đúng.' },
        { caption: 'if ...:', value: 'if :', snippet: 'if ${1:dieu_kien}:\n    ${2:pass}', meta: 'câu lệnh if', score: 2900, docHTML: '<b>if điều_kiện:</b><br>Thực thi khối lệnh nếu biểu thức logic là Đúng.' },
        { caption: 'if ... else:', value: 'if else', snippet: 'if ${1:dieu_kien}:\n    ${2:pass}\nelse:\n    ${3:pass}', meta: 'cấu trúc if-else', score: 2850, docHTML: '<b>if-else</b><br>Rẽ nhánh điều kiện: nếu Đúng làm if, Sai làm else.' },
        { caption: 'elif ...:', value: 'elif :', snippet: 'elif ${1:dieu_kien}:\n    ${2:pass}', meta: 'nhánh elif', score: 2800, docHTML: '<b>elif điều_kiện:</b><br>Kiểm tra điều kiện tiếp theo nếu nhánh trước đó Sai.' },
        { caption: 'try ... except:', value: 'try except', snippet: 'try:\n    ${1:pass}\nexcept Exception as e:\n    print(f"Lỗi: {e}")', meta: 'bắt lỗi try-except', score: 2100, docHTML: '<b>try ... except</b><br>Bắt và xử lý lỗi runtime an toàn.' },

        // Nhóm 4: Định nghĩa hàm
        { caption: 'def hàm(...):', value: 'def ():', snippet: 'def ${1:ten_ham}(${2:}):\n    \"\"\"Mô tả hàm\"\"\"\n    ${3:return None}', meta: 'định nghĩa hàm', score: 2800, docHTML: '<b>def ten_ham(...):</b><br>Khai báo hàm tự định nghĩa tái sử dụng mã nguồn.' },
        { caption: 'return', value: 'return ', snippet: 'return ${1:}', meta: 'trả về giá trị', score: 2750, docHTML: '<b>return</b><br>Dừng thực thi hàm và trả về kết quả cho nơi gọi.' },

        // Nhóm 5: Các hàm toán học tính toán
        { caption: 'sum(...)', value: 'sum()', snippet: 'sum(${1:})', meta: 'tính tổng', score: 2000, docHTML: '<b>sum(iterable)</b><br>Tính tổng các số trong danh sách hoặc tuple.' },
        { caption: 'max(...)', value: 'max()', snippet: 'max(${1:})', meta: 'giá trị lớn nhất', score: 2000, docHTML: '<b>max(...)</b><br>Tìm và trả về phần tử lớn nhất.' },
        { caption: 'min(...)', value: 'min()', snippet: 'min(${1:})', meta: 'giá trị nhỏ nhất', score: 2000, docHTML: '<b>min(...)</b><br>Tìm và trả về phần tử nhỏ nhất.' },
        { caption: 'abs(...)', value: 'abs()', snippet: 'abs(${1:})', meta: 'trị tuyệt đối', score: 1900, docHTML: '<b>abs(x)</b><br>Trả về giá trị tuyệt đối không âm của số x.' },
        { caption: 'round(...)', value: 'round()', snippet: 'round(${1:so}, ${2:2})', meta: 'làm tròn số', score: 1900, docHTML: '<b>round(x, n)</b><br>Làm tròn số thực x đến n chữ số thập phân.' },
        { caption: 'sorted(...)', value: 'sorted()', snippet: 'sorted(${1:})', meta: 'sắp xếp', score: 1800, docHTML: '<b>sorted(iterable)</b><br>Trả về danh sách mới đã được sắp xếp tăng dần.' },

        // Nhóm 6: Phương thức chuỗi & danh sách (Methods)
        { caption: 'append(...)', value: 'append()', snippet: 'append(${1:})', meta: 'thêm vào cuối list', score: 2500, docHTML: '<b>list.append(x)</b><br>Thêm một phần tử vào vị trí cuối cùng của danh sách.' },
        { caption: 'pop(...)', value: 'pop()', snippet: 'pop(${1:})', meta: 'xóa & lấy phần tử', score: 2200, docHTML: '<b>list.pop(i)</b><br>Lấy và xóa phần tử tại chỉ số i (mặc định phần tử cuối).' },
        { caption: 'split(...)', value: 'split()', snippet: 'split("${1: }")', meta: 'tách chuỗi sang list', score: 2300, docHTML: '<b>str.split(sep)</b><br>Tách chuỗi thành một danh sách các từ con.' },
        { caption: 'join(...)', value: 'join()', snippet: 'join(${1:danh_sach})', meta: 'nối các chuỗi', score: 2200, docHTML: '<b>sep.join(list)</b><br>Nối danh sách các chuỗi thành một chuỗi duy nhất.' },
        { caption: 'replace(...)', value: 'replace()', snippet: 'replace("${1:cu}", "${2:moi}")', meta: 'thay thế chuỗi', score: 2100, docHTML: '<b>str.replace(old, new)</b><br>Thay thế tất cả chuỗi cũ thành chuỗi mới.' },
        { caption: 'strip()', value: 'strip()', snippet: 'strip()', meta: 'xóa khoảng trắng thừa', score: 2000, docHTML: '<b>str.strip()</b><br>Xóa khoảng trắng ở 2 đầu chuỗi ký tự.' },
        { caption: 'lower()', value: 'lower()', snippet: 'lower()', meta: 'chữ thường', score: 1900, docHTML: '<b>str.lower()</b><br>Chuyển toàn bộ chuỗi sang chữ thường.' },
        { caption: 'upper()', value: 'upper()', snippet: 'upper()', meta: 'chữ in hoa', score: 1900, docHTML: '<b>str.upper()</b><br>Chuyển toàn bộ chuỗi sang chữ in hoa.' },

        // Nhóm 7: Từ khóa logic & giá trị
        { caption: 'True', value: 'True', meta: 'giá trị Đúng', score: 1800, docHTML: '<b>True</b><br>Giá trị Boolean đại diện cho tính Đúng.' },
        { caption: 'False', value: 'False', meta: 'giá trị Sai', score: 1800, docHTML: '<b>False</b><br>Giá trị Boolean đại diện cho tính Sai.' },
        { caption: 'None', value: 'None', meta: 'giá trị Rỗng', score: 1700, docHTML: '<b>None</b><br>Đại diện cho sự vắng mặt của giá trị (tương tự null).' },
        { caption: 'and', value: 'and ', meta: 'toán tử VÀ', score: 1600, docHTML: '<b>and</b><br>Toán tử logic: Đúng khi cả hai điều kiện cùng Đúng.' },
        { caption: 'or', value: 'or ', meta: 'toán tử HOẶC', score: 1600, docHTML: '<b>or</b><br>Toán tử logic: Đúng khi ít nhất một điều kiện Đúng.' },
        { caption: 'not', value: 'not ', meta: 'toán tử PHỦ ĐỊNH', score: 1600, docHTML: '<b>not</b><br>Đảo ngược giá trị logic: not True = False.' },
        { caption: 'in', value: 'in ', meta: 'kiểm tra phần tử', score: 1500, docHTML: '<b>in</b><br>Kiểm tra phần tử có nằm trong tập hợp/danh sách hay không.' },
        { caption: 'break', value: 'break', meta: 'ngắt vòng lặp', score: 1500, docHTML: '<b>break</b><br>Thoát ngay lập tức khỏi vòng lặp for hoặc while gần nhất.' },
        { caption: 'continue', value: 'continue', meta: 'bỏ qua vòng lặp', score: 1500, docHTML: '<b>continue</b><br>Bỏ qua phần còn lại và chuyển sang lần lặp kế tiếp.' },
        { caption: 'pass', value: 'pass', meta: 'lệnh giữ chỗ rỗng', score: 1400, docHTML: '<b>pass</b><br>Lệnh không làm gì cả, dùng giữ chỗ cho khối lệnh.' }
      ];

      const vietnamesePythonCompleter = {
        getCompletions: function(editor, session, pos, prefix, callback) {
          if (!prefix || prefix.length === 0) {
            callback(null, []);
            return;
          }

          const matched = pythonKeywordsAndBuiltins
            .filter(item => {
              const cap = item.caption.toLowerCase();
              const val = (item.value || '').toLowerCase();
              const pref = prefix.toLowerCase();
              return cap.startsWith(pref) || val.startsWith(pref) || cap.includes(pref);
            })
            .map(item => ({
              caption: item.caption,
              value: item.value || item.caption,
              snippet: item.snippet,
              meta: item.meta,
              score: item.score,
              docHTML: item.docHTML
            }));

          callback(null, matched);
        }
      };

      langTools.addCompleter(vietnamesePythonCompleter);
    } catch (e) {
      console.warn("Không thể kích hoạt Python Autocompletion:", e);
    }
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

  triggerAutocomplete() {
    if (!this.editor) return;
    this.editor.focus();
    this.editor.execCommand("startAutocomplete");
  }
}
