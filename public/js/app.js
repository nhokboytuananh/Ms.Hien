/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// URL gốc của backend API (Khi chạy cùng domain/port, có thể bỏ trống hoặc chỉ định relative path)
const API_BASE = "";

// Khởi tạo trạng thái toàn cục của ứng dụng
window.appState = {
  token: localStorage.getItem("ms_hien_token") || null,
  user: null,
  activeTab: null,
};

// Hàm tiện ích thực hiện gọi API kèm Token tự động
window.apiFetch = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(window.appState.token
      ? { Authorization: `Bearer ${window.appState.token}` }
      : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error(
      `Lỗi kết nối mạng đến ${API_BASE}${endpoint}: ` + err.message,
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(
      `Lỗi phân tích JSON từ server (${response.status} ${response.statusText}). Endpoint: ${API_BASE}${endpoint}`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (
        data?.force_logout ||
        data?.error?.includes("hết hạn") ||
        data?.error?.includes("tồn tại")
      ) {
        window.logout();
      }
    }
    throw new Error(
      data?.error || data?.message || "Đã xảy ra lỗi khi kết nối máy chủ.",
    );
  }
  return data;
};

// Hàm hiển thị hộp thoại xác nhận tuỳ chỉnh (Custom Confirm Dialog)
window.showConfirm = (options = {}) => {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-confirm-modal");
    if (!modal) {
      resolve(confirm(options.message || "Bạn có chắc chắn không?"));
      return;
    }

    const titleEl = document.getElementById("confirm-title");
    const msgEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");
    const iconContainer = document.getElementById("confirm-icon-container");

    titleEl.textContent = options.title || "Xác nhận hành động";
    msgEl.textContent =
      options.message || "Bạn có chắc chắn muốn thực hiện hành động này không?";

    if (options.type === "danger") {
      iconContainer.className = "p-2 bg-rose-50 text-rose-600 rounded-xl";
      iconContainer.innerHTML =
        '<i data-lucide="alert-triangle" class="w-6 h-6"></i>';
      okBtn.className =
        "px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer";
    } else {
      iconContainer.className = "p-2 bg-brand-50 text-brand-600 rounded-xl";
      iconContainer.innerHTML =
        '<i data-lucide="help-circle" class="w-6 h-6"></i>';
      okBtn.className =
        "px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer";
    }

    if (typeof lucide !== "undefined") lucide.createIcons();

    const cleanup = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    };

    okBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  });
};

// Hàm hiển thị thông báo alert cho biểu mẫu đăng nhập/ký
function showAuthAlert(message, type = "error") {
  const alertEl = document.getElementById("auth-alert");
  alertEl.textContent = message;
  alertEl.className = `p-4 mb-4 rounded-lg text-sm font-semibold text-center ${
    type === "error"
      ? "bg-rose-100 text-rose-800 border border-rose-200"
      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
  }`;
  alertEl.classList.remove("hidden");
}

