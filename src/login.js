/**
 * Login Controller: Điều hướng xác thực người dùng
 * Tách biệt giữa Học sinh trường và Người dùng Google.
 */

import { adminStore } from './admin-store.js';
import { DriveSyncManager } from './drive-sync.js';

class LoginController {
  constructor() {
    this.driveSync = new DriveSyncManager();
  }

  init() {
    this.bindTabs();
    this.bindSchoolLogin();
    this.bindGoogleLogin();

    // Nếu đã đăng nhập rồi, tự động chuyển về trang chủ hoặc thông báo
    const current = adminStore.getCurrentUser();
    if (current) {
      console.log("Đã có phiên đăng nhập:", current);
    }
  }

  showError(msg) {
    const box = document.getElementById('login-error-msg');
    if (!box) return;
    box.textContent = msg;
    box.style.display = 'flex';
  }

  clearError() {
    const box = document.getElementById('login-error-msg');
    if (box) box.style.display = 'none';
  }

  bindTabs() {
    const tabs = document.querySelectorAll('.auth-tab-btn');
    const panels = document.querySelectorAll('.auth-panel');

    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        this.clearError();
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.dataset.target;
        panels.forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  bindSchoolLogin() {
    const form = document.getElementById('form-school-login');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearError();

      const username = document.getElementById('input-school-username').value.trim();
      const password = document.getElementById('input-school-password').value.trim();
      const btn = document.getElementById('btn-submit-school');

      if (!username || !password) {
        this.showError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Đang xác thực...</span>';

      try {
        // 1. Xác thực trong danh sách học sinh
        const user = adminStore.verifyStudentLogin(username, password);

        // 2. Đồng bộ hồ sơ học sinh vào DriveSync
        this.driveSync.saveStudentProfile({
          studentId: user.username,
          fullName: user.fullName,
          className: user.className
        });

        // 3. Chuyển hướng về trang học tập
        window.location.href = '/';
      } catch (err) {
        this.showError(err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔑 Đăng Nhập Học Sinh</span>';
      }
    });
  }

  bindGoogleLogin() {
    const btnGoogle = document.getElementById('btn-google-signin');
    const modal = document.getElementById('modal-google-auth');
    const btnCancel = document.getElementById('btn-cancel-google');
    const btnConfirm = document.getElementById('btn-confirm-google');

    if (btnGoogle && modal) {
      btnGoogle.addEventListener('click', () => {
        modal.classList.add('show');
      });
    }

    if (btnCancel && modal) {
      btnCancel.addEventListener('click', () => {
        modal.classList.remove('show');
      });
    }

    if (btnConfirm && modal) {
      btnConfirm.addEventListener('click', async () => {
        const name = document.getElementById('input-google-name').value.trim();
        const email = document.getElementById('input-google-email').value.trim();

        if (!name || !email) {
          alert("Vui lòng nhập họ tên và email Google!");
          return;
        }

        btnConfirm.disabled = true;
        btnConfirm.textContent = "Đang xử lý...";

        const profile = {
          email: email,
          fullName: name,
          googleId: 'G-' + Date.now().toString().slice(-6),
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`
        };

        // 1. Lưu vào danh sách Google Users
        adminStore.addOrUpdateGoogleUser(profile);

        // 2. Thiết lập phiên đăng nhập
        const sessionUser = {
          type: 'google',
          username: email,
          email: email,
          fullName: name,
          className: 'Người dùng Google',
          avatar: profile.avatar,
          loginAt: new Date().toISOString()
        };
        adminStore.setCurrentUser(sessionUser);

        // 3. Đồng bộ hồ sơ học sinh
        this.driveSync.saveStudentProfile({
          studentId: email,
          fullName: name,
          className: 'Google Account'
        });

        // 4. Nếu Drive đã kết nối, gửi lên Google Sheet trong nền
        if (this.driveSync.isConnected()) {
          try {
            fetch(this.driveSync.getApiUrl(), {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'sync_google_user',
                profile: profile
              })
            }).catch(() => {});
          } catch (e) {}
        }

        modal.classList.remove('show');
        window.location.href = '/';
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const login = new LoginController();
  login.init();
});
