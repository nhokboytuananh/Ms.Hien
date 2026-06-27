/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. QUẢN LÝ LỚP HỌC & HỌC SINH (TEACHER)
// ==========================================

window.loadTeacherClasses = async () => {
  try {
    const classes = await window.apiFetch("/api/classes");
    // Lưu danh sách lớp vào window để dễ dàng tìm kiếm ID theo tên khi cần xóa
    window.currentTeacherClasses = classes;

    const grid = document.getElementById("class-cards-grid");
    grid.innerHTML = "";

    if (classes.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-white border border-dashed rounded-2xl p-8 text-center text-slate-400">
          <i data-lucide="users" class="w-12 h-12 mx-auto text-slate-300 mb-2"></i>
          Chưa có lớp học nào. Hãy bấm "Thêm lớp mới" để bắt đầu nhé cô!
        </div>
      `;
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    // Kết xuất từng thẻ lớp học
    classes.forEach((c) => {
      const card = document.createElement("div");
      card.className =
        "bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-brand-300 relative overflow-hidden";
      card.onclick = () => selectClass(c.name);
      card.innerHTML = `
        <div class="absolute -top-6 -right-6 w-20 h-20 bg-brand-50 rounded-full blur-xl"></div>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <i data-lucide="book-open" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="font-extrabold text-slate-900 text-lg uppercase">Lớp ${c.name}</h4>
            <p class="text-xs text-slate-400">Niên khóa: ${c.school_year}</p>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span>Xem học sinh</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-brand-500"></i>
        </div>
      `;
      grid.appendChild(card);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    alert("Lỗi khi tải danh sách lớp học: " + err.message);
  }
};

// Hàm xóa lớp học
window.deleteClass = async (classId, className) => {
  const confirmDelete = confirm(
    `Cô có chắc chắn muốn xóa lớp "${className}" này không? \n\nTất cả học sinh thuộc lớp này sẽ được chuyển sang trạng thái "Tự do" (không thuộc lớp nào).`,
  );
  if (!confirmDelete) return;

  try {
    const res = await window.apiFetch(`/api/classes/${classId}`, {
      method: "DELETE",
    });
    alert(res.message || "Đã xóa lớp học thành công!");

    // Ẩn vùng danh sách học sinh
    document.getElementById("student-list-container").classList.add("hidden");

    // Tải lại danh sách lớp học
    window.loadTeacherClasses();
  } catch (err) {
    alert("Lỗi khi xóa lớp học: " + err.message);
  }
};

// Mở/Đóng Modal Thêm Lớp
window.openCreateClassModal = () => {
  document.getElementById("class-modal").classList.remove("hidden");
  document.getElementById("class-modal").classList.add("flex");
};
window.closeClassModal = () => {
  document.getElementById("class-modal").classList.add("hidden");
  document.getElementById("class-modal").classList.remove("flex");
};

// Lưu thông tin Lớp học mới
document
  .getElementById("create-class-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document
      .getElementById("class-name-input")
      .value.toUpperCase()
      .trim();
    const school_year = document.getElementById("class-year-input").value;
    const grade = document.getElementById("class-grade-input").value;

    try {
      await window.apiFetch("/api/classes", {
        method: "POST",
        body: JSON.stringify({ name, school_year, grade }),
      });
      closeClassModal();
      document.getElementById("create-class-form").reset();
      window.loadTeacherClasses();
    } catch (err) {
      alert(err.message);
    }
  });

// Xem học sinh trong Lớp học cụ thể
async function selectClass(className) {
  try {
    const students = await window.apiFetch(
      `/api/classes/${className}/students`,
    );

    document.getElementById("selected-class-title").textContent =
      `Học sinh lớp ${className}`;
    document.getElementById("selected-class-badge").textContent =
      `${students.length} Học Sinh`;

    // Gán sự kiện xóa lớp cho nút delete-class-btn
    const deleteBtn = document.getElementById("delete-class-btn");
    if (deleteBtn) {
      const currentClass = (window.currentTeacherClasses || []).find(
        (c) => c.name === className,
      );
      if (currentClass) {
        deleteBtn.style.display = "flex"; // Hiện nút xóa
        deleteBtn.onclick = () =>
          window.deleteClass(currentClass.id, className);
      } else {
        deleteBtn.style.display = "none"; // Ẩn nếu không tìm thấy thông tin lớp
      }
    }

    const tbody = document.getElementById("student-table-body");
    tbody.innerHTML = "";

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400">Chưa có học sinh nào đăng ký tham gia lớp này.</td>
        </tr>
      `;
    } else {
      students.forEach((s) => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-slate-50 hover:bg-slate-50/50";
        tr.innerHTML = `
          <td class="py-3 font-semibold text-slate-800 flex items-center gap-2">
            ${s.full_name}
            ${s.is_locked ? '<span class="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">Đã khóa</span>' : ""}
          </td>
          <td class="py-3 text-slate-500 font-mono text-xs">${s.email}</td>
          <td class="py-3 text-slate-400 text-xs">${new Date(s.created_at).toLocaleDateString("vi-VN")}</td>
          <td class="py-3 text-right">
            <div class="flex justify-end gap-2 flex-wrap">
              <button onclick="window.resetStudentPassword(${s.id}, '${s.full_name.replace(/'/g, "\\'")}', '${className}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                <i data-lucide="key-round" class="w-3.5 h-3.5"></i> Mật khẩu
              </button>
              <button onclick="window.toggleLockStudent(${s.id}, '${s.full_name.replace(/'/g, "\\'")}', ${s.is_locked}, '${className}')" class="px-2.5 py-1 ${s.is_locked ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600" : "bg-orange-50 hover:bg-orange-100 text-orange-600"} rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                <i data-lucide="${s.is_locked ? "unlock" : "lock"}" class="w-3.5 h-3.5"></i> ${s.is_locked ? "Mở khóa" : "Khóa"}
              </button>
              <button onclick="window.openMoveStudentModal(${s.id}, '${s.full_name.replace(/'/g, "\\'")}', '${className}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                <i data-lucide="shuffle" class="w-3.5 h-3.5"></i> Chuyển lớp
              </button>
              <button onclick="window.deleteStudentAccount(${s.id}, '${s.full_name.replace(/'/g, "\\'")}', '${className}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Xóa
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    document
      .getElementById("student-list-container")
      .classList.remove("hidden");
    // Cuộn mượt mà đến khu vực học sinh
    document
      .getElementById("student-list-container")
      .scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    alert("Không thể xem danh sách học sinh: " + err.message);
  }
}

window.resetStudentPassword = async (id, name, className) => {
  if (
    !confirm(
      `Bạn có chắc chắn muốn đặt lại mật khẩu cho học sinh "${name}" không?`,
    )
  )
    return;

  try {
    const res = await window.apiFetch(`/api/students/${id}/reset-password`, {
      method: "POST",
    });
    alert(
      `Đã đặt lại mật khẩu thành công!\n\nHọc sinh: ${name}\nMật khẩu mới: ${res.newPassword}\n\nHãy gửi mật khẩu này cho học sinh.`,
    );
  } catch (error) {
    alert("Lỗi: " + error.message);
  }
};

window.toggleLockStudent = async (id, name, currentLocked, className) => {
  const actionText = currentLocked ? "Mở khóa" : "Khóa";
  if (
    !confirm(
      `Bạn có chắc chắn muốn ${actionText} tài khoản của học sinh "${name}" không?`,
    )
  )
    return;

  try {
    const res = await window.apiFetch(`/api/students/${id}/toggle-lock`, {
      method: "PUT",
    });
    alert(res.message);
    window.viewClassStudents(className);
  } catch (error) {
    alert("Lỗi: " + error.message);
  }
};

// ==========================================
// 3. QUẢN LÝ KHO TỪ VỰNG (TEACHER)
// ==========================================

window.loadTeacherVocabulary = async () => {
  const q = document.getElementById("t-vocab-search").value;
  const grade = document.getElementById("t-vocab-filter-grade").value;

  let url = "/api/vocabulary";
  const params = [];
  if (q) params.push(`q=${encodeURIComponent(q)}`);
  if (grade) params.push(`grade=${grade}`);
  if (params.length > 0) url += `?${params.join("&")}`;

  try {
    const list = await window.apiFetch(url);
    const tbody = document.getElementById("teacher-vocab-tbody");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="p-6 text-center text-slate-400">Không tìm thấy từ vựng nào bám sát bộ lọc.</td></tr>';
      return;
    }

    list.forEach((v) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50/50";
      tr.innerHTML = `
        <td class="p-4">
          <p class="font-extrabold text-slate-900">${v.word}</p>
          <p class="text-xs font-mono text-slate-400">${v.ipa || ""}</p>
        </td>
        <td class="p-4 text-slate-700 font-semibold">
          <span class="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs mr-1 uppercase">${v.word_type}</span>
          ${v.meaning_vi}
        </td>
        <td class="p-4 text-xs font-semibold text-slate-500">
          ${v.grade ? `Khối ${v.grade}` : "Chung"}<br>
          <span class="text-slate-400 text-[10px]">${v.unit || "Bài bổ sung"}</span>
        </td>
        <td class="p-4 text-xs text-slate-500 italic max-w-xs truncate" title="${v.example || ""}">
          ${v.example || "Chưa soạn câu ví dụ."}
        </td>
        <td class="p-4 text-right">
          <div class="flex justify-end gap-2">
            <button onclick="window.editVocab(${v.id}, '${v.word}', '${v.ipa || ""}', '${v.word_type}', '${v.meaning_vi}', '${v.grade || ""}', '${v.unit || ""}', '${v.topic || ""}', '${v.example || ""}')" class="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all cursor-pointer">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.deleteVocab(${v.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    alert("Không thể tải từ vựng: " + err.message);
  }
};

window.openCreateVocabAiModal = () => {
  document.getElementById("create-vocab-ai-modal").classList.remove("hidden");
};

window.closeCreateVocabAiModal = () => {
  document.getElementById("create-vocab-ai-modal").classList.add("hidden");
};

window.generateVocabByAi = async () => {
  const grade = document.getElementById("vocab-ai-grade").value;
  const btn = document.getElementById("btn-generate-vocab-ai");
  const originalHtml = btn.innerHTML;

  try {
    btn.innerHTML =
      '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang tạo...';
    btn.disabled = true;

    const res = await window.apiFetch("/api/vocabulary/ai-generate", {
      method: "POST",
      body: JSON.stringify({ grade }),
    });

    alert(`Đã thêm thành công ${res.count} từ vựng!`);
    closeCreateVocabAiModal();
    window.loadTeacherVocabulary();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    if (window.lucide) window.lucide.createIcons();
  }
};

window.openImportExcelModal = () => {
  document.getElementById("vocab-excel-file").value = "";
  document
    .getElementById("import-vocab-excel-modal")
    .classList.remove("hidden");
};

window.closeImportExcelModal = () => {
  document.getElementById("import-vocab-excel-modal").classList.add("hidden");
};

window.importVocabExcel = async () => {
  const fileInput = document.getElementById("vocab-excel-file");
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Vui lòng chọn file Excel để tải lên!");
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);

  const btn = document.getElementById("btn-import-vocab-excel");
  const originalHtml = btn.innerHTML;

  try {
    btn.innerHTML =
      '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang tải lên...';
    btn.disabled = true;

    // We cannot use window.apiFetch directly for FormData if it stringifies it, but apiFetch might handle it or we can use fetch directly.
    const token = localStorage.getItem("ms_hien_token");
    const res = await fetch("/api/vocabulary/import-excel", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");

    alert(`Đã nhập thành công ${data.count} từ vựng!`);
    closeImportExcelModal();
    window.loadTeacherVocabulary();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    if (window.lucide) window.lucide.createIcons();
  }
};

window.openCreateVocabModal = () => {
  document.getElementById("vocab-modal-title").textContent = "Thêm Từ Vựng Mới";
  document.getElementById("vocab-form").reset();
  document.getElementById("vocab-id-input").value = "";

  document.getElementById("vocab-modal").classList.remove("hidden");
  document.getElementById("vocab-modal").classList.add("flex");
};
window.closeVocabModal = () => {
  document.getElementById("vocab-modal").classList.add("hidden");
  document.getElementById("vocab-modal").classList.remove("flex");
};

window.editVocab = (
  id,
  word,
  ipa,
  type,
  meaning,
  grade,
  unit,
  topic,
  example,
) => {
  document.getElementById("vocab-modal-title").textContent =
    "Sửa Thông Tin Từ Vựng";

  document.getElementById("vocab-id-input").value = id;
  document.getElementById("v-word").value = word;
  document.getElementById("v-ipa").value = ipa;
  document.getElementById("v-type").value = type;
  document.getElementById("v-meaning").value = meaning;
  document.getElementById("v-grade").value = grade;
  document.getElementById("v-unit").value = unit;
  document.getElementById("v-topic").value = topic;
  document.getElementById("v-example").value = example;

  document.getElementById("vocab-modal").classList.remove("hidden");
  document.getElementById("vocab-modal").classList.add("flex");
};

window.deleteVocab = async (id) => {
  if (!confirm("Cô có chắc chắn muốn xoá từ vựng này khỏi kho không?")) return;
  try {
    await window.apiFetch(`/api/vocabulary/${id}`, { method: "DELETE" });
    window.loadTeacherVocabulary();
  } catch (err) {
    alert(err.message);
  }
};

document.getElementById("vocab-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("vocab-id-input").value;
  const word = document.getElementById("v-word").value;
  const ipa = document.getElementById("v-ipa").value;
  const word_type = document.getElementById("v-type").value;
  const meaning_vi = document.getElementById("v-meaning").value;
  const grade = document.getElementById("v-grade").value;
  const unit = document.getElementById("v-unit").value;
  const topic = document.getElementById("v-topic").value;
  const example = document.getElementById("v-example").value;

  const body = {
    word,
    ipa,
    word_type,
    meaning_vi,
    grade,
    unit,
    topic,
    example,
  };

  try {
    if (id) {
      // Sửa từ
      await window.apiFetch(`/api/vocabulary/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      // Thêm mới
      await window.apiFetch("/api/vocabulary", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    closeVocabModal();
    window.loadTeacherVocabulary();
  } catch (err) {
    alert(err.message);
  }
});

// ==========================================
// 4. QUẢN LÝ ĐỀ THI & CÔNG CỤ AI (TEACHER)
// ==========================================

window.loadTeacherExams = async () => {
  try {
    const list = await window.apiFetch("/api/exams");
    window.teacherExamsList = list;
    const tbody = document.getElementById("teacher-exams-tbody");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="py-6 text-center text-slate-400">Chưa có đề thi nào được khởi tạo.</td></tr>';
      return;
    }

    list.forEach((e) => {
      const typeText =
        e.exam_type === "thpt_qg"
          ? "Luyện thi THPT QG"
          : e.exam_type.startsWith("hsg_")
            ? "Thi Học Sinh Giỏi"
            : "Kiểm Tra Học Kỳ";
      const isDraft = e.status === "draft";

      let groupsText = "";
      if (!isDraft) {
        try {
          const groups =
            typeof e.assigned_groups === "string"
              ? JSON.parse(e.assigned_groups)
              : e.assigned_groups || [];
          if (groups.includes("all")) groupsText = "Tất cả";
          else if (groups.length > 0) groupsText = "Khối " + groups.join(", ");
        } catch (err) {}
      }

      const statusBadge = isDraft
        ? `<span class="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded text-[10px] font-extrabold uppercase">Bản nháp</span>`
        : `<span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[10px] font-extrabold uppercase">Đã giao${groupsText ? " " + groupsText : ""}</span>`;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50/50";
      tr.innerHTML = `
        <td class="py-3 font-semibold text-slate-800">
          <span class="flex items-center gap-1">
            ${e.is_ai_generated ? '<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">AI</span>' : ""}
            ${e.title}
          </span>
        </td>
        <td class="py-3 text-slate-500 font-medium text-xs">${typeText} (Lớp ${e.grade})</td>
        <td class="py-3 text-slate-400 text-xs">
          <div class="flex flex-col gap-1">
            <span>${e.duration_minutes} phút</span>
            <div>${statusBadge}</div>
          </div>
        </td>
        <td class="py-3 text-right">
          <div class="flex flex-wrap items-center justify-end gap-1.5">
            <button onclick="window.previewExamForTeacher(${e.id})" class="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i> Xem & Thi thử
            </button>
            
            <button onclick="window.exportExamToWord(${e.id})" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Xuất Word
            </button>

            <button onclick="window.manageExamAssignment(${e.id})" class="px-2.5 py-1.5 ${isDraft ? "bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border-emerald-100" : "bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 border-brand-100"} border rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
              <i data-lucide="send" class="w-3.5 h-3.5"></i> ${isDraft ? "Giao đề" : "Quản lý Giao đề"}
            </button>

            <button onclick="window.viewExamResults(${e.id})" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer">
              Bảng điểm
            </button>
            <button onclick="window.deleteExam(${e.id})" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Xóa
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    alert("Không thể tải đề thi: " + err.message);
  }
};

window.deleteExam = async (examId) => {
  const confirmed = await window.showConfirm({
    title: "Xóa đề thi vĩnh viễn",
    message:
      "Cô có chắc chắn muốn xóa đề thi này không? Hành động này sẽ xóa vĩnh viễn đề bài, tất cả các câu hỏi và toàn bộ điểm làm bài thi thử của học sinh liên quan đến đề này.",
    type: "danger",
  });
  if (!confirmed) return;
  try {
    const res = await window.apiFetch(`/api/exams/${examId}`, {
      method: "DELETE",
    });
    alert(res.message || "Xóa đề thi thành công!");
    window.loadTeacherExams();
  } catch (err) {
    alert("Lỗi khi xóa đề thi: " + err.message);
  }
};

window.exportExamToWord = async (examId) => {
  try {
    const token = window.appState.token || localStorage.getItem("ms_hien_token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/exams/${examId}/export-word`, {
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`Mã lỗi từ server: ${response.status}`);
    }
    
    const contentDisposition = response.headers.get("content-disposition");
    let filename = `De_thi_${examId}.doc`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Không thể tải đề thi dạng Word: " + err.message);
  }
};

// Xem bảng điểm thi thử của đề thi cụ thể
window.activeRosterExamId = null;
window.activeRosterExamTitle = "";

window.switchExamRosterTab = async (tab) => {
  const historyTabBtn = document.getElementById("btn-exam-history-tab");
  const leaderboardTabBtn = document.getElementById("btn-exam-leaderboard-tab");
  const historyView = document.getElementById("exam-history-view");
  const leaderboardView = document.getElementById("exam-leaderboard-view");

  if (!historyTabBtn || !leaderboardTabBtn || !historyView || !leaderboardView)
    return;

  if (tab === "history") {
    historyTabBtn.className =
      "px-4 py-2 text-sm font-bold text-brand-600 border-b-2 border-brand-600 transition-all cursor-pointer";
    leaderboardTabBtn.className =
      "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-all cursor-pointer";
    historyView.classList.remove("hidden");
    leaderboardView.classList.add("hidden");
  } else if (tab === "leaderboard") {
    leaderboardTabBtn.className =
      "px-4 py-2 text-sm font-bold text-brand-600 border-b-2 border-brand-600 transition-all cursor-pointer";
    historyTabBtn.className =
      "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-all cursor-pointer";
    historyView.classList.add("hidden");
    leaderboardView.classList.remove("hidden");

    // Tải bảng xếp hạng
    if (window.activeRosterExamId) {
      await loadRosterLeaderboard(window.activeRosterExamId);
    }
  }
};

async function loadRosterLeaderboard(examId) {
  const tbody = document.getElementById("exam-leaderboard-tbody");
  if (!tbody) return;
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
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-rose-500">Lỗi tải bảng xếp hạng: ${err.message}</td></tr>`;
  }
}

window.viewExamResults = async (examId, examTitle) => {
  try {
    if (!examTitle && window.teacherExamsList) {
      const found = window.teacherExamsList.find(
        (x) => x.id === Number(examId),
      );
      examTitle = found ? found.title : "Đề thi";
    }
    window.activeRosterExamId = examId;
    window.activeRosterExamTitle = examTitle;

    // Reset về tab lịch sử khi mở đề mới
    window.switchExamRosterTab("history");

    const results = await window.apiFetch(
      `/api/exam-results?exam_id=${examId}`,
    );

    document.getElementById("exam-results-roster").classList.remove("hidden");
    document.getElementById("results-exam-title").textContent =
      `Thống kê kết quả đề: ${examTitle}`;

    const tbody = document.getElementById("exam-results-tbody");
    tbody.innerHTML = "";

    if (results.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="py-6 text-center text-slate-400">Chưa có học sinh nào nộp bài thi thử cho đề này.</td></tr>';
      return;
    }

    results.forEach((r) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50/50";

      const durationSecs = r.seconds_spent || 0;
      const mins = Math.floor(durationSecs / 60);
      const secs = durationSecs % 60;
      const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      tr.innerHTML = `
        <td class="py-3 font-semibold text-slate-800">${r.student_name}</td>
        <td class="py-3 text-slate-500 font-bold uppercase text-xs">${r.class_name || "N/A"}</td>
        <td class="py-3 text-emerald-600 font-bold text-xs">${r.total_correct} / ${r.total_questions} câu</td>
        <td class="py-3 text-slate-500 font-mono text-xs">${timeStr}</td>
        <td class="py-3"><span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-sm rounded">${r.score}đ</span></td>
        <td class="py-3 text-slate-400 text-xs">${new Date(r.completed_at).toLocaleString("vi-VN")}</td>
      `;
      tbody.appendChild(tr);
    });

    document
      .getElementById("exam-results-roster")
      .scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    alert("Lỗi khi tải kết quả thi: " + err.message);
  }
};

// Form: AI tự thiết lập đề thi 1-Click
document
  .getElementById("ai-generate-exam-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("ai-exam-type").value;
    const grade = document.getElementById("ai-exam-grade").value;
    const topic = document.getElementById("ai-exam-topic").value;

    const btn = e.target.querySelector('button[type="submit"]');
    const originText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Cô chờ em biên soạn đề tí nhé...`;

    try {
      const endpoint =
        type === "thpt_qg" ? "/api/ai/generate-thpt" : "/api/ai/generate-hsg";
      const body =
        type === "thpt_qg"
          ? { grade, topic }
          : {
              grade,
              difficulty_level: type === "hsg_tinh" ? "tinh" : "truong",
            };

      const res = await window.apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      alert(res.message);
      document.getElementById("ai-exam-topic").value = "";
      window.loadTeacherExams();
    } catch (err) {
      alert("Không thể khởi tạo đề bằng AI: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originText;
    }
  });

// Form: Trích xuất thô đề thi pasted text bằng AI
document
  .getElementById("ai-parse-exam-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("parse-exam-title").value;
    const raw_text = document.getElementById("parse-exam-raw").value;

    const btn = e.target.querySelector('button[type="submit"]');
    const originText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> AI đang bóc tách câu hỏi...`;

    try {
      const res = await window.apiFetch("/api/exams/upload", {
        method: "POST",
        body: JSON.stringify({ title, raw_text }),
      });

      alert(res.message);
      document.getElementById("ai-parse-exam-form").reset();
      window.loadTeacherExams();
    } catch (err) {
      alert("Phân tách đề thô lỗi: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originText;
    }
  });

// ==========================================
// QUẢN LÝ TÀI KHOẢN HỌC SINH (TEACHER)
// ==========================================

// Hàm mở Modal chuyển lớp
window.openMoveStudentModal = async (
  studentId,
  studentName,
  currentClassName,
) => {
  const modal = document.getElementById("move-student-modal");
  if (!modal) return;

  document.getElementById("move-student-id").value = studentId;
  document.getElementById("move-student-name").textContent = studentName;
  document.getElementById("move-student-current-class").value =
    currentClassName;

  try {
    // Tải danh sách lớp để nạp vào select
    const classes = await window.apiFetch("/api/classes");
    const selectNewClass = document.getElementById("move-student-new-class");
    if (selectNewClass) {
      selectNewClass.innerHTML = "";

      classes.forEach((c) => {
        const selected = c.name === currentClassName ? "selected" : "";
        selectNewClass.innerHTML += `<option value="${c.name}" ${selected}>Lớp ${c.name}</option>`;
      });
    }

    modal.classList.remove("hidden");
  } catch (err) {
    alert("Không thể tải danh sách lớp học: " + err.message);
  }
};

window.closeMoveStudentModal = () => {
  const modal = document.getElementById("move-student-modal");
  if (modal) modal.classList.add("hidden");
};

// Hàm xóa tài khoản học sinh
window.deleteStudentAccount = async (
  studentId,
  studentName,
  currentClassName,
) => {
  const confirmDelete = confirm(
    `Cô có chắc chắn muốn XÓA VĨNH VIỄN tài khoản của học sinh "${studentName}" thuộc lớp "${currentClassName}"? \n\nHành động này không thể hoàn tác, mọi lịch sử học tập, bảng điểm của học sinh này sẽ bị xóa bỏ hoàn toàn.`,
  );
  if (!confirmDelete) return;

  try {
    const res = await window.apiFetch(`/api/students/${studentId}`, {
      method: "DELETE",
    });
    alert(res.message || "Xóa tài khoản học sinh thành công!");
    // Tải lại danh sách học sinh của lớp hiện tại
    selectClass(currentClassName);
  } catch (err) {
    alert("Lỗi khi xóa tài khoản học sinh: " + err.message);
  }
};

// Gửi Form Chuyển Lớp
const moveStudentForm = document.getElementById("move-student-form");
if (moveStudentForm) {
  moveStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = document.getElementById("move-student-id").value;
    const newClassName = document.getElementById(
      "move-student-new-class",
    ).value;
    const currentClassName = document.getElementById(
      "move-student-current-class",
    ).value;

    if (newClassName === currentClassName) {
      alert("Học sinh đang ở lớp này rồi! Vui lòng chọn lớp học khác.");
      return;
    }

    try {
      const res = await window.apiFetch(`/api/students/${studentId}/class`, {
        method: "PUT",
        body: JSON.stringify({ class_name: newClassName }),
      });

      alert(res.message || "Đã chuyển lớp học sinh thành công!");
      window.closeMoveStudentModal();
      // Tải lại danh sách học sinh lớp cũ để cập nhật bảng
      selectClass(currentClassName);
    } catch (err) {
      alert("Lỗi khi chuyển lớp học sinh: " + err.message);
    }
  });
}

// =========================================================================
// TEACHER VOCABULARY PLAYTEST GAME ENGINE (3 MINI-GAMES FOR TEACHERS)
// =========================================================================

window.teacherState = {
  vocabList: [],
  gameType: null,
  gameQuestions: [],
  gameQuestionIndex: 0,
  gameCorrectAnswers: 0,
  gameWrongAnswers: 0,
  scrambleTimeLeft: 30,
  scrambleTimerInterval: null,
};

let teacherGameListenersRegistered = false;
function registerTeacherGameFormListeners() {
  if (teacherGameListenersRegistered) return;

  const scrambleForm = document.getElementById("t-scramble-submit-form");
  if (scrambleForm) {
    scrambleForm.addEventListener("submit", (e) => {
      window.submitTeacherScrambleAnswer(e);
    });
  }

  const fitbForm = document.getElementById("t-fitb-submit-form");
  if (fitbForm) {
    fitbForm.addEventListener("submit", (e) => {
      window.submitTeacherFitbAnswer(e);
    });
  }

  teacherGameListenersRegistered = true;
}

// 1. MỞ MODAL CHƠI GAME CHO GIÁO VIÊN
window.openTeacherGameModal = async () => {
  registerTeacherGameFormListeners();

  // Đảm bảo có dữ liệu từ vựng
  if (
    !window.teacherState.vocabList ||
    window.teacherState.vocabList.length === 0
  ) {
    try {
      window.teacherState.vocabList = await window.apiFetch("/api/vocabulary");
    } catch (err) {
      console.error("Không thể tải từ vựng cho game: ", err);
    }
  }

  // Khởi tạo hub chọn game
  window.initTeacherGameHub();

  const modal = document.getElementById("teacher-game-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
};

// 2. ĐÓNG MODAL CHƠI GAME
window.closeTeacherGameModal = () => {
  // Clear any existing timer
  if (window.teacherState.scrambleTimerInterval) {
    clearInterval(window.teacherState.scrambleTimerInterval);
    window.teacherState.scrambleTimerInterval = null;
  }

  const modal = document.getElementById("teacher-game-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
};

// 3. KHỞI TẠO HUB CHỌN TRÒ CHƠI CHO GIÁO VIÊN
window.initTeacherGameHub = () => {
  if (window.teacherState.scrambleTimerInterval) {
    clearInterval(window.teacherState.scrambleTimerInterval);
    window.teacherState.scrambleTimerInterval = null;
  }

  // Reset hiển thị các màn hình
  document.getElementById("t-game-hub-screen").classList.remove("hidden");
  document.getElementById("t-game-quiz-screen").classList.add("hidden");
  document.getElementById("t-game-scramble-screen").classList.add("hidden");
  document.getElementById("t-game-fitb-screen").classList.add("hidden");
  document.getElementById("t-game-report-screen").classList.add("hidden");

  // Đảm bảo cuộn lên đầu modal trên thiết bị di động
  const modal = document.getElementById("teacher-game-modal");
  if (modal) {
    modal.scrollTop = 0;
  }
};

// 4. BẮT ĐẦU CHƠI THỬ GAME CHỈ ĐỊNH
window.startTeacherGame = (gameType) => {
  const grade = document.getElementById("t-game-hub-filter-grade").value;
  let words = [];
  if (grade === "all") {
    words = window.teacherState.vocabList || [];
  } else {
    words = (window.teacherState.vocabList || []).filter(
      (v) => v.grade === Number(grade),
    );
  }

  if (words.length < 4 && gameType === "quiz") {
    alert(
      "Khối lớp hiện tại chưa có đủ từ vựng (tối thiểu 4 từ) để tạo đáp án trắc nghiệm chơi thử. Cô vui lòng thêm từ vựng hoặc chọn khối lớp khác nhé!",
    );
    return;
  }
  if (words.length === 0) {
    alert(
      "Khối lớp hiện tại chưa có từ vựng để chơi thử. Cô vui lòng thêm từ vựng hoặc chọn khối lớp khác nhé!",
    );
    return;
  }

  // Cài đặt trạng thái game
  window.teacherState.gameType = gameType;
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  window.teacherState.gameQuestions = shuffled.slice(0, 10);
  window.teacherState.gameQuestionIndex = 0;
  window.teacherState.gameCorrectAnswers = 0;
  window.teacherState.gameWrongAnswers = 0;

  // Ẩn/Hiện screen tương ứng
  document.getElementById("t-game-hub-screen").classList.add("hidden");
  document.getElementById("t-game-report-screen").classList.add("hidden");
  document.getElementById("t-game-quiz-screen").classList.add("hidden");
  document.getElementById("t-game-scramble-screen").classList.add("hidden");
  document.getElementById("t-game-fitb-screen").classList.add("hidden");

  if (gameType === "quiz") {
    document.getElementById("t-game-quiz-screen").classList.remove("hidden");
    document.getElementById("t-quiz-correct-count").textContent = "0";
    document.getElementById("t-quiz-wrong-count").textContent = "0";
  } else if (gameType === "scramble") {
    document
      .getElementById("t-game-scramble-screen")
      .classList.remove("hidden");
    document.getElementById("t-scramble-correct-count").textContent = "0";
    document.getElementById("t-scramble-played-count").textContent = "0";
  } else if (gameType === "fitb") {
    document.getElementById("t-game-fitb-screen").classList.remove("hidden");
    document.getElementById("t-fitb-correct-count").textContent = "0";
    document.getElementById("t-fitb-wrong-count").textContent = "0";
  }

  window.loadTeacherGameQuestion();

  // Đảm bảo cuộn lên đầu màn hình chơi game trong modal
  const modal = document.getElementById("teacher-game-modal");
  if (modal) {
    modal.scrollTop = 0;
  }
};

// 5. THOÁT GAME ĐANG CHƠI THỬ QUAY VỀ MENU CHỌN GAME
window.quitTeacherGame = () => {
  window.initTeacherGameHub();
};

// 6. TẢI CÂU HỎI TIẾP THEO CHO GIÁO VIÊN
window.loadTeacherGameQuestion = () => {
  const index = window.teacherState.gameQuestionIndex;
  const questions = window.teacherState.gameQuestions;
  const gameType = window.teacherState.gameType;

  if (index >= questions.length) {
    const score = window.teacherState.gameCorrectAnswers;
    const total = questions.length;
    window.showTeacherGameReport(score, total);
    return;
  }

  if (window.teacherState.scrambleTimerInterval) {
    clearInterval(window.teacherState.scrambleTimerInterval);
    window.teacherState.scrambleTimerInterval = null;
  }

  if (gameType === "quiz") {
    loadTeacherQuizQuestion(index);
  } else if (gameType === "scramble") {
    loadTeacherScrambleQuestion(index);
  } else if (gameType === "fitb") {
    loadTeacherFitbQuestion(index);
  }
};

// ==========================================
// GAME 1: WORD QUIZ (TRẮC NGHIỆM - TEACHER)
// ==========================================
function loadTeacherQuizQuestion(index) {
  const word = window.teacherState.gameQuestions[index];
  const total = window.teacherState.gameQuestions.length;

  document.getElementById("t-quiz-progress-text").textContent =
    `Câu ${index + 1}/${total}`;
  const progressPercent = ((index + 1) / total) * 100;
  document.getElementById("t-quiz-progress-bar").style.width =
    `${progressPercent}%`;

  document.getElementById("t-quiz-question-meaning").textContent =
    word.meaning_vi;
  const typeText =
    word.word_type === "n"
      ? "danh từ"
      : word.word_type === "v"
        ? "động từ"
        : word.word_type === "adj"
          ? "tính từ"
          : word.word_type === "adv"
            ? "trạng từ"
            : "từ vựng";
  document.getElementById("t-quiz-question-type").textContent = typeText;
  document.getElementById("t-quiz-question-ipa").textContent = word.ipa || "";

  const allVocabs = window.teacherState.vocabList;
  const distractors = allVocabs
    .filter(
      (v) => v.word.trim().toLowerCase() !== word.word.trim().toLowerCase(),
    )
    .map((v) => v.word.trim());
  const uniqueDistractors = [...new Set(distractors)];

  const pickedDistractors = [];
  while (pickedDistractors.length < 3 && uniqueDistractors.length > 0) {
    const randIdx = Math.floor(Math.random() * uniqueDistractors.length);
    pickedDistractors.push(uniqueDistractors.splice(randIdx, 1)[0]);
  }

  const fallbacks = [
    "accomplish",
    "valuable",
    "environment",
    "contribute",
    "household",
  ];
  while (pickedDistractors.length < 3) {
    const fallback = fallbacks[pickedDistractors.length];
    if (
      !pickedDistractors.includes(fallback) &&
      fallback !== word.word.trim()
    ) {
      pickedDistractors.push(fallback);
    }
  }

  const options = [word.word.trim(), ...pickedDistractors].sort(
    () => 0.5 - Math.random(),
  );

  const grid = document.getElementById("t-quiz-options-grid");
  grid.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className =
      "t-quiz-opt-btn w-full p-3.5 text-slate-800 bg-white border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 rounded-2xl font-bold text-xs transition-all shadow-sm text-left flex items-center justify-between cursor-pointer";
    btn.innerHTML = `
      <span>${opt}</span>
      <i data-lucide="circle" class="w-4 h-4 text-slate-300"></i>
    `;
    btn.onclick = () => window.submitTeacherQuizAnswer(opt, btn);
    grid.appendChild(btn);
  });

  document.getElementById("t-quiz-feedback").className =
    "hidden p-3 rounded-xl text-xs font-bold text-center";
  document.getElementById("t-quiz-feedback").classList.add("hidden");
  document.getElementById("t-quiz-next-btn").classList.add("hidden");

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

window.submitTeacherQuizAnswer = (chosenOption, clickedBtn) => {
  const index = window.teacherState.gameQuestionIndex;
  const word = window.teacherState.gameQuestions[index];
  const correctWord = word.word.trim();

  const buttons = document.querySelectorAll(".t-quiz-opt-btn");
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove("hover:bg-brand-50/20", "hover:border-brand-500");
    btn.style.cursor = "not-allowed";
  });

  const feedback = document.getElementById("t-quiz-feedback");
  feedback.classList.remove("hidden");

  const isCorrect = chosenOption.toLowerCase() === correctWord.toLowerCase();

  buttons.forEach((btn) => {
    const text = btn.querySelector("span").textContent.trim();
    if (text.toLowerCase() === correctWord.toLowerCase()) {
      btn.className =
        "t-quiz-opt-btn w-full p-3.5 text-emerald-800 bg-emerald-50 border-2 border-emerald-500 rounded-2xl font-bold text-xs flex items-center justify-between";
      btn.innerHTML = `<span>${text}</span> <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>`;
    } else if (text === chosenOption && !isCorrect) {
      btn.className =
        "t-quiz-opt-btn w-full p-3.5 text-rose-800 bg-rose-50 border-2 border-rose-500 rounded-2xl font-bold text-xs flex items-center justify-between";
      btn.innerHTML = `<span>${text}</span> <i data-lucide="x-circle" class="w-4 h-4 text-rose-600"></i>`;
    }
  });

  if (isCorrect) {
    window.teacherState.gameCorrectAnswers++;
    document.getElementById("t-quiz-correct-count").textContent =
      window.teacherState.gameCorrectAnswers;
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
    feedback.textContent = "🥳 Cô chọn chính xác tuyệt đối!";
    feedback.className =
      "p-3 rounded-xl text-xs font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200";
  } else {
    window.teacherState.gameWrongAnswers++;
    document.getElementById("t-quiz-wrong-count").textContent =
      window.teacherState.gameWrongAnswers;
    feedback.innerHTML = `😢 Đáp án chính xác phải là: <strong class="text-rose-700 uppercase font-mono">${correctWord}</strong>.`;
    feedback.className =
      "p-3 rounded-xl text-xs font-bold text-center bg-rose-50 text-rose-700 border border-rose-200";
  }

  document.getElementById("t-quiz-next-btn").classList.remove("hidden");
  document.getElementById("t-quiz-next-btn").onclick = () => {
    window.teacherState.gameQuestionIndex++;
    window.loadTeacherGameQuestion();
  };

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
};