// Khởi tạo các sự kiện khi trang web tải xong
document.addEventListener("DOMContentLoaded", async () => {
  // Lấy các icon từ Lucide
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // Gán sự kiện chuyển Tab đăng nhập/ký
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Hàm tải danh sách lớp học công khai cho dropdown đăng ký
  async function loadPublicClasses() {
    const regClassSelect = document.getElementById("reg-class");
    if (!regClassSelect) return;
    try {
      const classes = await apiFetch("/api/auth/public-classes");

      regClassSelect.innerHTML = "";
      if (classes.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Chưa có lớp học nào được tạo bởi giáo viên";
        regClassSelect.appendChild(opt);
      } else {
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "-- Chọn lớp học của bạn --";
        regClassSelect.appendChild(defaultOpt);

        classes.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.name;
          opt.textContent = `Lớp ${c.name} (Niên khóa ${c.school_year || "2025-2026"})`;
          regClassSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Lỗi tải lớp:", err);
      regClassSelect.innerHTML =
        '<option value="">-- Lỗi tải lớp, vui lòng thử lại --</option>';
    }
  }

  // Tải danh sách lớp khi bắt đầu và khi click vào Tab Đăng ký
  loadPublicClasses();

  tabLogin.addEventListener("click", () => {
    tabLogin.className =
      "flex-1 pb-3 text-center font-semibold text-brand-600 border-b-2 border-brand-600 focus:outline-none";
    tabRegister.className =
      "flex-1 pb-3 text-center font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-600 focus:outline-none";
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.className =
      "flex-1 pb-3 text-center font-semibold text-brand-600 border-b-2 border-brand-600 focus:outline-none";
    tabLogin.className =
      "flex-1 pb-3 text-center font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-600 focus:outline-none";
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    loadPublicClasses(); // Gọi lại khi chuyển tab đăng ký để cập nhật mới nhất
  });

  // Tự động kiểm tra xem có lớp tương ứng không khi chuyển đổi vai trò ở đăng ký
  const regRole = document.getElementById("reg-role");
  const regClassContainer = document.getElementById("reg-class-container");
  regRole.addEventListener("change", () => {
    if (regRole.value === "teacher") {
      regClassContainer.classList.add("hidden");
    } else {
      regClassContainer.classList.remove("hidden");
    }
  });

  // Sự kiện Gửi Form Đăng Ký
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const role = regRole.value;
    const class_name =
      role === "student"
        ? document.getElementById("reg-class").value.trim()
        : null;

    if (role === "student" && !class_name) {
      showAuthAlert(
        "Vui lòng chọn một lớp học do Giáo viên đã lập sẵn!",
        "error",
      );
      return;
    }

    try {
      const data = await window.apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ full_name, email, password, role, class_name }),
      });
      showAuthAlert(data.message, "success");
      registerForm.reset();
      // Nhảy về tab Đăng nhập
      tabLogin.click();
    } catch (err) {
      showAuthAlert(err.message, "error");
    }
  });

  // Sự kiện Gửi Form Đăng Nhập
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const data = await window.apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Lưu token vào localStorage
      localStorage.setItem("ms_hien_token", data.token);
      window.appState.token = data.token;
      window.appState.user = data.user;

      // Đăng nhập thành công, khởi động dashboard
      await initDashboard();
    } catch (err) {
      showAuthAlert(err.message, "error");
    }
  });

  // Đăng xuất toàn cục
  window.logout = () => {
    localStorage.removeItem("ms_hien_token");
    window.appState.token = null;
    window.appState.user = null;
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
    document.getElementById("auth-alert").classList.add("hidden");

    // Clear intervals if any
    if (window.studentState?.examTimerInterval) {
      clearInterval(window.studentState.examTimerInterval);
    }
  };

  // Nút đăng xuất
  document.getElementById("btn-logout").addEventListener("click", () => {
    window.logout();
  });

  // Kiểm tra phiên đăng nhập hiện tại khi load trang
  if (window.appState.token) {
    try {
      const data = await window.apiFetch("/api/auth/me");
      window.appState.user = data.user;
      await initDashboard();
    } catch (err) {
      // Token hết hạn
      localStorage.removeItem("ms_hien_token");
      window.appState.token = null;
    }
  }

  // Tạo liên kết đăng nhập nhanh cho các button trong UI
  window.quickLogin = async (email, password) => {
    document.getElementById("login-email").value = email;
    document.getElementById("login-password").value = password;
    loginForm.dispatchEvent(new Event("submit"));
  };
});

// Khởi chạy giao diện chính sau khi đăng nhập thành công
async function initDashboard() {
  const user = window.appState.user;

  // 1. Ẩn màn hình Đăng nhập, hiện màn hình chính
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");

  // 2. Điền thông tin cá nhân lên Header
  document.getElementById("user-display-name").textContent = user.full_name;

  const roleBadge = document.getElementById("role-badge");
  const userDisplayDetail = document.getElementById("user-display-detail");

  if (user.role === "teacher") {
    roleBadge.textContent = "Giáo Viên";
    roleBadge.className =
      "ml-2 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-100 text-brand-700 uppercase tracking-wider";
    userDisplayDetail.textContent = "Tài khoản quản lý sư phạm";

    // Hiển thị Menu Giáo viên, ẩn Menu Học sinh
    document.getElementById("teacher-menu-header").classList.remove("hidden");
    document.getElementById("teacher-nav").classList.remove("hidden");
    document.getElementById("student-menu-header").classList.add("hidden");
    document.getElementById("student-nav").classList.add("hidden");

    // Load thư viện kịch bản cho Giáo Viên dán lên Window
    import(`./teacher.js?t=${Date.now()}`).then((module) => {
      // Đăng ký sự kiện click tab
      setupTabListeners("teacher-nav", "view-t-classes");
    });
  } else {
    roleBadge.textContent = `Học Sinh • Lớp ${user.class_name}`;
    roleBadge.className =
      "ml-2 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider";
    userDisplayDetail.textContent = `Học sinh lớp ${user.class_name}`;

    // Hiển thị Menu Học sinh, ẩn Menu Giáo viên
    document.getElementById("student-menu-header").classList.remove("hidden");
    document.getElementById("student-nav").classList.remove("hidden");
    document.getElementById("teacher-menu-header").classList.add("hidden");
    document.getElementById("teacher-nav").classList.add("hidden");

    // Load thư viện kịch bản cho Học Sinh dán lên Window
    import(`./student.js?t=${Date.now()}`).then((module) => {
      // Đăng ký sự kiện click tab học sinh
      setupTabListeners("student-nav", "view-s-exams");
    });
  }

  // Tải lại Lucide Icons để cập nhật các Icon mới vẽ
  if (typeof lucide !== "undefined") {
    setTimeout(() => lucide.createIcons(), 100);
  }
}

