/**
 * Course Data: Lộ trình học lập trình Python cơ bản (theo chuẩn HowKteam)
 * Gồm 6 chương, 30+ bài học, tích hợp code mẫu và bài tập thực hành tự chấm điểm.
 */

export const COURSE_MODULES = [
  {
    id: "module-1",
    title: "Chương 1: Khởi Đầu & Cú Pháp Cơ Bản",
    description: "Làm quen với Python, biến, kiểu dữ liệu nguyên thủy và nhập xuất",
    lessons: [
      {
        id: "bai-01",
        title: "Bài 1: Giới thiệu Python & Lời chào đầu tiên",
        duration: "5 phút",
        theory: `
# Bài 1: Giới Thiệu Python & Lệnh In Đầu Tiên

### 1. Python là gì?
Python là một ngôn ngữ lập trình bậc cao, thông dịch, hướng đối tượng và cực kỳ dễ học. Cú pháp của Python rất gần gũi với tiếng Anh tự nhiên.

### 2. Hàm \`print()\` - Xuất dữ liệu ra màn hình
Để in bất kỳ thông điệp nào ra màn hình (Terminal), ta dùng hàm \`print()\`.

\`\`\`python
print("Xin chào các bạn học sinh!")
print("Chào mừng đến với Sublime Text Python IDE!")
\`\`\`

### 3. Quy tắc viết code trong Python
- Không dùng dấu chấm phẩy \`;\` ở cuối dòng như C/C++ hay Java.
- Phân biệt chữ hoa và chữ thường (\`print\` khác \`Print\`).
- Chuỗi ký tự đặt trong cặp nháy kép \`"..."\` hoặc nháy đơn \`'...' \`.
        `,
        sampleCode: `# Bài 1: Lệnh in đầu tiên trong Python
print("Hello, World!")
print("Chào bạn đến với khóa học Python cơ bản!")
print("Code chạy trực tiếp bằng Sublime Text trên điện thoại 🚀")
`,
        practice: {
          title: "Thử thách 1: In thông tin cá nhân",
          description: "Hãy viết chương trình in ra 2 dòng:\n- Dòng 1: In 'Toi la hoc sinh lap trinh'\n- Dòng 2: In 'Python that la de hoc!'",
          initialCode: `# Viết code của bạn ở bên dưới:
`,
          testCases: [
            {
              input: "",
              expected: "Toi la hoc sinh lap trinh\nPython that la de hoc!"
            }
          ],
          hint: "Sử dụng 2 lệnh print() liên tiếp."
        }
      },
      {
        id: "bai-02",
        title: "Bài 2: Biến (Variables) và Khởi tạo dữ liệu",
        duration: "7 phút",
        theory: `
# Bài 2: Biến Trong Python

### 1. Biến là gì?
Biến (variable) giống như một chiếc hộp có dán nhãn dùng để lưu trữ dữ liệu trong bộ nhớ máy tính.

### 2. Khai báo biến
Trong Python, bạn **không cần khai báo kiểu dữ liệu** trước. Chỉ cần gán giá trị bằng dấu bằng \`=\`:

\`\`\`python
ten = "Nguyen Van A"   # Kiểu chuỗi (str)
tuoi = 15              # Kiểu số nguyên (int)
diem_tb = 8.5          # Kiểu số thực (float)
da_nop_bai = True      # Kiểu đúng/sai (bool)
\`\`\`

### 3. Quy tắc đặt tên biến
- Bắt đầu bằng chữ cái hoặc dấu gạch dưới \`_\`.
- Không bắt đầu bằng số.
- Không chứa khoảng trắng hoặc ký tự đặc biệt (\`@\`, \`#\`, \`-\`...).
- Nên dùng kiểu \`snake_case\` (ví dụ: \`ten_hoc_sinh\`, \`diem_toan\`).
        `,
        sampleCode: `# Khởi tạo các biến lưu trữ thông tin
ten = "Minh Khang"
lop = "10A1"
diem_toan = 9
diem_tin = 10

# In ra màn hình kết hợp biến
print("Học sinh:", ten)
print("Lớp:", lop)
print("Tổng điểm:", diem_toan + diem_tin)
`,
        practice: {
          title: "Thử thách 2: Tính chu vi hình chữ nhật",
          description: "Khai báo 2 biến: `chieu_dai = 10` và `chieu_rong = 6`. Tính chu vi (bằng `(chieu_dai + chieu_rong) * 2`) và in ra màn hình đúng số chu vi đó.",
          initialCode: `# Khai báo chiều dài và chiều rộng
chieu_dai = 10
chieu_rong = 6

# Tính chu vi và in ra:
`,
          testCases: [
            {
              input: "",
              expected: "32"
            }
          ],
          hint: "Dùng công thức chu_vi = (chieu_dai + chieu_rong) * 2 và print(chu_vi)"
        }
      },
      {
        id: "bai-03",
        title: "Bài 3: Các Phép Toán Cơ Bản Trong Python",
        duration: "6 phút",
        theory: `
# Bài 3: Các Phép Toán Trong Python

Python cung cấp đầy đủ các toán tử số học:

| Toán tử | Ý nghĩa | Ví dụ | Kết quả |
|:---:|:---|:---|:---:|
| \`+\` | Cộng | \`7 + 3\` | \`10\` |
| \`-\` | Trừ | \`10 - 4\` | \`6\` |
| \`*\` | Nhân | \`5 * 3\` | \`15\` |
| \`/\` | Chia thực | \`7 / 2\` | \`3.5\` |
| \`//\` | Chia lấy phần nguyên | \`7 // 2\` | \`3\` |
| \`%\` | Chia lấy phần dư (Modulus) | \`7 % 2\` | \`1\` |
| \`**\` | Lũy thừa (Số mũ) | \`2 ** 3\` | \`8\` |

### Thứ tự ưu tiên toán tử:
Ngoặc tròn \`()\` ➔ Lũy thừa \`**\` ➔ Nhân/Chia \`*\`, \`/\`, \`//\`, \`%\` ➔ Cộng/Trừ \`+\`, \`-\`.
        `,
        sampleCode: `a = 17
b = 5

print("a + b =", a + b)
print("Chia thực:", a / b)
print("Chia nguyên:", a // b)
print("Chia lấy dư:", a % b)
print("Lũy thừa 2^4 =", 2 ** 4)
`,
        practice: {
          title: "Thử thách 3: Tìm phần dư và phần nguyên",
          description: "Cho số 47 chiếc kẹo chia đều cho 5 bạn học sinh. Hãy in ra 2 dòng:\n- Dòng 1: Mỗi bạn nhận được bao nhiêu kẹo (phần nguyên của 47 chia 5)\n- Dòng 2: Còn thừa lại bao nhiêu kẹo (phần dư của 47 chia 5)",
          initialCode: `so_keo = 47
so_ban = 5

# Dòng 1: In số kẹo mỗi bạn nhận được

# Dòng 2: In số kẹo còn dư

`,
          testCases: [
            {
              input: "",
              expected: "9\n2"
            }
          ],
          hint: "Dùng // để chia lấy nguyên và % để chia lấy dư."
        }
      },
      {
        id: "bai-04",
        title: "Bài 4: Nhập dữ liệu với hàm input()",
        duration: "8 phút",
        theory: `
# Bài 4: Nhập Dữ Liệu Bằng input()

### 1. Hàm \`input()\` là gì?
Hàm \`input()\` tạm dừng chương trình và chờ người dùng nhập dữ liệu từ bàn phím.

\`\`\`python
ten = input("Nhập tên bạn: ")
print("Chào mừng", ten)
\`\`\`

> ⚠️ **LƯU Ý CỰC KỲ QUAN TRỌNG:**
> Mọi dữ liệu do \`input()\` trả về **luôn luôn là kiểu Chuỗi (String)**!
> Nếu muốn tính toán số học, bạn BẮT BUỘC phải ép kiểu sang số nguyên \`int()\` hoặc số thực \`float()\`.

\`\`\`python
# Cách chuyển chuỗi thành số:
tuoi = int(input("Nhập tuổi của bạn: "))
diem = float(input("Nhập điểm thi: "))
\`\`\`
        `,
        sampleCode: `# Nhập tên và tuổi từ người dùng
ten = input("Nhập họ và tên: ")
nam_sinh = int(input("Nhập năm sinh của bạn: "))

tuoi = 2026 - nam_sinh
print(f"Xin chào {ten}! Năm nay bạn {tuoi} tuổi.")
`,
        practice: {
          title: "Thử thách 4: Tính gấp đôi một số",
          description: "Nhập một số nguyên `n` từ bàn phím bằng `input()`. Tính và in ra kết quả số đó nhân đôi (`n * 2`).",
          initialCode: `# Nhập số nguyên n và in ra kết quả n * 2:
`,
          testCases: [
            {
              input: "8",
              expected: "16"
            },
            {
              input: "25",
              expected: "50"
            }
          ],
          hint: "Nhớ ép kiểu bằng int(input()) trước khi nhân 2."
        }
      }
    ]
  },
  {
    id: "module-2",
    title: "Chương 2: Xử Lý Chuỗi & Cấu Trúc Dữ Liệu",
    description: "Khám phá String, List, Tuple, Dictionary trong Python",
    lessons: [
      {
        id: "bai-05",
        title: "Bài 5: Chuỗi Ký Tự (String) & F-String Đỉnh Cao",
        duration: "8 phút",
        theory: `
# Bài 5: Xử Lý Chuỗi Trong Python

### 1. Nối chuỗi và độ dài chuỗi \`len()\`
\`\`\`python
s = "Hoc Python"
print(len(s)) # Trả về 10 ký tự
\`\`\`

### 2. Các phương thức chuỗi hữu ích:
- \`.upper()\`: Chuyển thành chữ IN HOA.
- \`.lower()\`: Chuyển thành chữ in thường.
- \`.strip()\`: Xóa khoảng trắng thừa ở 2 đầu.
- \`.replace(old, new)\`: Thay thế chuỗi con.

### 3. F-string (Formatting String thần thánh)
Thêm chữ \`f\` trước dấu ngoặc kép và đặt tên biến trong cặp ngoặc nhọn \`{...}\`:
\`\`\`python
ten = "Bình"
lop = "10B"
print(f"Học sinh {ten} học lớp {lop}")
\`\`\`
        `,
        sampleCode: `loi_chao = "  xin chao cac ban  "

# Làm sạch chuỗi và in hoa
chuan_hoa = loi_chao.strip().capitalize()
print("Chuỗi chuẩn hóa:", chuan_hoa)

mon_hoc = "Python"
so_bai = 35
print(f"Khóa học {mon_hoc} có tổng cộng {so_bai} bài giảng.")
`,
        practice: {
          title: "Thử thách 5: Chuẩn hóa tên",
          description: "Nhập một chuỗi từ bàn phím, in ra phiên bản VIẾT HOA toàn bộ của chuỗi đó.",
          initialCode: `# Nhập chuỗi và in ra chữ hoa:
`,
          testCases: [
            {
              input: "python hoc rat vui",
              expected: "PYTHON HOC RAT VUI"
            }
          ],
          hint: "Dùng phương thức .upper()"
        }
      },
      {
        id: "bai-06",
        title: "Bài 6: Danh Sách (List) - Chiếc Hộp Đa Năng",
        duration: "10 phút",
        theory: `
# Bài 6: Danh Sách (List)

List là tập hợp các phần tử có thứ tự và có thể thay đổi được (mutable). Được định nghĩa bằng cặp ngoặc vuông \`[ ]\`.

\`\`\`python
danh_sach = ["Táo", "Cam", "Xoài", "Chuối"]
\`\`\`

### 1. Chỉ số (Index) trong List:
- Phần tử đầu tiên có index là \`0\`: \`danh_sach[0]\` ➔ \`"Táo"\`.
- Phần tử cuối cùng có index là \`-1\`: \`danh_sach[-1]\` ➔ \`"Chuối"\`.

### 2. Thao tác với List:
- Thêm phần tử vào cuối: \`danh_sach.append("Dưa hấu")\`
- Xóa phần tử: \`danh_sach.remove("Cam")\`
- Độ dài danh sách: \`len(danh_sach)\`
        `,
        sampleCode: `# Danh sách các môn học
mon_hoc = ["Toán", "Văn", "Anh"]
print("Danh sách ban đầu:", mon_hoc)

# Thêm môn Tin học
mon_hoc.append("Tin học")
print("Sau khi thêm:", mon_hoc)
print("Môn đầu tiên là:", mon_hoc[0])
print("Số lượng môn:", len(mon_hoc))
`,
        practice: {
          title: "Thử thách 6: Thêm và in phần tử cuối",
          description: "Tạo một list có sẵn `trai_cay = ['Tao', 'Cam', 'Xoai']`. Thêm phần tử `'Nho'` vào cuối list, sau đó in ra phần tử cuối cùng của list.",
          initialCode: `trai_cay = ['Tao', 'Cam', 'Xoai']
# Thêm 'Nho' vào list và in ra phần tử cuối cùng:

`,
          testCases: [
            {
              input: "",
              expected: "Nho"
            }
          ],
          hint: "Dùng trai_cay.append('Nho') và print(trai_cay[-1])"
        }
      },
      {
        id: "bai-07",
        title: "Bài 7: Từ Điển (Dictionary) - Cặp Key & Value",
        duration: "9 phút",
        theory: `
# Bài 7: Dictionary Trong Python

Dictionary lưu trữ dữ liệu theo cặp **Khóa (Key) : Giá trị (Value)**, được bao quanh bởi cặp ngoặc nhọn \`{ }\`.

\`\`\`python
hoc_sinh = {
    "ten": "Lê Văn B",
    "tuoi": 16,
    "diem": 9.2
}

# Truy xuất giá trị bằng key:
print(hoc_sinh["ten"])  # In ra: Lê Văn B
\`\`\`

### Thao tác cơ bản:
- Thêm hoặc sửa: \`hoc_sinh["lop"] = "10C"\`
- Kiểm tra key có tồn tại: \`"tuoi" in hoc_sinh\`
        `,
        sampleCode: `thong_tin = {
    "ten": "Quốc Anh",
    "lop": "11A3",
    "ngon_ngu": "Python"
}

# In thông tin
print(f"Học sinh: {thong_tin['ten']}")
print(f"Đang học: {thong_tin['ngon_ngu']}")

# Cập nhật điểm số
thong_tin["diem"] = 9.8
print("Dữ liệu sau khi cập nhật:", thong_tin)
`,
        practice: {
          title: "Thử thách 7: Truy xuất điểm thi",
          description: "Cho từ điển `bang_diem = {'Toan': 9, 'Van': 8, 'Anh': 10}`. Hãy in ra điểm môn `'Toan'`.",
          initialCode: `bang_diem = {'Toan': 9, 'Van': 8, 'Anh': 10}
# In điểm môn Toán:

`,
          testCases: [
            {
              input: "",
              expected: "9"
            }
          ],
          hint: "Dùng print(bang_diem['Toan'])"
        }
      }
    ]
  },
  {
    id: "module-3",
    title: "Chương 3: Cấu Trúc Điều Khiển & Vòng Lặp",
    description: "Làm chủ khối lệnh điều kiện if-else, vòng lặp for và while",
    lessons: [
      {
        id: "bai-08",
        title: "Bài 8: Khối Lệnh Rẽ Nhánh If - Elif - Else",
        duration: "10 phút",
        theory: `
# Bài 8: Câu Lệnh Điều Kiện If - Elif - Else

Python dùng điều kiện để đưa ra quyết định thực thi mã nguồn.

### Cú pháp:
\`\`\`python
if dieu_kien_1:
    # Khối lệnh thụt vào 4 khoảng trắng (Indent)
    xu_ly_1()
elif dieu_kien_2:
    xu_ly_2()
else:
    xu_ly_khi_tat_ca_sai()
\`\`\`

> 🚨 **QUY TẮC THỤT DÒNG (INDENTATION) CỦA PYTHON:**
> Python KHÔNG dùng \`{ }\` để bao hàm khối lệnh như C/Java, mà dùng **4 dấu khoảng trắng (phím Tab)**. Tất cả câu lệnh cùng cấp phải thẳng hàng!
        `,
        sampleCode: `diem = 8.5

if diem >= 8.0:
    print("Xếp loại: Giỏi")
elif diem >= 6.5:
    print("Xếp loại: Khá")
elif diem >= 5.0:
    print("Xếp loại: Trung bình")
else:
    print("Xếp loại: Cần cố gắng thêm!")
`,
        practice: {
          title: "Thử thách 8: Kiểm tra số chẵn hay lẻ",
          description: "Nhập một số nguyên `n` từ bàn phím. Nếu là số chẵn, in ra `CHAN`, ngược lại in ra `LE`.",
          initialCode: `# Nhập n và kiểm tra chẵn hay lẻ:
`,
          testCases: [
            {
              input: "8",
              expected: "CHAN"
            },
            {
              input: "15",
              expected: "LE"
            }
          ],
          hint: "Dùng toán tử chia lấy dư n % 2 == 0."
        }
      },
      {
        id: "bai-09",
        title: "Bài 9: Vòng Lặp For & Hàm range()",
        duration: "10 phút",
        theory: `
# Bài 9: Vòng Lặp For & range()

Vòng lặp \`for\` dùng để lặp qua một danh sách hoặc một chuỗi số có sẵn.

### 1. Hàm \`range(start, stop, step)\`
- \`range(5)\`: Tạo dãy từ \`0, 1, 2, 3, 4\` (dừng trước 5).
- \`range(1, 6)\`: Tạo dãy từ \`1, 2, 3, 4, 5\`.
- \`range(0, 10, 2)\`: Nhảy bước 2: \`0, 2, 4, 6, 8\`.

\`\`\`python
for i in range(1, 4):
    print(f"Lần lặp thứ {i}")
\`\`\`
        `,
        sampleCode: `# In bảng cửu chương 5
so = 5
print(f"--- Bảng nhân {so} ---")
for i in range(1, 11):
    print(f"{so} x {i} = {so * i}")
`,
        practice: {
          title: "Thử thách 9: Tính tổng từ 1 đến N",
          description: "Nhập một số nguyên `n` từ bàn phím. Tính tổng tất cả các số từ 1 đến `n` (1 + 2 + ... + n) và in ra tổng đó.",
          initialCode: `# Nhập n và tính tổng từ 1 đến n:
`,
          testCases: [
            {
              input: "5",
              expected: "15"
            },
            {
              input: "10",
              expected: "55"
            }
          ],
          hint: "Dùng biến tong = 0 và vòng lặp for i in range(1, n + 1): tong += i"
        }
      },
      {
        id: "bai-10",
        title: "Bài 10: Vòng Lặp While & Break / Continue",
        duration: "8 phút",
        theory: `
# Bài 10: Vòng Lặp While

Vòng lặp \`while\` tiếp tục chạy chừng nào điều kiện còn là \`True\`.

\`\`\`python
dem = 1
while dem <= 3:
    print(dem)
    dem += 1
\`\`\`

- \`break\`: Lập tức thoát khỏi vòng lặp.
- \`continue\`: Bỏ qua các lệnh còn lại của vòng hiện tại và nhảy sang vòng kế tiếp.
        `,
        sampleCode: `dem = 5
while dem > 0:
    print(f"Đếm ngược: {dem}")
    dem -= 1

print("Phóng tên lửa! 🚀")
`,
        practice: {
          title: "Thử thách 10: In các số từ 1 đến 5 bằng while",
          description: "Sử dụng vòng lặp `while` để in các số từ 1 đến 5 (mỗi số trên 1 dòng).",
          initialCode: `# Viết vòng lặp while in từ 1 đến 5:
`,
          testCases: [
            {
              input: "",
              expected: "1\n2\n3\n4\n5"
            }
          ],
          hint: "Khởi tạo i = 1, lặp while i <= 5: in i và tăng i += 1."
        }
      }
    ]
  },
  {
    id: "module-4",
    title: "Chương 4: Xây Dựng Hàm (Functions)",
    description: "Tổ chức code tái sử dụng với def, return và thư viện có sẵn",
    lessons: [
      {
        id: "bai-11",
        title: "Bài 11: Định Nghĩa Hàm Với Từ Khóa def",
        duration: "10 phút",
        theory: `
# Bài 11: Hàm (Functions) Trong Python

Hàm là một khối lệnh được đặt tên để tái sử dụng nhiều lần mà không cần viết lại mã nguồn.

### Cú pháp:
\`\`\`python
def ten_ham(tham_so1, tham_so2):
    # Khối lệnh
    ket_qua = tham_so1 + tham_so2
    return ket_qua

# Gọi hàm:
tong = ten_ham(5, 7)
print(tong) # 12
\`\`\`
        `,
        sampleCode: `def tinh_dien_tich_hcn(dai, rong):
    return dai * rong

d = 8
r = 5
dt = tinh_dien_tich_hcn(d, r)
print(f"Diện tích hình chữ nhật ({d}x{r}) là: {dt}")
`,
        practice: {
          title: "Thử thách 11: Hàm tìm số lớn hơn",
          description: "Viết hàm `so_lon_nhat(a, b)` trả về số lớn nhất giữa 2 số `a` và `b`. Sau đó gọi hàm với 2 số 15 và 28 rồi in kết quả ra màn hình.",
          initialCode: `def so_lon_nhat(a, b):
    # Trả về số lớn hơn:
    pass

# Gọi hàm với 15, 28 và in ra màn hình:
`,
          testCases: [
            {
              input: "",
              expected: "28"
            }
          ],
          hint: "Dùng if a > b: return a else: return b"
        }
      }
    ]
  }
];