window.speakTeacherQuizWord = () => {
  const index = window.teacherState.gameQuestionIndex;
  const word = window.teacherState.gameQuestions[index];
  if (!word) return;
  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

// ==========================================
// GAME 2: WORD SCRAMBLE (XẾP CHỮ - TEACHER)
// ==========================================
function scrambleTeacherWord(wordStr) {
  let arr = wordStr.toLowerCase().split("");
  let scrambled = "";
  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join("");
    attempts++;
  } while (
    scrambled === wordStr.toLowerCase() &&
    attempts < 15 &&
    wordStr.length > 2
  );
  return scrambled;
}

function loadTeacherScrambleQuestion(index) {
  const word = window.teacherState.gameQuestions[index];
  const total = window.teacherState.gameQuestions.length;

  document.getElementById("t-scramble-progress-text").textContent =
    `Câu ${index + 1}/${total}`;
  document.getElementById("t-scramble-played-count").textContent = index;

  const scrambled = scrambleTeacherWord(word.word);

  const container = document.getElementById("t-scramble-word-container");
  container.innerHTML = "";
  scrambled.split("").forEach((char) => {
    if (char === " ") {
      const spacer = document.createElement("div");
      spacer.className = "w-6";
      container.appendChild(spacer);
    } else {
      const item = document.createElement("span");
      item.className =
        "px-3 py-1.5 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 font-extrabold text-lg rounded-2xl border border-amber-200 uppercase shadow-sm flex items-center justify-center min-w-[36px] select-none";
      item.textContent = char;
      container.appendChild(item);
    }
  });

  document.getElementById("t-scramble-meaning-hint").textContent =
    word.meaning_vi;
  const typeText =
    word.word_type === "n"
      ? "danh từ"
      : word.word_type === "v"
        ? "động từ"
        : word.word_type === "adj"
          ? "tính từ"
          : word.word_type === "adv"
            ? "trạng từ"
            : "từ vựng";
  document.getElementById("t-scramble-type-hint").textContent = typeText;
  document.getElementById("t-scramble-ipa-hint").textContent =
    word.ipa || "Chưa có phiên âm";

  const submitBtn = document.querySelector("#t-scramble-submit-form button");
  submitBtn.disabled = false;
  submitBtn.className =
    "w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer";

  const input = document.getElementById("t-scramble-input");
  input.value = "";
  input.disabled = false;
  input.focus();

  document.getElementById("t-scramble-feedback").className =
    "hidden p-3 rounded-xl text-xs font-bold text-center";
  document.getElementById("t-scramble-feedback").classList.add("hidden");
  document.getElementById("t-scramble-next-btn").classList.add("hidden");

  window.teacherState.scrambleTimeLeft = 30;
  document.getElementById("t-scramble-timer-text").textContent = "30";
  document.getElementById("t-scramble-timer-box").className =
    "flex items-center gap-1 text-xs font-bold text-amber-600 px-2 py-0.5 bg-amber-50 rounded-full";

  window.teacherState.scrambleTimerInterval = setInterval(() => {
    window.teacherState.scrambleTimeLeft--;
    document.getElementById("t-scramble-timer-text").textContent =
      window.teacherState.scrambleTimeLeft;

    if (window.teacherState.scrambleTimeLeft <= 10) {
      document.getElementById("t-scramble-timer-box").className =
        "flex items-center gap-1 text-xs font-bold text-rose-600 px-2 py-0.5 bg-rose-100 rounded-full animate-bounce";
    }

    if (window.teacherState.scrambleTimeLeft <= 0) {
      clearInterval(window.teacherState.scrambleTimerInterval);
      window.teacherState.scrambleTimerInterval = null;
      window.submitTeacherScrambleTimeout();
    }
  }, 1000);
}