// Thiết lập sự kiện click và kích hoạt Tab tương ứng
function setupTabListeners(navContainerId, defaultTabId) {
  const container = document.getElementById(navContainerId);
  const buttons = container.querySelectorAll("[data-tab]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");

      // Bỏ hoạt động của tất cả các nút cùng nhóm
      buttons.forEach((b) => {
        b.classList.remove(
          "bg-brand-50",
          "text-brand-700",
          "bg-brand-500/10",
          "text-brand-400",
          "font-bold",
        );
        b.classList.add("text-slate-400");
      });

      // Kích hoạt nút được bấm
      btn.classList.add("bg-brand-500/10", "text-brand-400", "font-bold");
      btn.classList.remove("text-slate-400");

      // Ẩn tất cả các màn hình tab_view
      document.querySelectorAll(".tab-view").forEach((view) => {
        view.classList.add("hidden");
      });

      // Hiện màn hình tương ứng
      const targetView = document.getElementById(`view-${tabName}`);
      if (targetView) {
        targetView.classList.remove("hidden");

        // Gọi hàm tự động load dữ liệu đặc thù của Tab đó nếu có
        triggerTabLoadData(tabName);
      }
    });
  });

  // Click chọn tab đầu tiên theo mặc định
  const defaultBtn = container.querySelector(
    `[data-tab="${defaultTabId.replace("view-", "")}"]`,
  );
  if (defaultBtn) {
    defaultBtn.click();
  }
}

// Hàm kích hoạt lệnh tải dữ liệu chuyên sâu cho từng màn hình
function triggerTabLoadData(tabName) {
  // GIÁO VIÊN
  if (
    tabName === "t-classes" &&
    typeof window.loadTeacherClasses === "function"
  ) {
    window.loadTeacherClasses();
  }
  if (
    tabName === "t-vocab" &&
    typeof window.loadTeacherVocabulary === "function"
  ) {
    window.loadTeacherVocabulary();
  }
  if (tabName === "t-exams" && typeof window.loadTeacherExams === "function") {
    window.loadTeacherExams();
  }
  if (tabName === "t-qna" && typeof window.loadTeacherQna === "function") {
    window.loadTeacherQna();
  }
  if (
    tabName === "t-materials" &&
    typeof window.loadTeacherMaterials === "function"
  ) {
    window.loadTeacherMaterials();
  }

  // HỌC SINH
  if (tabName === "s-vocab") {
    if (typeof window.loadStudentVocabulary === "function")
      window.loadStudentVocabulary();
    if (typeof window.loadGameLeaderboards === "function")
      window.loadGameLeaderboards();
  }
  if (tabName === "s-exams" && typeof window.loadStudentExams === "function") {
    window.loadStudentExams();
  }
  if (tabName === "s-chat" && typeof window.loadStudentQna === "function") {
    window.loadStudentQna();
  }
  if (
    tabName === "s-materials" &&
    typeof window.loadStudentMaterials === "function"
  ) {
    window.loadStudentMaterials();
  }
}

// Quản lý Modal Quên mật khẩu
window.openForgotPasswordModal = () => {
  const modal = document.getElementById("forgot-password-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.getElementById("forgot-email").value = "";
    document.getElementById("forgot-result-box").classList.add("hidden");
    document.getElementById("forgot-submit-btn").classList.remove("hidden");
  }
};

window.closeForgotPasswordModal = () => {
  const modal = document.getElementById("forgot-password-modal");
  if (modal) modal.classList.add("hidden");
};

// Quản lý Modal Đổi mật khẩu
window.openChangePasswordModal = () => {
  const modal = document.getElementById("change-password-modal");
  if (modal) {
    modal.classList.remove("hidden");
    const form = document.getElementById("change-password-form");
    if (form) form.reset();
  }
};

window.closeChangePasswordModal = () => {
  const modal = document.getElementById("change-password-modal");
  if (modal) modal.classList.add("hidden");
};

