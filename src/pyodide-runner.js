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

    // Sử dụng API native setStdout, setStderr, setStdin của Pyodide v0.26
    this.pyodide.setStdout({
      batched: (msg) => {
        stdoutBuffer += msg + "\n";
        if (onOutput) onOutput(msg + "\n");
      }
    });

    this.pyodide.setStderr({
      batched: (err) => {
        if (onError) onError(err + "\n");
      }
    });

    this.pyodide.setStdin({
      stdin: () => {
        const val = window.prompt("🐍 Python input(): Nhập dữ liệu từ bàn phím:") ?? "";
        if (onOutput) onOutput(val + "\n");
        return val;
      }
    });

    try {
      await this.pyodide.runPythonAsync(code);
      return { success: true, output: stdoutBuffer };
    } catch (err) {
      const cleanError = this.formatErrorMessage(err.message);
      if (onError) onError(cleanError + "\n");
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

      this.pyodide.setStdout({
        batched: (msg) => {
          testOutput += (testOutput ? "\n" : "") + msg;
        }
      });

      this.pyodide.setStderr({
        batched: (err) => {
          testOutput += (testOutput ? "\n" : "") + err;
        }
      });

      this.pyodide.setStdin({
        stdin: () => {
          return inputQueue.shift() ?? "";
        }
      });

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