window.submitTeacherScrambleAnswer = (e) => {
  if (e) e.preventDefault();

  if (window.teacherState.scrambleTimerInterval) {
    clearInterval(window.teacherState.scrambleTimerInterval);
    window.teacherState.scrambleTimerInterval = null;
  }

  const index = window.teacherState.gameQuestionIndex;
  const word = window.teacherState.gameQuestions[index];
  const correctWord = word.word.trim();

  const inputEl = document.getElementById("t-scramble-input");
  const userAns = inputEl.value.trim().toLowerCase();
  inputEl.disabled = true;

  const submitBtn = document.querySelector("#t-scramble-submit-form button");
  submitBtn.disabled = true;
  submitBtn.className =
    "w-full py-2.5 bg-slate-200 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed";

  const feedback = document.getElementById("t-scramble-feedback");
  feedback.classList.remove("hidden");

  const isCorrect = userAns === correctWord.toLowerCase();

  if (isCorrect) {
    window.teacherState.gameCorrectAnswers++;
    document.getElementById("t-scramble-correct-count").textContent =
      window.teacherState.gameCorrectAnswers;
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.8 },
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.8 },
    });
    feedback.textContent = "🥳 Tuyệt đỉnh! Từ vựng được xếp vô cùng chính xác!";
    feedback.className =
      "p-3 rounded-xl text-xs font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200";
  } else {
    window.teacherState.gameWrongAnswers++;
    feedback.innerHTML = `😢 Gợi ý đáp án đúng là: <strong class="text-rose-700 font-mono text-sm uppercase">${correctWord}</strong>.`;
    feedback.className =
      "p-3 rounded-xl text-xs font-bold text-center bg-rose-50 text-rose-700 border border-rose-200";
  }

  document.getElementById("t-scramble-next-btn").classList.remove("hidden");
  document.getElementById("t-scramble-next-btn").onclick = () => {
    window.teacherState.gameQuestionIndex++;
    window.loadTeacherGameQuestion();
  };
};

