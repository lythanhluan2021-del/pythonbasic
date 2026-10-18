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
  /**
   * Bác Sĩ Python Thông Minh: Phân tích & Chuẩn đoán lỗi dễ hiểu bằng tiếng Việt cho học sinh
   */
  formatErrorMessage(rawMsg) {
    if (!rawMsg) return "Lỗi không xác định khi thực thi mã nguồn";

    let msg = rawMsg;
    if (msg.includes("Traceback (most recent call last):")) {
      const parts = msg.split("Traceback (most recent call last):");
      msg = parts[parts.length - 1].trim();
    }

    // 1. Lỗi thụt đầu dòng (IndentationError)
    if (msg.includes("IndentationError")) {
      return msg + "\n\n💡 [Bác Sĩ Python]: Lỗi thụt đầu dòng (Indentation).\n👉 Khắc phục: Các lệnh con sau if, for, while, def bắt buộc phải thụt vào 4 khoảng trắng. Hãy dùng phím [Tab] trên bàn phím ảo để căn lề chuẩn.";
    }

    // 2. Lỗi cú pháp (SyntaxError)
    if (msg.includes("SyntaxError")) {
      if (msg.includes("expected ':'") || msg.includes("invalid syntax") && (msg.includes("if") || msg.includes("for") || msg.includes("while") || msg.includes("def"))) {
        return msg + "\n\n💡 [Bác Sĩ Python]: Thiếu dấu hai chấm [ : ]!\n👉 Khắc phục: Cuối mỗi câu lệnh `if điều_kiện:`, `for item in list:`, `while điều_kiện:`, `def ten_ham():` bắt buộc phải có dấu hai chấm [ : ].";
      }
      if (msg.includes("unexpected EOF while parsing") || msg.includes("was never closed")) {
        return msg + "\n\n💡 [Bác Sĩ Python]: Thiếu dấu đóng ngoặc hoặc nháy kép!\n👉 Khắc phục: Bạn đang mở ngoặc `(` hoặc nháy `\"` nhưng chưa đóng ngoặc `)` hoặc `\"` tương ứng.";
      }
      return msg + "\n\n💡 [Bác Sĩ Python]: Lỗi cú pháp (SyntaxError).\n👉 Khắc phục: Hãy kiểm tra kỹ xem có dấu hai chấm [ : ], ngoặc tròn `()`, ngoặc kép `\"\"` hoặc nhầm dấu gán `=` với so sánh `==` không.";
    }

    // 3. Lỗi gọi sai tên biến/hàm (NameError)
    if (msg.includes("NameError")) {
      if (msg.includes("'Print'") || msg.includes("'PRINT'")) {
        return msg + "\n\n💡 [Bác Sĩ Python]: Sai chữ hoa/thường!\n👉 Khắc phục: Trong Python hàm in phải viết thường toàn bộ là `print(...)`, không được viết hoa `Print(...)`.";
      }
      if (msg.includes("'Input'") || msg.includes("'INPUT'")) {
        return msg + "\n\n💡 [Bác Sĩ Python]: Sai chữ hoa/thường!\n👉 Khắc phục: Hàm nhập liệu phải viết thường toàn bộ là `input(...)`, không được viết `Input(...)`.";
      }
      return msg + "\n\n💡 [Bác Sĩ Python]: Tên biến hoặc hàm chưa được định nghĩa!\n👉 Khắc phục: Bạn hãy kiểm tra xem biến này đã được gán giá trị trước đó chưa, hoặc có bị gõ sai chính tả / lệch chữ hoa-thường không.";
    }

    // 4. Lỗi kiểu dữ liệu (TypeError)
    if (msg.includes("TypeError")) {
      if (msg.includes("can only concatenate str") || msg.includes("unsupported operand type")) {
        return msg + "\n\n💡 [Bác Sĩ Python]: Không thể tính toán giữa chuỗi chữ và số!\n👉 Khắc phục: Dữ liệu từ `input()` mặc định là chuỗi chữ (str). Bạn cần ép kiểu sang số: `int(input())` hoặc `float(input())` trước khi cộng/trừ/nhân/chia.";
      }
      return msg + "\n\n💡 [Bác Sĩ Python]: Lỗi kiểu dữ liệu (TypeError).\n👉 Khắc phục: Hãy kiểm tra các biến và tham số xem có đúng kiểu số (int/float) hoặc chuỗi (str) chưa.";
    }

    // 5. Lỗi chia cho số không (ZeroDivisionError)
    if (msg.includes("ZeroDivisionError")) {
      return msg + "\n\n💡 [Bác Sĩ Python]: Lỗi toán học - Phép chia cho số 0!\n👉 Khắc phục: Mẫu số trong phép chia `/`, `//` hoặc `%` không được bằng 0.";
    }

    // 6. Lỗi tràn danh sách (IndexError)
    if (msg.includes("IndexError")) {
      return msg + "\n\n💡 [Bác Sĩ Python]: Vị trí phần tử (Index) vượt quá độ dài của Danh sách!\n👉 Khắc phục: Trong Python, vị trí phần tử đầu tiên bắt đầu từ số 0. Ví dụ danh sách có 3 phần tử thì chỉ có vị trí 0, 1, 2.";
    }

    // 7. Lỗi khóa từ điển (KeyError)
    if (msg.includes("KeyError")) {
      return msg + "\n\n💡 [Bác Sĩ Python]: Khóa (Key) này không có trong Từ điển (Dictionary)!\n👉 Khắc phục: Hãy kiểm tra lại tên Key trong từ điển xem có chính xác từng chữ hoa/thường không.";
    }

    // 8. Lỗi giá trị chuyển đổi (ValueError)
    if (msg.includes("ValueError")) {
      return msg + "\n\n💡 [Bác Sĩ Python]: Lỗi giá trị (ValueError).\n👉 Khắc phục: Hàm `int()` hoặc `float()` không thể chuyển đổi một chuỗi chứa chữ cái thành số được.";
    }

    return msg;
  }
}