window.togglePasswordVisibility = (inputId, btn) => {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    if (icon) {
      icon.setAttribute("data-lucide", "eye-off");
      if (window.lucide) window.lucide.createIcons();
    }
  } else {
    input.type = "password";
    if (icon) {
      icon.setAttribute("data-lucide", "eye");
      if (window.lucide) window.lucide.createIcons();
    }
  }
};

// Đăng ký sự kiện submit form Quên mật khẩu & Đổi mật khẩu khi khởi chạy
document.addEventListener("DOMContentLoaded", () => {
  const forgotForm = document.getElementById("forgot-password-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value.trim();
      try {
        const res = await window.apiFetch("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });

        // Hiển thị kết quả khôi phục mật khẩu mới trực tiếp lên form để demo thuận lợi
        const resultBox = document.getElementById("forgot-result-box");
        const pwdDisplay = document.getElementById("forgot-new-pwd-display");
        const submitBtn = document.getElementById("forgot-submit-btn");

        pwdDisplay.textContent = res.new_password_demo;
        resultBox.classList.remove("hidden");
        submitBtn.classList.add("hidden");
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    });
  }

  const changeForm = document.getElementById("change-password-form");
  if (changeForm) {
    changeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword =
        document.getElementById("change-current-pwd").value;
      const newPassword = document.getElementById("change-new-pwd").value;
      const confirmPassword =
        document.getElementById("change-confirm-pwd").value;

      if (newPassword !== confirmPassword) {
        alert("Mật khẩu mới và mật khẩu xác nhận không trùng khớp!");
        return;
      }

      try {
        const res = await window.apiFetch("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        alert(res.message || "Cập nhật mật khẩu mới thành công!");
        window.closeChangePasswordModal();
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    });
  }
});

// BẢNG XẾP HẠNG ĐỀ THI (DÙNG CHUNG - CHỈ HIỆN TOP 5)
window.showExamLeaderboard = async (examId, examTitle) => {
  const modal = document.getElementById("exam-leaderboard-modal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("leaderboard-modal-title").textContent =
    `Bảng Xếp Hạng Kỷ Lục (Top 5): ${examTitle || "Thi Thử"}`;

  const tbody = document.getElementById("modal-leaderboard-tbody");
  tbody.innerHTML =
    '<tr><td colspan="6" class="py-6 text-center text-slate-400">Đang tải bảng xếp hạng...</td></tr>';

  try {
    const leaderboard = await window.apiFetch(
      `/api/exams/${examId}/leaderboard`,
    );
    tbody.innerHTML = "";

    const top5 = leaderboard.slice(0, 5);

    if (top5.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="py-6 text-center text-slate-400">Chưa có học sinh nào hoàn thành đề thi này để xếp hạng.</td></tr>';
      return;
    }

    top5.forEach((item, index) => {
      let rankBadge = "";
      if (index === 0) {
        rankBadge =
          '<span class="flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-full font-bold mx-auto text-xs">🥇</span>';
      } else if (index === 1) {
        rankBadge =
          '<span class="flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-700 rounded-full font-bold mx-auto text-xs">🥈</span>';
      } else if (index === 2) {
        rankBadge =
          '<span class="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-700 rounded-full font-bold mx-auto text-xs">🥉</span>';
      } else {
        rankBadge = `<span class="flex items-center justify-center w-6 h-6 bg-slate-50 text-slate-500 rounded-full font-bold mx-auto text-xs">${index + 1}</span>`;
      }

      const mins = Math.floor(item.fastest_seconds / 60);
      const secs = item.fastest_seconds % 60;
      const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50/50";
      tr.innerHTML = `
        <td class="py-3 text-center">${rankBadge}</td>
        <td class="py-3 font-semibold text-slate-800">
          <div class="flex flex-col">
            <span>${item.student_name}</span>
            <span class="text-[10px] text-slate-400 font-mono font-normal">${item.student_email || ""}</span>
          </div>
        </td>
        <td class="py-3 text-slate-500 font-medium text-xs">Lớp ${item.class_name || "Tự do"}</td>
        <td class="py-3 text-center font-extrabold text-brand-600">${item.high_score}đ</td>
        <td class="py-3 text-center text-slate-500 font-mono text-xs">${timeStr}</td>
        <td class="py-3 text-center text-slate-500 font-semibold text-xs">${item.attempts_count} lần</td>
      `;
      tbody.appendChild(tr);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-rose-500">Lỗi tải bảng xếp hạng: ${err.message}</td></tr>`;
  }
};

window.closeLeaderboardModal = () => {
  const modal = document.getElementById("exam-leaderboard-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};