window.submitTeacherScrambleTimeout = () => {
  const index = window.teacherState.gameQuestionIndex;
  const word = window.teacherState.gameQuestions[index];
  const correctWord = word.word.trim();

  const inputEl = document.getElementById("t-scramble-input");
  inputEl.disabled = true;

  const submitBtn = document.querySelector("#t-scramble-submit-form button");
  submitBtn.disabled = true;
  submitBtn.className =
    "w-full py-2.5 bg-slate-200 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed";

  window.teacherState.gameWrongAnswers++;

  const feedback = document.getElementById("t-scramble-feedback");
  feedback.classList.remove("hidden");
  feedback.innerHTML = `⏰ Hết giờ mất rồi cô ơi! Đáp án đúng: <strong class="text-amber-800 uppercase font-mono">${correctWord}</strong>.`;
  feedback.className =
    "p-3 rounded-xl text-xs font-bold text-center bg-amber-50 text-amber-800 border border-amber-200";

  document.getElementById("t-scramble-next-btn").classList.remove("hidden");
  document.getElementById("t-scramble-next-btn").onclick = () => {
    window.teacherState.gameQuestionIndex++;
    window.loadTeacherGameQuestion();
  };
};

// ==========================================
// GAME 3: FILL IN THE BLANK (ĐIỀN TỪ - TEACHER)
// ==========================================
function loadTeacherFitbQuestion(index) {
  const word = window.teacherState.gameQuestions[index];
  const total = window.teacherState.gameQuestions.length;

  document.getElementById("t-fitb-progress-text").textContent =
    `Câu ${index + 1}/${total}`;
  const progressPercent = ((index + 1) / total) * 100;
  document.getElementById("t-fitb-progress-bar").style.width =
    `${progressPercent}%`;

  let exampleText =
    word.example || "My mother is a homemaker and takes care of our family.";
  const escapedWord = word.word
    .trim()
    .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const boundaryRegex = new RegExp(`\\b${escapedWord}\\b`, "gi");

  let formattedSentence = "";
  if (boundaryRegex.test(exampleText)) {
    formattedSentence = exampleText.replace(
      boundaryRegex,
      `<span class="px-2 py-0.5 bg-amber-100 border border-dashed border-amber-400 rounded text-brand-700 font-black font-mono mx-1">________</span>`,
    );
  } else {
    const fallbackRegex = new RegExp(escapedWord, "gi");
    formattedSentence = exampleText.replace(
      fallbackRegex,
      `<span class="px-2 py-0.5 bg-amber-100 border border-dashed border-amber-400 rounded text-brand-700 font-black font-mono mx-1">________</span>`,
    );
  }

  document.getElementById("t-fitb-sentence-container").innerHTML =
    formattedSentence;

  document.getElementById("t-fitb-meaning-hint").textContent = word.meaning_vi;
  const typeText =
    word.word_type === "n"
      ? "danh từ"
      : word.word_type === "v"
        ? "động từ"
        : word.word_type === "adj"
          ? "tính từ"
          : word.word_type === "adv"
            ? "trạng từ"
            : "từ vựng";
  document.getElementById("t-fitb-type-hint").textContent =
    `${typeText} | ${word.ipa || "Chưa có phiên âm"}`;

  const submitBtn = document.querySelector("#t-fitb-submit-form button");
  submitBtn.disabled = false;
  submitBtn.className =
    "w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer";

  const input = document.getElementById("t-fitb-input");
  input.value = "";
  input.disabled = false;
  input.focus();

  document.getElementById("t-fitb-feedback").className =
    "hidden p-3 rounded-xl text-xs font-bold text-center";
  document.getElementById("t-fitb-feedback").classList.add("hidden");
  document.getElementById("t-fitb-next-btn").classList.add("hidden");
}

