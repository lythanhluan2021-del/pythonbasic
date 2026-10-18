/**
 * Pyodide Runner Module: Chạy Python 3.12 WebAssembly trực tiếp trên trình duyệt điện thoại
 * Hỗ trợ capture print() stdout, stderr, và xử lý tương tác input()
 */

export class PyodideRunner {
  constructor() {
    this.pyodide = null;
    this.isLoading = false;
    this.isReady = false;
    this.onOutputCallback = null;
    this.onErrorCallback = null;
    this.onStatusChangeCallback = null;
    this.inputPromptCallback = null;
  }

  async init(onStatus) {
    if (this.isReady) return;
    if (this.isLoading) return;

    this.isLoading = true;
    if (onStatus) onStatus("Đang nạp môi trường Python 3.12 (WebAssembly)...");

    try {
      // Tải script Pyodide nếu chưa có
      if (!window.loadPyodide) {
        await this.loadScript("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
      }

      this.pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
      });

      // Cấu hình chuẩn stdout/stderr và input() tương tác qua bridge window của JS
      await this.pyodide.runPythonAsync(`
import sys
import builtins
from js import window

class WebStdout:
    def write(self, s):
        if s:
            try:
                window.__pyodide_stdout_handler(str(s))
            except Exception:
                pass
    def flush(self):
        pass

class WebStderr:
    def write(self, s):
        if s:
            try:
                window.__pyodide_stderr_handler(str(s))
            except Exception:
                pass
    def flush(self):
        pass

def _mobile_input(prompt=''):
    p_str = str(prompt) if prompt is not None else ''
    if p_str:
        try:
            window.__pyodide_stdout_handler(p_str)
        except Exception:
            pass
    try:
        val = str(window.__pyodide_input_handler(p_str) or '')
    except Exception:
        val = ''
    try:
        window.__pyodide_stdout_handler(val + '\\n')
    except Exception:
        pass
    return val

sys.stdout = WebStdout()
sys.stderr = WebStderr()
builtins.input = _mobile_input
`);

      this.isReady = true;
      this.isLoading = false;
      if (onStatus) onStatus("Python 3.12 sẵn sàng! 🚀");
    } catch (err) {
      this.isLoading = false;
      console.error("Lỗi nạp Pyodide:", err);
      if (onStatus) onStatus("Lỗi nạp Python: " + err.message);
      throw err;
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Không thể tải thư viện Pyodide từ CDN"));
      document.head.appendChild(script);
    });
  }

  /**
   * Chạy một đoạn mã Python
   */
  async runCode(code, { onOutput, onError, onInputPrompt }) {
    if (!this.isReady) {
      await this.init();
    }

    let stdoutBuffer = "";

    // Đăng ký callbacks trên window để Python gọi trực tiếp
    window.__pyodide_stdout_handler = (text) => {
      stdoutBuffer += text;
      if (onOutput) onOutput(text);
    };

    window.__pyodide_stderr_handler = (text) => {
      if (onError) onError(text);
    };

    // Đăng ký hàm input tương tác
    window.__pyodide_input_handler = (promptText) => {
      if (onInputPrompt) {
        return onInputPrompt(promptText || "Nhập giá trị: ");
      }
      return window.prompt(promptText || "Nhập giá trị từ bàn phím:") || "";
    };

    try {
      await this.pyodide.runPythonAsync(code);
      return { success: true, output: stdoutBuffer };
    } catch (err) {
      const cleanError = this.formatErrorMessage(err.message);
      if (onError) onError(cleanError);
      return { success: false, error: cleanError };
    }
  }

  /**
   * Chạy kiểm thử tự động với bộ Test Case (Dành cho bài tập thực hành)
   */
  async runTestCases(code, testCases) {
    if (!this.isReady) {
      await this.init();
    }

    const results = [];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      let testOutput = "";
      const inputQueue = tc.input ? tc.input.split("\n") : [];

      window.__pyodide_stdout_handler = (text) => {
        testOutput += text;
      };

      window.__pyodide_stderr_handler = (text) => {
        testOutput += text;
      };

      window.__pyodide_input_handler = () => {
        return inputQueue.shift() || "";
      };

      try {
        await this.pyodide.runPythonAsync(code);

        const actual = testOutput.trim().replace(/\r\n/g, "\n");
        const expected = (tc.expected || "").trim().replace(/\r\n/g, "\n");
        const passed = (actual === expected);

        if (passed) passedCount++;

        results.push({
          testNumber: i + 1,
          input: tc.input,
          expected: expected,
          actual: actual,
          passed: passed
        });
      } catch (err) {
        results.push({
          testNumber: i + 1,
          input: tc.input,
          expected: tc.expected,
          actual: "LỖI: " + this.formatErrorMessage(err.message),
          passed: false
        });
      }
    }

    const allPassed = passedCount === testCases.length;
    const score = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 100;

    return {
      allPassed,
      score,
      passedCount,
      totalCount: testCases.length,
      details: results
    };
  }

  /**
   * Làm sạch thông báo lỗi Python cho học sinh dễ hiểu bằng tiếng Việt
   */
  formatErrorMessage(rawMsg) {
    if (!rawMsg) return "Lỗi không xác định";

    let msg = rawMsg;
    // Bỏ qua các stack trace phức tạp của pyodide
    if (msg.includes("Traceback (most recent call last):")) {
      const parts = msg.split("Traceback (most recent call last):");
      msg = parts[parts.length - 1];
    }

    // Dịch các lỗi phổ biến sang gợi ý tiếng Việt dễ hiểu
    if (msg.includes("IndentationError")) {
      return msg + "\n💡 [Gợi ý]: Lỗi thụt đầu dòng (Indentation). Hãy dùng phím [Tab] hoặc [Indent+] trên bàn phím ảo để căn lề 4 khoảng trắng chuẩn Python.";
    }
    if (msg.includes("SyntaxError")) {
      return msg + "\n💡 [Gợi ý]: Lỗi cú pháp. Hãy kiểm tra xem bạn có quên dấu hai chấm [ : ] sau lệnh if/for/while/def hoặc thiếu đóng ngoặc không.";
    }
    if (msg.includes("NameError")) {
      return msg + "\n💡 [Gợi ý]: Biến chưa được định nghĩa. Hãy kiểm tra lại xem tên biến có bị viết sai chính tả hoặc gõ chữ hoa/thường lệch không.";
    }
    if (msg.includes("TypeError")) {
      return msg + "\n💡 [Gợi ý]: Lỗi kiểu dữ liệu. Nhớ dùng int() hoặc float() khi tính toán số học với dữ liệu từ input().";
    }

    return msg;
  }
}