window.submitTeacherFitbAnswer = (e) => {
  if (e) e.preventDefault();

  const index = window.teacherState.gameQuestionIndex;
  const word = window.teacherState.gameQuestions[index];
  const correctWord = word.word.trim();

  const inputEl = document.getElementById("t-fitb-input");
  const userAns = inputEl.value.trim().toLowerCase();
  inputEl.disabled = true;

  const submitBtn = document.querySelector("#t-fitb-submit-form button");
  submitBtn.disabled = true;
  submitBtn.className =
    "w-full py-2.5 bg-slate-200 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed";

  const feedback = document.getElementById("t-fitb-feedback");
  feedback.classList.remove("hidden");

  const isCorrect = userAns === correctWord.toLowerCase();

  let exampleText =
    word.example || "My mother is a homemaker and takes care of our family.";
  const escapedWord = correctWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const boundaryRegex = new RegExp(`\\b${escapedWord}\\b`, "gi");
  let solvedSentence = exampleText.replace(
    boundaryRegex,
    `<span class="px-2 py-0.5 bg-emerald-100 border border-emerald-500 rounded text-emerald-800 font-black font-mono mx-1 animate-pulse">${correctWord}</span>`,
  );
  document.getElementById("t-fitb-sentence-container").innerHTML =
    solvedSentence;

  if (isCorrect) {
    window.teacherState.gameCorrectAnswers++;
    document.getElementById("t-fitb-correct-count").textContent =
      window.teacherState.gameCorrectAnswers;
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
    feedback.textContent = "🥳 Tuyệt vời! Từ điền hoàn toàn chuẩn xác!";
    feedback.className =
      "p-3 rounded-xl text-xs font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200";
  } else {
    window.teacherState.gameWrongAnswers++;
    document.getElementById("t-fitb-wrong-count").textContent =
      window.teacherState.gameWrongAnswers;
    feedback.innerHTML = `😢 Đáp án đúng cần điền là: <strong class="text-rose-700 uppercase font-mono">${correctWord}</strong>.`;
    feedback.className =
      "p-3 rounded-xl text-xs font-bold text-center bg-rose-50 text-rose-700 border border-rose-200";
  }

  document.getElementById("t-fitb-next-btn").classList.remove("hidden");
  document.getElementById("t-fitb-next-btn").onclick = () => {
    window.teacherState.gameQuestionIndex++;
    window.loadTeacherGameQuestion();
  };
};

// ==========================================
// 9. HIỂN THỊ BÁO CÁO TỔNG KẾT (PLAYTEST REPORT CARD)
// ==========================================
window.showTeacherGameReport = (score, total) => {
  document.getElementById("t-game-quiz-screen").classList.add("hidden");
  document.getElementById("t-game-scramble-screen").classList.add("hidden");
  document.getElementById("t-game-fitb-screen").classList.add("hidden");

  document.getElementById("t-game-report-screen").classList.remove("hidden");
  document.getElementById("t-report-score").textContent = `${score}/${total}`;

  const percent = (score / total) * 100;
  const titleEl = document.getElementById("t-report-title");
  const subtitleEl = document.getElementById("t-report-subtitle");
  const badgeEl = document.getElementById("t-report-badge");

  if (percent === 100) {
    titleEl.textContent = "🎉 Thử nghiệm Tuyệt Đối! 🎉";
    subtitleEl.textContent =
      "Trải nghiệm game mượt mà, từ vựng hoàn toàn chính xác!";
    badgeEl.textContent = "🏆 Giáo viên siêu phàm";
    badgeEl.className =
      "text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block mt-3 border border-amber-200";

    let end = Date.now() + 1.5 * 1000;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } else if (percent >= 80) {
    titleEl.textContent = "🌟 Kết quả dùng thử Xuất Sắc 🌟";
    subtitleEl.textContent =
      "Trò chơi học tập sinh động và phản hồi cực kỳ nhanh chóng!";
    badgeEl.textContent = "🏅 Siêu sao Playtester";
    badgeEl.className =
      "text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mt-3 border border-emerald-200";
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  } else {
    titleEl.textContent = "👍 Hoàn thành lượt dùng thử! 👍";
    subtitleEl.textContent =
      "Giáo viên đã hoàn thành buổi đánh giá trải nghiệm trò chơi học tập của học sinh.";
    badgeEl.textContent = "🎖️ Giáo viên tâm huyết";
    badgeEl.className =
      "text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full inline-block mt-3 border border-blue-200";
  }

  const retryBtn = document.getElementById("t-report-retry-btn");
  retryBtn.onclick = () => {
    window.startTeacherGame(window.teacherState.gameType);
  };
};

// ==========================================
// THI THỬ & XEM TRƯỚC ĐỀ THI DÀNH CHO GIÁO VIÊN
// ==========================================

window.teacherPreviewState = {
  examId: null,
  questions: [],
  answers: {},
  graded: false,
};

window.previewExamForTeacher = async (examId) => {
  try {
    const data = await window.apiFetch(`/api/exams/${examId}`);
    window.teacherPreviewState = {
      examId: examId,
      questions: data.questions,
      answers: {},
      graded: false,
    };

    // Cập nhật tiêu đề & thông tin modal
    document.getElementById("preview-exam-title").textContent = data.exam.title;
    const typeText =
      data.exam.exam_type === "thpt_qg"
        ? "Luyện thi THPT QG"
        : data.exam.exam_type.startsWith("hsg_")
          ? "Thi Học Sinh Giỏi"
          : "Kiểm Tra Học Kỳ";
    document.getElementById("preview-exam-info").textContent =
      `Lớp ${data.exam.grade} | Thời lượng: ${data.exam.duration_minutes} phút | Số câu hỏi: ${data.questions.length} câu`;

    // Huy hiệu trạng thái
    const isDraft = data.exam.status === "draft";
    const statusBadge = document.getElementById("preview-exam-status-badge");
    const assignBtn = document.getElementById("preview-assign-btn");
    const withdrawBtn = document.getElementById("preview-withdraw-btn");

    if (isDraft) {
      statusBadge.className =
        "px-2.5 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full uppercase border border-orange-200";
      statusBadge.textContent = "Bản nháp (Chưa giao)";
      assignBtn.classList.remove("hidden");
      assignBtn.innerHTML =
        '<i data-lucide="send" class="w-4 h-4"></i> Giao đề';
      assignBtn.onclick = () => window.manageExamAssignment(examId);
      if (withdrawBtn) withdrawBtn.classList.add("hidden");
    } else {
      let groupsText = "";
      try {
        const groups =
          typeof data.exam.assigned_groups === "string"
            ? JSON.parse(data.exam.assigned_groups)
            : data.exam.assigned_groups || [];
        if (groups.includes("all")) groupsText = "Tất cả";
        else if (groups.length > 0) groupsText = "Khối " + groups.join(", ");
      } catch (err) {}

      statusBadge.className =
        "px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase border border-emerald-200";
      statusBadge.textContent =
        "Đã giao" + (groupsText ? " " + groupsText : "");
      assignBtn.classList.remove("hidden");
      assignBtn.innerHTML =
        '<i data-lucide="send" class="w-4 h-4"></i> Quản lý Giao đề';
      assignBtn.onclick = () => window.manageExamAssignment(examId);
      if (withdrawBtn) {
        withdrawBtn.classList.add("hidden");
      }
    }

    // Kết xuất câu hỏi
    const container = document.getElementById(
      "preview-exam-questions-container",
    );
    container.innerHTML = "";

    const grouped = window.groupQuestions(data.questions);
    grouped.forEach((g, gIdx) => {
      if (g.type === "single") {
        const qNum = g.original_num;
        const div = document.createElement("div");
        div.className =
          "bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4";
        div.id = `preview-question-block-${qNum}`;
        div.innerHTML = `
          <div class="flex items-center gap-2 border-b border-slate-50 pb-2">
            <span class="w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              ${qNum}
            </span>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${g.part || "Trắc nghiệm"}</span>
          </div>
          <p class="font-semibold text-slate-800 leading-relaxed text-sm whitespace-pre-line">${g.question_text}</p>
          
          <div class="space-y-2.5">
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-A">
              <input type="radio" name="preview-q-${qNum}" value="A" onclick="window.selectPreviewOption(${qNum}, 'A')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>A.</strong> <span>${g.option_a}</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-B">
              <input type="radio" name="preview-q-${qNum}" value="B" onclick="window.selectPreviewOption(${qNum}, 'B')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>B.</strong> <span>${g.option_b}</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-C">
              <input type="radio" name="preview-q-${qNum}" value="C" onclick="window.selectPreviewOption(${qNum}, 'C')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>C.</strong> <span>${g.option_c}</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-D">
              <input type="radio" name="preview-q-${qNum}" value="D" onclick="window.selectPreviewOption(${qNum}, 'D')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>D.</strong> <span>${g.option_d}</span>
            </label>
          </div>
          
          <!-- Phần giải thích ẩn ban đầu -->
          <div id="preview-explanation-${qNum}" class="hidden p-4 rounded-xl text-xs space-y-1"></div>
        `;
        container.appendChild(div);
      } else if (g.type === "reading_group") {
        const groupBlock = document.createElement("div");
        groupBlock.className =
          "bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6";

        groupBlock.innerHTML = `
          <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <i data-lucide="book-open" class="w-3.5 h-3.5"></i> Bài Đọc Hiểu (Reading Comprehension)
            </span>
          </div>
          <div class="bg-slate-50 border border-slate-150 rounded-2xl p-5 leading-relaxed text-slate-800 text-sm whitespace-pre-line font-medium max-h-[250px] overflow-y-auto">
            ${g.passage}
          </div>
          <div class="space-y-4" id="preview-solutions-sub-container-${gIdx}">
          </div>
        `;
        container.appendChild(groupBlock);

        const subContainer = groupBlock.querySelector(
          `#preview-solutions-sub-container-${gIdx}`,
        );
        g.subQuestions.forEach((subQ) => {
          const qNum = subQ.original_num;
          const subDiv = document.createElement("div");
          subDiv.className =
            "p-5 rounded-2xl border border-slate-100 bg-slate-50/10 space-y-3";
          subDiv.id = `preview-question-block-${qNum}`;
          subDiv.innerHTML = `
            <div class="flex items-center gap-2 border-b border-slate-50 pb-1.5">
              <span class="w-5 h-5 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                ${qNum}
              </span>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Đọc hiểu</span>
            </div>
            <p class="font-semibold text-slate-800 text-sm whitespace-pre-line">${subQ.question_text}</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-A">
                <input type="radio" name="preview-q-${qNum}" value="A" onclick="window.selectPreviewOption(${qNum}, 'A')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">A.</strong> <span>${subQ.option_a}</span>
              </label>
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-B">
                <input type="radio" name="preview-q-${qNum}" value="B" onclick="window.selectPreviewOption(${qNum}, 'B')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">B.</strong> <span>${subQ.option_b}</span>
              </label>
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-C">
                <input type="radio" name="preview-q-${qNum}" value="C" onclick="window.selectPreviewOption(${qNum}, 'C')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">C.</strong> <span>${subQ.option_c}</span>
              </label>
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all option-label-D">
                <input type="radio" name="preview-q-${qNum}" value="D" onclick="window.selectPreviewOption(${qNum}, 'D')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">D.</strong> <span>${subQ.option_d}</span>
              </label>
            </div>

            <!-- Phần giải thích ẩn ban đầu -->
            <div id="preview-explanation-${qNum}" class="hidden p-4 rounded-xl text-xs space-y-1"></div>
          `;
          subContainer.appendChild(subDiv);
        });
      }
    });

    // Reset nút và hiển thị modal
    document.getElementById("preview-submit-btn").disabled = false;
    document.getElementById("preview-submit-btn").innerHTML =
      `<i data-lucide="check-circle" class="w-4 h-4"></i> Chấm điểm thi thử`;

    document
      .getElementById("teacher-exam-preview-modal")
      .classList.remove("hidden");
    document.getElementById("teacher-exam-preview-modal").classList.add("flex");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    alert("Không thể mở đề thi để thi thử: " + err.message);
  }
};

window.selectPreviewOption = (questionNum, option) => {
  if (window.teacherPreviewState.graded) return;
  window.teacherPreviewState.answers[questionNum] = option;
};

window.closeTeacherExamPreviewModal = () => {
  document.getElementById("teacher-exam-preview-modal").classList.add("hidden");
  document
    .getElementById("teacher-exam-preview-modal")
    .classList.remove("flex");
};

window.resetTeacherPreviewExam = () => {
  const examId = window.teacherPreviewState.examId;
  if (examId) {
    window.previewExamForTeacher(examId);
  }
};

window.gradeTeacherPreviewExam = () => {
  if (window.teacherPreviewState.graded) return;
  window.teacherPreviewState.graded = true;

  const { questions, answers } = window.teacherPreviewState;
  let correctCount = 0;

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    const userAnswer = answers[qNum];
    const correctAnswer = q.correct_answer
      ? String(q.correct_answer).trim().toUpperCase()
      : "";

    const block = document.getElementById(`preview-question-block-${qNum}`);

    // Đổ màu các lựa chọn đúng / sai
    const getLabel = (opt) => block.querySelector(`.option-label-${opt}`);

    const correctLabel = correctAnswer ? getLabel(correctAnswer) : null;
    if (correctLabel) {
      correctLabel.classList.add(
        "bg-emerald-50",
        "border-emerald-500",
        "text-emerald-900",
        "font-medium",
      );
    }

    if (userAnswer) {
      if (userAnswer === correctAnswer) {
        correctCount++;
      } else {
        const userLabel = getLabel(userAnswer);
        if (userLabel) {
          userLabel.classList.add(
            "bg-rose-50",
            "border-rose-400",
            "text-rose-900",
          );
        }
      }
    }

    // Khóa các ô chọn để không cho chỉnh sửa sau khi nộp
    block.querySelectorAll('input[type="radio"]').forEach((inp) => {
      inp.disabled = true;
    });

    // Hiển thị giải thích đáp án
    const expDiv = document.getElementById(`preview-explanation-${qNum}`);
    expDiv.classList.remove("hidden");
    if (userAnswer === correctAnswer) {
      expDiv.className =
        "p-4 rounded-xl text-xs space-y-1 bg-emerald-50 border border-emerald-100 text-emerald-800";
      expDiv.innerHTML = `
        <div class="flex items-center gap-1.5 font-bold mb-1">
          <i data-lucide="check" class="w-4 h-4 text-emerald-600"></i>
          <span>Đáp án hoàn toàn chính xác!</span>
        </div>
        <p><strong>Đáp án đúng:</strong> ${correctAnswer}</p>
        <p><strong>Giải thích chi tiết:</strong> ${q.explanation || "Không có giải thích."}</p>
      `;
    } else {
      expDiv.className =
        "p-4 rounded-xl text-xs space-y-1 bg-rose-50 border border-rose-100 text-rose-800";
      expDiv.innerHTML = `
        <div class="flex items-center gap-1.5 font-bold mb-1">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>Lựa chọn chưa chính xác!</span>
        </div>
        <p><strong>Đáp án đúng:</strong> <span class="bg-emerald-100 px-1.5 py-0.5 rounded font-black text-emerald-700">${correctAnswer}</span></p>
        <p><strong>Giải thích chi tiết:</strong> ${q.explanation || "Không có giải thích."}</p>
      `;
    }
  });

  alert(
    `Cô đã hoàn thành thi thử! Kết quả: Đúng ${correctCount}/${questions.length} câu.`,
  );
  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.manageExamAssignment = async (examId) => {
  const exam = window.teacherExamsList?.find((e) => e.id === examId);
  if (!exam) return;

  const modal = document.getElementById("assign-exam-modal");
  const allCheckbox = document.getElementById("assign-all");
  const gradeCheckboxes = document.querySelectorAll(".assign-grade-cb");
  const confirmBtn = document.getElementById("btn-confirm-assign");

  if (!modal) return;

  let assignedGroups = [];
  try {
    assignedGroups =
      typeof exam.assigned_groups === "string"
        ? JSON.parse(exam.assigned_groups)
        : exam.assigned_groups || [];
  } catch (e) {
    assignedGroups = [];
  }

  // Khôi phục trạng thái form
  if (assignedGroups.includes("all")) {
    allCheckbox.checked = true;
    gradeCheckboxes.forEach((cb) => {
      cb.checked = false;
      cb.disabled = true;
    });
  } else {
    allCheckbox.checked = false;
    gradeCheckboxes.forEach((cb) => {
      cb.disabled = false;
      cb.checked = assignedGroups.includes(cb.value);
    });
  }

  allCheckbox.onchange = (e) => {
    gradeCheckboxes.forEach((cb) => {
      if (e.target.checked) cb.checked = false;
      cb.disabled = e.target.checked;
    });
  };

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  confirmBtn.onclick = async () => {
    let newGroups = [];
    if (allCheckbox.checked) {
      newGroups = ["all"];
    } else {
      gradeCheckboxes.forEach((cb) => {
        if (cb.checked) newGroups.push(cb.value);
      });
    }

    const newStatus = newGroups.length > 0 ? "assigned" : "draft";
    const confirmMessage =
      newGroups.length > 0
        ? "Cô có chắc chắn muốn giao/cập nhật đề thi này cho các đối tượng đã chọn?"
        : "Bỏ chọn tất cả sẽ thu hồi đề thi này (chuyển về dạng nháp). Cô có chắc chắn?";

    const confirmed = await window.showConfirm({
      title: "Xác nhận",
      message: confirmMessage,
      type: newGroups.length > 0 ? "success" : "warning",
    });

    if (!confirmed) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");

    try {
      const res = await window.apiFetch(`/api/exams/${examId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus, assigned_groups: newGroups }),
      });
      alert(res.message || "Cập nhật giao đề thành công!");
      if (window.closeTeacherExamPreviewModal)
        window.closeTeacherExamPreviewModal();
      window.loadTeacherExams();
    } catch (err) {
      alert(err.message || "Lỗi khi giao đề thi");
    }
  };
};

window.assignExamToStudents = window.manageExamAssignment;
window.withdrawExamFromStudents = window.manageExamAssignment;

// ==========================================
// TỰ SOẠN ĐỀ THI THỦ CÔNG & TRÍCH XUẤT WORD
// ==========================================

window.editingExamId = null;

// Hàm helper nhóm câu hỏi có bài đọc hiểu dùng chung
window.groupQuestions = (questions) => {
  const grouped = [];
  let currentPassage = null;
  let currentGroup = null;

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    if (q.question_text && q.question_text.startsWith("[READING_PASSAGE]")) {
      const parts = q.question_text
        .substring("[READING_PASSAGE]".length)
        .split("|||");
      const passage = parts[0] || "";
      const subQuestionText = parts.slice(1).join("|||") || "";

      if (currentPassage === passage && currentGroup) {
        currentGroup.subQuestions.push({
          ...q,
          original_num: qNum,
          question_text: subQuestionText,
        });
      } else {
        currentPassage = passage;
        currentGroup = {
          type: "reading_group",
          passage: passage,
          part: q.part || "Đọc hiểu",
          subQuestions: [
            {
              ...q,
              original_num: qNum,
              question_text: subQuestionText,
            },
          ],
        };
        grouped.push(currentGroup);
      }
    } else {
      currentPassage = null;
      currentGroup = null;
      grouped.push({
        type: "single",
        original_num: qNum,
        ...q,
      });
    }
  });

  return grouped;
};

window.openManualExamModal = (editingExam = null) => {
  const titleEl = document.getElementById("manual-modal-title");
  const form = document.getElementById("manual-exam-form");
  const container = document.getElementById("manual-questions-container");
  container.innerHTML = "";

  form.reset();

  if (editingExam) {
    window.editingExamId = editingExam.exam.id;
    titleEl.textContent = "Chỉnh sửa đề thi";
    document.getElementById("manual-exam-title").value = editingExam.exam.title;
    document.getElementById("manual-exam-type").value =
      editingExam.exam.exam_type || "thpt_qg";
    document.getElementById("manual-exam-grade").value =
      editingExam.exam.grade || "12";
    document.getElementById("manual-exam-duration").value =
      editingExam.exam.duration_minutes || 45;
    document.getElementById("manual-exam-difficulty").value =
      editingExam.exam.difficulty || "medium";

    if (editingExam.questions && editingExam.questions.length > 0) {
      const grouped = window.groupQuestions(editingExam.questions);
      grouped.forEach((item) => {
        if (item.type === "single") {
          window.addManualQuestionField(item);
        } else if (item.type === "reading_group") {
          window.addManualReadingGroupField(item);
        }
      });
    } else {
      window.addManualQuestionField();
    }
  } else {
    window.editingExamId = null;
    titleEl.textContent = "Tự soạn đề thi thủ công";
    window.addManualQuestionField();
  }

  document.getElementById("manual-exam-modal").classList.remove("hidden");
  document.getElementById("manual-exam-modal").classList.add("flex");
};

window.closeManualExamModal = () => {
  document.getElementById("manual-exam-modal").classList.add("hidden");
  document.getElementById("manual-exam-modal").classList.remove("flex");
};

window.addManualQuestionField = (qData = null) => {
  const container = document.getElementById("manual-questions-container");
  const div = document.createElement("div");
  div.className =
    "manual-entry-block manual-question-block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative";
  div.dataset.type = "single";

  div.innerHTML = `
    <button type="button" onclick="this.parentElement.remove(); window.updateManualQuestionNumbers();" class="absolute top-4 right-4 text-rose-500 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer">
      <i data-lucide="trash-2" class="w-4 h-4"></i> Xóa câu này
    </button>

    <div class="flex items-center gap-2 border-b border-slate-50 pb-2">
      <span class="question-number-badge w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        -
      </span>
      <select class="question-part px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 focus:outline-none border border-slate-200">
        <option value="Trắc nghiệm" ${qData && qData.part === "Trắc nghiệm" ? "selected" : ""}>Trắc nghiệm chung</option>
        <option value="Pronunciation" ${qData && qData.part === "Pronunciation" ? "selected" : ""}>Phát âm (Pronunciation)</option>
        <option value="Stress" ${qData && qData.part === "Stress" ? "selected" : ""}>Trọng âm (Stress)</option>
        <option value="Vocabulary" ${qData && qData.part === "Vocabulary" ? "selected" : ""}>Từ vựng (Vocabulary)</option>
        <option value="Grammar" ${qData && qData.part === "Grammar" ? "selected" : ""}>Ngữ pháp (Grammar)</option>
        <option value="Reading" ${qData && qData.part === "Reading" ? "selected" : ""}>Đọc hiểu (Reading)</option>
      </select>
    </div>

    <div>
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nội dung câu hỏi</label>
      <textarea required class="question-text w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500" rows="2" placeholder="Ví dụ: Which of the following has a different underlined sound?">${qData ? qData.question_text : ""}</textarea>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lựa chọn A</label>
        <input type="text" required class="option-a w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value="${qData ? qData.option_a : ""}" placeholder="Lựa chọn A">
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lựa chọn B</label>
        <input type="text" required class="option-b w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value="${qData ? qData.option_b : ""}" placeholder="Lựa chọn B">
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lựa chọn C</label>
        <input type="text" required class="option-c w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value="${qData ? qData.option_c : ""}" placeholder="Lựa chọn C">
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lựa chọn D</label>
        <input type="text" required class="option-d w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value="${qData ? qData.option_d : ""}" placeholder="Lựa chọn D">
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Đáp án đúng</label>
        <select class="correct-answer w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none">
          <option value="A" ${qData && qData.correct_answer === "A" ? "selected" : ""}>Đáp án A</option>
          <option value="B" ${qData && qData.correct_answer === "B" ? "selected" : ""}>Đáp án B</option>
          <option value="C" ${qData && qData.correct_answer === "C" ? "selected" : ""}>Đáp án C</option>
          <option value="D" ${qData && qData.correct_answer === "D" ? "selected" : ""}>Đáp án D</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Giải thích lời giải</label>
        <input type="text" class="explanation w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value="${qData ? qData.explanation : ""}" placeholder="Ví dụ: Chọn C vì đuôi -ed phát âm là /t/, các từ còn lại phát âm là /d/.">
      </div>
    </div>
  `;

  container.appendChild(div);
  window.updateManualQuestionNumbers();
  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.addManualReadingGroupField = (groupData = null) => {
  const container = document.getElementById("manual-questions-container");

  const div = document.createElement("div");
  div.className =
    "manual-entry-block manual-reading-group-block bg-emerald-50/20 p-6 rounded-3xl border-2 border-emerald-100 hover:border-emerald-200 shadow-sm space-y-4 relative transition-all";
  div.dataset.type = "reading_group";

  div.innerHTML = `
    <button type="button" onclick="this.parentElement.remove(); window.updateManualQuestionNumbers();" class="absolute top-4 right-4 text-rose-500 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer">
      <i data-lucide="trash-2" class="w-4 h-4"></i> Xóa cả bài đọc này
    </button>

    <div class="flex items-center gap-2 border-b border-emerald-100 pb-3">
      <span class="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
        <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
      </span>
      <span class="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Bài đọc hiểu chùm (One Passage, Multiple Questions)</span>
    </div>

    <div>
      <label class="block text-xs font-extrabold uppercase tracking-wider text-emerald-600 mb-1.5">Nội dung đoạn văn đọc hiểu chung (Reading Passage)</label>
      <textarea required class="reading-passage-text w-full px-3 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400" rows="6" placeholder="Nhập đoạn văn đọc hiểu chung vào đây...">${groupData ? groupData.passage : ""}</textarea>
    </div>

    <div class="border-t border-emerald-100 pt-4 space-y-4">
      <h5 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
        <i data-lucide="help-circle" class="w-3.5 h-3.5"></i> Câu hỏi trắc nghiệm của bài đọc này
      </h5>
      <div class="sub-questions-container space-y-4">
        <!-- Render danh sách câu hỏi con của bài đọc này -->
      </div>

      <button type="button" onclick="window.addManualSubQuestionToGroup(this.parentElement)" class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm câu hỏi trắc nghiệm cho bài đọc này
      </button>
    </div>
  `;

  container.appendChild(div);

  const subContainer = div.querySelector(".sub-questions-container");
  if (
    groupData &&
    groupData.subQuestions &&
    groupData.subQuestions.length > 0
  ) {
    groupData.subQuestions.forEach((subQ) => {
      window.addManualSubQuestionToGroup(subContainer, subQ);
    });
  } else {
    window.addManualSubQuestionToGroup(subContainer);
  }

  window.updateManualQuestionNumbers();
  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.addManualSubQuestionToGroup = (targetOrContainer, subQData = null) => {
  let subContainer;
  if (targetOrContainer.classList.contains("sub-questions-container")) {
    subContainer = targetOrContainer;
  } else {
    subContainer = targetOrContainer.querySelector(".sub-questions-container");
  }

  const subQDiv = document.createElement("div");
  subQDiv.className =
    "manual-sub-question-block bg-white p-4 rounded-xl border border-slate-200 relative space-y-3 shadow-inner";

  subQDiv.innerHTML = `
    <button type="button" onclick="this.parentElement.remove(); window.updateManualQuestionNumbers();" class="absolute top-3 right-3 text-rose-500 hover:text-rose-700 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer">
      <i data-lucide="x" class="w-3 h-3"></i> Xóa câu con này
    </button>

    <div class="flex items-center gap-1.5 border-b border-slate-50 pb-1">
      <span class="sub-question-number-badge w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
        -
      </span>
      <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Câu hỏi con</span>
    </div>

    <div>
      <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Nội dung câu hỏi</label>
      <input type="text" required class="sub-question-text w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" value="${subQData ? subQData.question_text : ""}" placeholder="Nhập câu hỏi trắc nghiệm của bài đọc...">
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Lựa chọn A</label>
        <input type="text" required class="sub-option-a w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" value="${subQData ? subQData.option_a : ""}" placeholder="Lựa chọn A">
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Lựa chọn B</label>
        <input type="text" required class="sub-option-b w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" value="${subQData ? subQData.option_b : ""}" placeholder="Lựa chọn B">
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Lựa chọn C</label>
        <input type="text" required class="sub-option-c w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" value="${subQData ? subQData.option_c : ""}" placeholder="Lựa chọn C">
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Lựa chọn D</label>
        <input type="text" required class="sub-option-d w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" value="${subQData ? subQData.option_d : ""}" placeholder="Lựa chọn D">
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đáp án đúng</label>
        <select class="sub-correct-answer w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none">
          <option value="A" ${subQData && subQData.correct_answer === "A" ? "selected" : ""}>Đáp án A</option>
          <option value="B" ${subQData && subQData.correct_answer === "B" ? "selected" : ""}>Đáp án B</option>
          <option value="C" ${subQData && subQData.correct_answer === "C" ? "selected" : ""}>Đáp án C</option>
          <option value="D" ${subQData && subQData.correct_answer === "D" ? "selected" : ""}>Đáp án D</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Giải thích lời giải</label>
        <input type="text" class="sub-explanation w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" value="${subQData ? subQData.explanation : ""}" placeholder="Ví dụ: Chọn A vì theo đoạn 2...">
      </div>
    </div>
  `;

  subContainer.appendChild(subQDiv);
  window.updateManualQuestionNumbers();
  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.updateManualQuestionNumbers = () => {
  const container = document.getElementById("manual-questions-container");
  const entryBlocks = container.querySelectorAll(".manual-entry-block");

  let currentNum = 1;

  entryBlocks.forEach((block) => {
    const type = block.dataset.type;
    if (type === "single") {
      const badge = block.querySelector(".question-number-badge");
      if (badge) badge.textContent = currentNum;
      currentNum++;
    } else if (type === "reading_group") {
      const subBlocks = block.querySelectorAll(".manual-sub-question-block");
      subBlocks.forEach((subBlock) => {
        const badge = subBlock.querySelector(".sub-question-number-badge");
        if (badge) badge.textContent = currentNum;
        currentNum++;
      });
    }
  });

  const totalQuestions = currentNum - 1;
  document.getElementById("manual-question-count-badge").textContent =
    `${totalQuestions} câu hỏi`;
};

window.saveManualExam = async (event) => {
  event.preventDefault();

  const title = document.getElementById("manual-exam-title").value;
  const exam_type = document.getElementById("manual-exam-type").value;
  const grade = Number(document.getElementById("manual-exam-grade").value);
  const duration_minutes = Number(
    document.getElementById("manual-exam-duration").value,
  );
  const difficulty = document.getElementById("manual-exam-difficulty").value;

  const container = document.getElementById("manual-questions-container");
  const entryBlocks = container.querySelectorAll(".manual-entry-block");

  if (entryBlocks.length === 0) {
    alert("Đề thi phải có ít nhất 1 câu hỏi.");
    return;
  }

  const questions = [];

  entryBlocks.forEach((block) => {
    const type = block.dataset.type;
    if (type === "single") {
      questions.push({
        part: block.querySelector(".question-part").value,
        question_text: block.querySelector(".question-text").value,
        option_a: block.querySelector(".option-a").value,
        option_b: block.querySelector(".option-b").value,
        option_c: block.querySelector(".option-c").value,
        option_d: block.querySelector(".option-d").value,
        correct_answer: block.querySelector(".correct-answer").value,
        explanation: block.querySelector(".explanation").value,
      });
    } else if (type === "reading_group") {
      const passage = block.querySelector(".reading-passage-text").value.trim();
      const subBlocks = block.querySelectorAll(".manual-sub-question-block");

      subBlocks.forEach((subBlock) => {
        questions.push({
          part: "Reading",
          question_text: `[READING_PASSAGE]${passage}|||${subBlock.querySelector(".sub-question-text").value}`,
          option_a: subBlock.querySelector(".sub-option-a").value,
          option_b: subBlock.querySelector(".sub-option-b").value,
          option_c: subBlock.querySelector(".sub-option-c").value,
          option_d: subBlock.querySelector(".sub-option-d").value,
          correct_answer: subBlock.querySelector(".sub-correct-answer").value,
          explanation: subBlock.querySelector(".sub-explanation").value,
        });
      });
    }
  });

  if (questions.length === 0) {
    alert("Đề thi phải có ít nhất 1 câu hỏi.");
    return;
  }

  const bodyData = {
    title,
    exam_type,
    grade,
    duration_minutes,
    difficulty,
    questions,
    is_ai_generated: false,
  };

  try {
    let res;
    if (window.editingExamId) {
      res = await window.apiFetch(`/api/exams/${window.editingExamId}`, {
        method: "PUT",
        body: JSON.stringify(bodyData),
      });
      alert(res.message || "Cập nhật đề thi thành công!");
    } else {
      res = await window.apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify(bodyData),
      });
      alert("Khởi tạo đề thi thủ công thành công!");
    }

    window.closeManualExamModal();
    window.loadTeacherExams();
  } catch (err) {
    alert("Không thể lưu đề thi: " + err.message);
  }
};

window.editCurrentExamFromPreview = async () => {
  const examId = window.teacherPreviewState.examId;
  if (!examId) return;

  try {
    const examDetail = await window.apiFetch(`/api/exams/${examId}`);
    window.closeTeacherExamPreviewModal();
    window.openManualExamModal(examDetail);
  } catch (err) {
    alert("Không thể lấy thông tin đề thi để sửa đổi: " + err.message);
  }
};

window.withdrawExamFromPreview = () => {
  const examId = window.teacherPreviewState.examId;
  if (examId) {
    window.withdrawExamFromStudents(examId);
  }
};

window.handleWordFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const arrayBuffer = e.target.result;
    mammoth
      .extractRawText({ arrayBuffer: arrayBuffer })
      .then(function (result) {
        const text = result.value; // The raw text
        document.getElementById("parse-exam-raw").value = text;
        alert(
          "Đã trích xuất nội dung từ file Word thành công! Cô có thể xem lại, chỉnh sửa hoặc bổ sung trực tiếp bên dưới.",
        );
      })
      .catch(function (err) {
        console.error("Lỗi khi trích xuất Word:", err);
        alert(
          "Có lỗi xảy ra khi trích xuất file Word. Cô vui lòng thử lại hoặc dán văn bản trực tiếp.",
        );
      });
  };
  reader.readAsArrayBuffer(file);
};

// ==========================================
// 4. QUẢN LÝ HỎI ĐÁP CỦA HỌC SINH (TEACHER)
// ==========================================

window.loadTeacherQna = async () => {
  const container = document.getElementById("t-qna-list");
  try {
    const list = await window.apiFetch("/api/qna");
    if (list.length === 0) {
      container.innerHTML =
        '<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Chưa có câu hỏi nào từ học sinh.</div>';
      return;
    }

    container.innerHTML = list
      .map((q) => {
        let answerHtml = "";
        if (q.status === "ai_answered" && q.ai_answer) {
          answerHtml = `
          <div class="mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100 flex gap-3">
            <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm shrink-0">👩‍🏫</div>
            <div class="text-sm text-slate-800 leading-relaxed w-full">
              <strong class="text-brand-700 block mb-1">Cô Hiền (AI):</strong>
              ${q.ai_answer.replace(/\n/g, "<br>")}
              <button onclick="overrideTeacherAnswer(${q.id}, '${escapeQuote(q.ai_answer)}')" class="mt-2 text-xs text-brand-600 hover:underline">Sửa lại câu trả lời này</button>
            </div>
          </div>
        `;
        } else if (q.status === "teacher_answered" && q.teacher_answer) {
          answerHtml = `
          <div class="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0">👩‍🏫</div>
            <div class="text-sm text-slate-800 leading-relaxed w-full">
              <strong class="text-emerald-700 block mb-1">Cô Hiền (Trực tiếp):</strong>
              ${q.teacher_answer.replace(/\n/g, "<br>")}
            </div>
          </div>
        `;
        } else {
          answerHtml = `
          <div class="mt-4 flex items-center gap-2">
            <button onclick="openTeacherAnswerForm(${q.id})" class="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-sm hover:bg-brand-200 transition-all font-medium">Cô sẽ trả lời</button>
            <button onclick="requestAiAnswerTeacher(${q.id})" class="px-3 py-1.5 border border-brand-200 text-brand-600 rounded-lg text-sm hover:bg-brand-50 transition-all flex items-center gap-1">
              <i data-lucide="bot" class="w-4 h-4"></i> Yêu cầu AI trả lời
            </button>
          </div>
          <div id="t-answer-form-${q.id}" class="hidden mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
             <textarea id="t-answer-input-${q.id}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 min-h-[80px]" placeholder="Nhập câu trả lời của cô..."></textarea>
             <div class="flex justify-end mt-2">
               <button onclick="submitTeacherAnswer(${q.id})" class="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 font-bold">Gửi trả lời</button>
             </div>
          </div>
        `;
        }

        return `
        <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative">
          <div class="absolute top-4 right-4 text-xs text-slate-400">${new Date(q.created_at).toLocaleDateString("vi-VN")}</div>
          <div class="text-sm text-brand-600 font-bold mb-2 flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4"></i> ${q.student_name} <span class="text-slate-400 font-normal">(${q.class_name || "Không rõ lớp"})</span>
          </div>
          <div class="text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">${q.question_text.replace(/\n/g, "<br>")}</div>
          ${answerHtml}
        </div>
      `;
      })
      .join("");

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">Lỗi: ${err.message}</div>`;
  }
};

window.escapeQuote = (str) => {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
};

window.openTeacherAnswerForm = (qId) => {
  document.getElementById(`t-answer-form-${qId}`).classList.remove("hidden");
};

window.overrideTeacherAnswer = (qId, aiAnswerText) => {
  const answerFormHTML = `
    <div class="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
       <textarea id="t-answer-input-${qId}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 min-h-[80px]">${aiAnswerText}</textarea>
       <div class="flex justify-end mt-2">
         <button onclick="submitTeacherAnswer(${qId})" class="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 font-bold">Lưu thay đổi</button>
       </div>
    </div>
  `;
  // Thay thế node cha
  const itemDiv = document
    .querySelector(`button[onclick*="overrideTeacherAnswer(${qId}"]`)
    .closest(".p-4.bg-white");
  if (itemDiv) {
    itemDiv.innerHTML += answerFormHTML;
  }
};

window.submitTeacherAnswer = async (qId) => {
  const input = document.getElementById(`t-answer-input-${qId}`);
  if (!input) return;
  const teacher_answer = input.value.trim();
  if (!teacher_answer) return;

  try {
    input.disabled = true;
    await window.apiFetch(`/api/qna/${qId}/teacher-answer`, {
      method: "POST",
      body: JSON.stringify({ teacher_answer }),
    });
    alert("Đã gửi câu trả lời thành công!");
    window.loadTeacherQna();
  } catch (err) {
    alert(err.message);
    input.disabled = false;
  }
};

window.requestAiAnswerTeacher = async (questionId) => {
  try {
    alert("Đang yêu cầu AI trả lời...");
    await window.apiFetch(`/api/qna/${questionId}/ai-answer`, {
      method: "POST",
    });
    alert("AI đã trả lời thành công!");
    window.loadTeacherQna();
  } catch (err) {
    alert(err.message);
  }
};
