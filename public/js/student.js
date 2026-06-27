/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// TRẠNG THÁI KHỞI TẠO CỦA HỌC SINH
// ==========================================
window.studentState = {
  vocabList: [],
  vocabIndex: 0,
  
  // Game từ vựng
  gameWords: [],
  gameIndex: 0,
  gameCorrect: 0,
  gameWrong: 0,

  // Làm bài thi
  activeExam: null,
  activeQuestions: [],
  answers: {},
  examTimerInterval: null,
};


// ==========================================
// 2. HỌC TỪ VỰNG - FLASHCARDS & GAMES
// ==========================================

window.loadStudentVocabulary = async () => {
  try {
    // Tải toàn bộ từ vựng, mặc định load Khối 10 lên học trước
    window.studentState.vocabList = await window.apiFetch('/api/vocabulary');
    window.startFlashcardStudy();
  } catch (err) {
    alert('Không thể tải từ vựng: ' + err.message);
  }
};

// Chuyển đổi qua lại giữa Flashcard 3D và Game
window.switchVocabMode = (mode) => {
  const btnFc = document.getElementById('btn-mode-flashcard');
  const btnGame = document.getElementById('btn-mode-game');
  const fcArea = document.getElementById('vocab-flashcard-area');
  const gameArea = document.getElementById('vocab-game-area');

  if (mode === 'flashcard') {
    btnFc.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow";
    btnGame.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500";
    fcArea.classList.remove('hidden');
    gameArea.classList.add('hidden');
  } else {
    btnGame.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow";
    btnFc.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500";
    gameArea.classList.remove('hidden');
    fcArea.classList.add('hidden');
    
    // Khởi chạy khu vui chơi game từ vựng mới
    window.initGameHub();
  }
};

// Áp dụng bộ lọc và học Flashcard
window.startFlashcardStudy = () => {
  const grade = document.getElementById('s-vocab-filter-grade').value;
  // Lọc từ vựng cục bộ theo lớp trong bộ nhớ
  const filtered = window.studentState.vocabList.filter(v => v.grade === Number(grade));

  if (filtered.length === 0) {
    alert('Khối lớp hiện tại chưa được soạn từ vựng. Cô Hiền đang cập nhật thêm, con vui lòng chọn lớp khác nhé!');
    return;
  }

  window.studentState.vocabIndex = 0;
  window.studentState.activeFlashcards = filtered;
  
  renderFlashcard();
};

function renderFlashcard() {
  const index = window.studentState.vocabIndex;
  const list = window.studentState.activeFlashcards;
  const word = list[index];

  // Đặt lại mặt lật về phía trước (Xóa class rotate-y-180 nếu đang lật)
  document.getElementById('flashcard-container').classList.remove('rotate-y-180');

  document.getElementById('fc-badge-topic').textContent = `Chủ đề: ${word.topic || 'Chung'}`;
  document.getElementById('fc-word').textContent = word.word;
  document.getElementById('fc-ipa').textContent = word.ipa || '';
  
  const typeText = word.word_type === 'n' ? 'danh từ' : (word.word_type === 'v' ? 'động từ' : (word.word_type === 'adj' ? 'tính từ' : (word.word_type === 'adv' ? 'trạng từ' : 'từ vựng')));
  document.getElementById('fc-type').textContent = ` ${typeText} `;
  
  document.getElementById('fc-meaning').textContent = word.meaning_vi;
  document.getElementById('fc-example').textContent = word.example ? `"${word.example}"` : 'Chưa có câu ví dụ minh họa.';
  
  document.getElementById('fc-progress').textContent = `${index + 1} / ${list.length} Từ`;
}

window.flipFlashcard = () => {
  document.getElementById('flashcard-container').classList.toggle('rotate-y-180');
};

window.prevFlashcard = () => {
  const index = window.studentState.vocabIndex;
  const list = window.studentState.activeFlashcards;
  if (index > 0) {
    window.studentState.vocabIndex--;
    renderFlashcard();
  }
};

window.nextFlashcard = () => {
  const index = window.studentState.vocabIndex;
  const list = window.studentState.activeFlashcards;
  if (index < list.length - 1) {
    window.studentState.vocabIndex++;
    renderFlashcard();
  }
};

// Đọc từ phát âm bằng Speech Synthesis của trình duyệt
window.speakWord = (event) => {
  if (event) event.stopPropagation(); // Tránh kích hoạt lật thẻ khi bấm loa phát âm
  const currentWord = window.studentState.activeFlashcards[window.studentState.vocabIndex];
  if (!currentWord) return;

  const utterance = new SpeechSynthesisUtterance(currentWord.word);
  utterance.lang = 'en-US';
  utterance.rate = 0.85; // Tốc độ nói chậm rãi một chút để học sinh nghe rõ
  window.speechSynthesis.speak(utterance);
};


// =========================================================================
// SPELLING GAME ENGINE UPGRADED TO 3 COHESIVE MINI-GAMES FOR STUDENTS
// =========================================================================

let gameListenersRegistered = false;
function registerGameFormListeners() {
  if (gameListenersRegistered) return;

  const scrambleForm = document.getElementById('scramble-submit-form');
  if (scrambleForm) {
    scrambleForm.addEventListener('submit', (e) => {
      window.submitScrambleAnswer(e);
    });
  }

  const fitbForm = document.getElementById('fitb-submit-form');
  if (fitbForm) {
    fitbForm.addEventListener('submit', (e) => {
      window.submitFitbAnswer(e);
    });
  }

  gameListenersRegistered = true;
}

// 1. KHỞI TẠO HUB CHỌN TRÒ CHƠI (GAME HUB SELECTION SCREEN)
window.initGameHub = () => {
  // Đảm bảo đã gắn sự kiện form
  registerGameFormListeners();
  
  // Xóa bỏ tất cả timer đang chạy nếu có dở dang
  if (window.studentState.scrambleTimerInterval) {
    clearInterval(window.studentState.scrambleTimerInterval);
    window.studentState.scrambleTimerInterval = null;
  }

  const sGameHubFilter = document.getElementById('s-game-hub-filter-grade');
  if (sGameHubFilter && !sGameHubFilter.dataset.initialized) {
    const vocabGrade = document.getElementById('s-vocab-filter-grade').value;
    if (vocabGrade) {
      sGameHubFilter.value = vocabGrade;
    }
    sGameHubFilter.dataset.initialized = 'true';
  }

  // Reset trạng thái hiển thị
  document.getElementById('game-hub-screen').classList.remove('hidden');
  document.getElementById('game-quiz-screen').classList.add('hidden');
  document.getElementById('game-scramble-screen').classList.add('hidden');
  document.getElementById('game-fitb-screen').classList.add('hidden');
  document.getElementById('game-report-screen').classList.add('hidden');

  // Cuộn mượt về khu vực game để người dùng nhìn thấy rõ trên điện thoại
  setTimeout(() => {
    const hubArea = document.getElementById('vocab-game-area');
    if (hubArea) {
      hubArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 50);
};

// 2. KHỞI CHẠY GAME CHỈ ĐỊNH
window.startGame = (gameType) => {
  const grade = document.getElementById('s-game-hub-filter-grade').value;
  let words = [];
  if (grade === 'all') {
    words = window.studentState.vocabList || [];
  } else {
    words = (window.studentState.vocabList || []).filter(v => v.grade === Number(grade));
  }

  if (words.length < 4 && gameType === 'quiz') {
    alert('Khối lớp hiện tại chưa có đủ từ vựng (tối thiểu 4 từ) để tạo đáp án trắc nghiệm. Con vui lòng chọn lớp khác hoặc nhắc Cô Hiền thêm từ vựng nhé!');
    return;
  }
  if (words.length === 0) {
    alert('Khối lớp hiện tại chưa có từ vựng để chơi game. Con vui lòng chọn lớp khác nhé!');
    return;
  }

  // Khởi tạo trạng thái game mới
  window.studentState.gameType = gameType;
  // Trộn ngẫu nhiên câu hỏi
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  // Chọn tối đa 10 câu hỏi cho một lượt chơi
  window.studentState.gameQuestions = shuffled.slice(0, 10);
  window.studentState.gameQuestionIndex = 0;
  window.studentState.gameCorrectAnswers = 0;
  window.studentState.gameWrongAnswers = 0;

  // Ẩn/Hiện màn hình tương ứng
  document.getElementById('game-hub-screen').classList.add('hidden');
  document.getElementById('game-report-screen').classList.add('hidden');
  
  document.getElementById('game-quiz-screen').classList.add('hidden');
  document.getElementById('game-scramble-screen').classList.add('hidden');
  document.getElementById('game-fitb-screen').classList.add('hidden');

  if (gameType === 'quiz') {
    document.getElementById('game-quiz-screen').classList.remove('hidden');
    document.getElementById('quiz-correct-count').textContent = '0';
    document.getElementById('quiz-wrong-count').textContent = '0';
  } else if (gameType === 'scramble') {
    document.getElementById('game-scramble-screen').classList.remove('hidden');
    document.getElementById('scramble-correct-count').textContent = '0';
    document.getElementById('scramble-played-count').textContent = '0';
  } else if (gameType === 'fitb') {
    document.getElementById('game-fitb-screen').classList.remove('hidden');
    document.getElementById('fitb-correct-count').textContent = '0';
    document.getElementById('fitb-wrong-count').textContent = '0';
  }

  // Tải câu hỏi đầu tiên
  window.loadGameQuestion();

  // Tự động cuộn mượt lên đầu khung chơi game, giúp hiển thị đầy đủ và lộ nút "Thoát Game" (Quay lại) trên điện thoại di động
  setTimeout(() => {
    const activeScreen = document.getElementById(`game-${gameType}-screen`);
    if (activeScreen) {
      activeScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

// 3. THOÁT GAME ĐANG CHƠI QUAY VỀ MENU CHỌN GAME
window.quitGame = () => {
  if (confirm('Con có chắc chắn muốn thoát lượt chơi hiện tại không? Mọi điểm số chưa hoàn thành sẽ không được lưu lại đâu.')) {
    window.initGameHub();
  }
};

// 4. LOAD CÂU HỎI TIẾP THEO
window.loadGameQuestion = () => {
  const index = window.studentState.gameQuestionIndex;
  const questions = window.studentState.gameQuestions;
  const gameType = window.studentState.gameType;

  // Nếu đã chơi hết số câu hỏi
  if (index >= questions.length) {
    const score = window.studentState.gameCorrectAnswers;
    const total = questions.length;
    window.showGameReport(score, total);
    return;
  }

  // Clear timer của scramble nếu có
  if (window.studentState.scrambleTimerInterval) {
    clearInterval(window.studentState.scrambleTimerInterval);
    window.studentState.scrambleTimerInterval = null;
  }

  if (gameType === 'quiz') {
    loadQuizQuestion(index);
  } else if (gameType === 'scramble') {
    loadScrambleQuestion(index);
  } else if (gameType === 'fitb') {
    loadFitbQuestion(index);
  }
};

// ==========================================
// GAME 1: WORD QUIZ (TRẮC NGHIỆM)
// ==========================================
function loadQuizQuestion(index) {
  const word = window.studentState.gameQuestions[index];
  const total = window.studentState.gameQuestions.length;

  // Cập nhật tiến trình UI
  document.getElementById('quiz-progress-text').textContent = `Câu ${index + 1}/${total}`;
  const progressPercent = ((index + 1) / total) * 100;
  document.getElementById('quiz-progress-bar').style.width = `${progressPercent}%`;

  // Thiết lập nội dung câu hỏi
  document.getElementById('quiz-question-meaning').textContent = word.meaning_vi;
  
  const typeText = word.word_type === 'n' ? 'danh từ' : (word.word_type === 'v' ? 'động từ' : (word.word_type === 'adj' ? 'tính từ' : (word.word_type === 'adv' ? 'trạng từ' : 'từ vựng')));
  document.getElementById('quiz-question-type').textContent = typeText;
  document.getElementById('quiz-question-ipa').textContent = word.ipa || '';

  // Tạo danh sách 4 đáp án (1 đúng, 3 nhiễu)
  const allVocabs = window.studentState.vocabList;
  const distractors = allVocabs
    .filter(v => v.word.trim().toLowerCase() !== word.word.trim().toLowerCase())
    .map(v => v.word.trim());
  
  // Lọc trùng lặp
  const uniqueDistractors = [...new Set(distractors)];
  
  // Trộn lấy ra 3 đáp án nhiễu
  const pickedDistractors = [];
  while (pickedDistractors.length < 3 && uniqueDistractors.length > 0) {
    const randIdx = Math.floor(Math.random() * uniqueDistractors.length);
    pickedDistractors.push(uniqueDistractors.splice(randIdx, 1)[0]);
  }
  
  // Dự phòng nếu không đủ từ nhiễu
  const fallbacks = ['accomplish', 'valuable', 'environment', 'contribute', 'household'];
  while (pickedDistractors.length < 3) {
    const fallback = fallbacks[pickedDistractors.length];
    if (!pickedDistractors.includes(fallback) && fallback !== word.word.trim()) {
      pickedDistractors.push(fallback);
    }
  }

  // Kết hợp và trộn ngẫu nhiên 4 đáp án
  const options = [word.word.trim(), ...pickedDistractors].sort(() => 0.5 - Math.random());

  // Render các nút đáp án
  const grid = document.getElementById('quiz-options-grid');
  grid.innerHTML = '';
  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = "quiz-opt-btn w-full p-4 text-slate-800 bg-white border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 rounded-2xl font-bold text-sm transition-all shadow-sm text-left flex items-center justify-between cursor-pointer";
    btn.innerHTML = `
      <span>${opt}</span>
      <i data-lucide="circle" class="w-4 h-4 text-slate-300"></i>
    `;
    btn.onclick = () => window.submitQuizAnswer(opt, btn);
    grid.appendChild(btn);
  });

  // Reset feedback & nút tiếp theo
  document.getElementById('quiz-feedback').className = 'hidden p-4 rounded-xl text-sm font-bold text-center';
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('quiz-next-btn').classList.add('hidden');

  // Load lại icon Lucide cho các nút đáp án mới
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.submitQuizAnswer = (chosenOption, clickedBtn) => {
  const index = window.studentState.gameQuestionIndex;
  const word = window.studentState.gameQuestions[index];
  const correctWord = word.word.trim();

  // Vô hiệu hóa tất cả các nút đáp án trong lượt này
  const buttons = document.querySelectorAll('.quiz-opt-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('hover:bg-brand-50/20', 'hover:border-brand-500');
    btn.style.cursor = 'not-allowed';
  });

  const feedback = document.getElementById('quiz-feedback');
  feedback.classList.remove('hidden');

  const isCorrect = chosenOption.toLowerCase() === correctWord.toLowerCase();

  // Tô màu đáp án đúng và đáp án học sinh chọn sai
  buttons.forEach(btn => {
    const text = btn.querySelector('span').textContent.trim();
    if (text.toLowerCase() === correctWord.toLowerCase()) {
      // Đáp án đúng luôn tô màu xanh lá
      btn.className = "quiz-opt-btn w-full p-4 text-emerald-800 bg-emerald-50 border-2 border-emerald-500 rounded-2xl font-bold text-sm flex items-center justify-between";
      btn.innerHTML = `<span>${text}</span> <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600"></i>`;
    } else if (text === chosenOption && !isCorrect) {
      // Đáp án chọn sai tô màu đỏ
      btn.className = "quiz-opt-btn w-full p-4 text-rose-800 bg-rose-50 border-2 border-rose-500 rounded-2xl font-bold text-sm flex items-center justify-between";
      btn.innerHTML = `<span>${text}</span> <i data-lucide="x-circle" class="w-5 h-5 text-rose-600"></i>`;
    }
  });

  if (isCorrect) {
    window.studentState.gameCorrectAnswers++;
    document.getElementById('quiz-correct-count').textContent = window.studentState.gameCorrectAnswers;
    
    // Nổ pháo hoa ăn mừng câu đúng
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });

    feedback.textContent = '🥳 Xuất sắc! Con đã chọn đáp án hoàn toàn chính xác!';
    feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else {
    window.studentState.gameWrongAnswers++;
    document.getElementById('quiz-wrong-count').textContent = window.studentState.gameWrongAnswers;

    feedback.innerHTML = `😢 Gần đúng rồi con ơi! Từ vựng chuẩn phải là: <strong class="text-rose-700 uppercase font-mono">${correctWord}</strong>.`;
    feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-rose-50 text-rose-700 border border-rose-200';
  }

  // Hiện nút tiếp theo
  document.getElementById('quiz-next-btn').classList.remove('hidden');
  document.getElementById('quiz-next-btn').onclick = () => {
    window.studentState.gameQuestionIndex++;
    window.loadGameQuestion();
  };

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
};

window.speakQuizWord = () => {
  const index = window.studentState.gameQuestionIndex;
  const word = window.studentState.gameQuestions[index];
  if (!word) return;
  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};


// ==========================================
// GAME 2: WORD SCRAMBLE (XẾP CHỮ)
// ==========================================
function scrambleWord(wordStr) {
  let arr = wordStr.toLowerCase().split('');
  let scrambled = '';
  let attempts = 0;
  // Xáo trộn chữ cho tới khi khác hẳn từ ban đầu
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join('');
    attempts++;
  } while (scrambled === wordStr.toLowerCase() && attempts < 15 && wordStr.length > 2);
  
  return scrambled;
}

function loadScrambleQuestion(index) {
  const word = window.studentState.gameQuestions[index];
  const total = window.studentState.gameQuestions.length;

  document.getElementById('scramble-progress-text').textContent = `Câu ${index + 1}/${total}`;
  document.getElementById('scramble-played-count').textContent = index;

  // Lấy từ xáo trộn
  const scrambled = scrambleWord(word.word);

  // Hiển thị chữ cái dạng ô tròn cách nhau sinh động
  const container = document.getElementById('scramble-word-container');
  container.innerHTML = '';
  scrambled.split('').forEach((char, idx) => {
    if (char === ' ') {
      const spacer = document.createElement('div');
      spacer.className = "w-6";
      container.appendChild(spacer);
    } else {
      const item = document.createElement('span');
      item.className = "px-3.5 py-2 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 font-extrabold text-xl rounded-2xl border-2 border-amber-200 uppercase shadow-sm flex items-center justify-center min-w-[40px] transform hover:scale-105 transition-all select-none";
      item.textContent = char;
      container.appendChild(item);
    }
  });

  // Thiết lập gợi ý
  document.getElementById('scramble-meaning-hint').textContent = word.meaning_vi;
  const typeText = word.word_type === 'n' ? 'danh từ' : (word.word_type === 'v' ? 'động từ' : (word.word_type === 'adj' ? 'tính từ' : (word.word_type === 'adv' ? 'trạng từ' : 'từ vựng')));
  document.getElementById('scramble-type-hint').textContent = typeText;
  document.getElementById('scramble-ipa-hint').textContent = word.ipa || 'Chưa có phiên âm';

  // Khôi phục nút submit, input
  const submitBtn = document.querySelector('#scramble-submit-form button');
  submitBtn.disabled = false;
  submitBtn.classList.remove('bg-slate-300', 'cursor-not-allowed');
  submitBtn.classList.add('bg-amber-500', 'hover:bg-amber-600');

  const input = document.getElementById('scramble-input');
  input.value = '';
  input.disabled = false;
  input.focus();

  document.getElementById('scramble-feedback').className = 'hidden p-4 rounded-xl text-sm font-bold text-center';
  document.getElementById('scramble-feedback').classList.add('hidden');
  document.getElementById('scramble-next-btn').classList.add('hidden');

  // Khởi động đồng hồ đếm ngược 30 giây
  window.studentState.scrambleTimeLeft = 30;
  document.getElementById('scramble-timer-text').textContent = '30';
  document.getElementById('scramble-timer-box').className = "flex items-center gap-1 text-sm font-bold text-amber-600 px-2.5 py-1 bg-amber-50 rounded-full";

  window.studentState.scrambleTimerInterval = setInterval(() => {
    window.studentState.scrambleTimeLeft--;
    document.getElementById('scramble-timer-text').textContent = window.studentState.scrambleTimeLeft;

    if (window.studentState.scrambleTimeLeft <= 10) {
      // Đổi sang màu đỏ cảnh báo gấp rút
      document.getElementById('scramble-timer-box').className = "flex items-center gap-1 text-sm font-bold text-rose-600 px-2.5 py-1 bg-rose-100 rounded-full animate-bounce";
    }

    if (window.studentState.scrambleTimeLeft <= 0) {
      clearInterval(window.studentState.scrambleTimerInterval);
      window.studentState.scrambleTimerInterval = null;
      window.submitScrambleTimeout();
    }
  }, 1000);
}

window.submitScrambleAnswer = (e) => {
  if (e) e.preventDefault();

  // Dừng đếm ngược
  if (window.studentState.scrambleTimerInterval) {
    clearInterval(window.studentState.scrambleTimerInterval);
    window.studentState.scrambleTimerInterval = null;
  }

  const index = window.studentState.gameQuestionIndex;
  const word = window.studentState.gameQuestions[index];
  const correctWord = word.word.trim();

  const inputEl = document.getElementById('scramble-input');
  const userAns = inputEl.value.trim().toLowerCase();
  inputEl.disabled = true;

  const submitBtn = document.querySelector('#scramble-submit-form button');
  submitBtn.disabled = true;
  submitBtn.className = "w-full py-3 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed";

  const feedback = document.getElementById('scramble-feedback');
  feedback.classList.remove('hidden');

  const isCorrect = userAns === correctWord.toLowerCase();

  if (isCorrect) {
    window.studentState.gameCorrectAnswers++;
    document.getElementById('scramble-correct-count').textContent = window.studentState.gameCorrectAnswers;

    confetti({
      particleCount: 50,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.8 }
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.8 }
    });

    feedback.textContent = '🥳 Tuyệt đỉnh! Con đã đoán đúng từ vựng cực nhanh!';
    feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else {
    window.studentState.gameWrongAnswers++;
    feedback.innerHTML = `😢 Chưa chuẩn rồi con ơi! Từ vựng đúng của chúng ta là: <strong class="text-rose-700 font-mono text-base uppercase">${correctWord}</strong>.`;
    feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-rose-50 text-rose-700 border border-rose-200';
  }

  // Hiện nút Tiếp theo
  document.getElementById('scramble-next-btn').classList.remove('hidden');
  document.getElementById('scramble-next-btn').onclick = () => {
    window.studentState.gameQuestionIndex++;
    window.loadGameQuestion();
  };
};

window.submitScrambleTimeout = () => {
  const index = window.studentState.gameQuestionIndex;
  const word = window.studentState.gameQuestions[index];
  const correctWord = word.word.trim();

  const inputEl = document.getElementById('scramble-input');
  inputEl.disabled = true;

  const submitBtn = document.querySelector('#scramble-submit-form button');
  submitBtn.disabled = true;
  submitBtn.className = "w-full py-3 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed";

  window.studentState.gameWrongAnswers++;

  const feedback = document.getElementById('scramble-feedback');
  feedback.classList.remove('hidden');
  feedback.innerHTML = `⏰ Ôi hết thời gian rồi con ơi! Đáp án đúng là: <strong class="text-amber-800 uppercase font-mono">${correctWord}</strong>. Hãy thử sức tiếp câu sau nhé!`;
  feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-amber-50 text-amber-800 border border-amber-200';

  document.getElementById('scramble-next-btn').classList.remove('hidden');
  document.getElementById('scramble-next-btn').onclick = () => {
    window.studentState.gameQuestionIndex++;
    window.loadGameQuestion();
  };
};


// ==========================================
// GAME 3: FILL IN THE BLANK (ĐIỀN VÀO CHỖ TRỐNG)
// ==========================================
function loadFitbQuestion(index) {
  const word = window.studentState.gameQuestions[index];
  const total = window.studentState.gameQuestions.length;

  // Cập nhật tiến trình UI
  document.getElementById('fitb-progress-text').textContent = `Câu ${index + 1}/${total}`;
  const progressPercent = ((index + 1) / total) * 100;
  document.getElementById('fitb-progress-bar').style.width = `${progressPercent}%`;

  // Thiết lập nội dung câu ví dụ rỗng
  let exampleText = word.example || "My mother is a homemaker and takes care of our family.";
  
  // Regex để tìm và thay thế từ vựng bằng khoảng trống (không phân biệt hoa thường, ranh giới từ chính xác)
  const escapedWord = word.word.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const boundaryRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
  
  let formattedSentence = '';
  if (boundaryRegex.test(exampleText)) {
    formattedSentence = exampleText.replace(boundaryRegex, `<span class="px-3 py-1 bg-amber-100 border-2 border-dashed border-amber-400 rounded-lg text-brand-700 font-black tracking-widest font-mono text-sm mx-1">________</span>`);
  } else {
    // Dự phòng thay thế thông thường nếu không trúng ranh giới từ hoàn toàn
    const fallbackRegex = new RegExp(escapedWord, 'gi');
    formattedSentence = exampleText.replace(fallbackRegex, `<span class="px-3 py-1 bg-amber-100 border-2 border-dashed border-amber-400 rounded-lg text-brand-700 font-black tracking-widest font-mono text-sm mx-1">________</span>`);
  }

  document.getElementById('fitb-sentence-container').innerHTML = formattedSentence;

  // Cài đặt gợi ý dưới
  document.getElementById('fitb-meaning-hint').textContent = word.meaning_vi;
  const typeText = word.word_type === 'n' ? 'danh từ' : (word.word_type === 'v' ? 'động từ' : (word.word_type === 'adj' ? 'tính từ' : (word.word_type === 'adv' ? 'trạng từ' : 'từ vựng')));
  document.getElementById('fitb-type-hint').textContent = `${typeText} | ${word.ipa || 'Chưa có phiên âm'}`;

  // Khôi phục nút submit, input
  const submitBtn = document.querySelector('#fitb-submit-form button');
  submitBtn.disabled = false;
  submitBtn.classList.remove('bg-slate-300', 'cursor-not-allowed');
  submitBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');

  const input = document.getElementById('fitb-input');
  input.value = '';
  input.disabled = false;
  input.focus();

  document.getElementById('fitb-feedback').className = 'hidden p-4 rounded-xl text-sm font-bold text-center';
  document.getElementById('fitb-feedback').classList.add('hidden');
  document.getElementById('fitb-next-btn').classList.add('hidden');
}

window.submitFitbAnswer = (e) => {
  if (e) e.preventDefault();

  const index = window.studentState.gameQuestionIndex;
  const word = window.studentState.gameQuestions[index];
  const correctWord = word.word.trim();

  const inputEl = document.getElementById('fitb-input');
  const userAns = inputEl.value.trim().toLowerCase();
  inputEl.disabled = true;

  const submitBtn = document.querySelector('#fitb-submit-form button');
  submitBtn.disabled = true;
  submitBtn.className = "w-full py-3 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed";

  const feedback = document.getElementById('fitb-feedback');
  feedback.classList.remove('hidden');

  const isCorrect = userAns === correctWord.toLowerCase();

  // Hiển thị từ đúng vào vị trí ô trống trên câu để học sinh nhìn thấy ngữ cảnh đúng
  let exampleText = word.example || "My mother is a homemaker and takes care of our family.";
  const escapedWord = correctWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const boundaryRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
  let solvedSentence = exampleText.replace(boundaryRegex, `<span class="px-3 py-1 bg-emerald-100 border-2 border-emerald-500 rounded-lg text-emerald-800 font-black tracking-normal font-mono text-sm mx-1 animate-pulse">${correctWord}</span>`);
  document.getElementById('fitb-sentence-container').innerHTML = solvedSentence;

  if (isCorrect) {
    window.studentState.gameCorrectAnswers++;
    document.getElementById('fitb-correct-count').textContent = window.studentState.gameCorrectAnswers;

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });

    feedback.textContent = '🥳 Tuyệt vời! Con đã điền từ chuẩn xác để hoàn thiện câu ví dụ!';
    feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else {
    window.studentState.gameWrongAnswers++;
    document.getElementById('fitb-wrong-count').textContent = window.studentState.gameWrongAnswers;

    feedback.innerHTML = `😢 Chưa chính xác con ơi. Từ cần điền là: <strong class="text-rose-700 uppercase font-mono">${correctWord}</strong>.`;
    feedback.className = 'p-4 rounded-xl text-sm font-bold text-center bg-rose-50 text-rose-700 border border-rose-200';
  }

  // Hiện nút tiếp theo
  document.getElementById('fitb-next-btn').classList.remove('hidden');
  document.getElementById('fitb-next-btn').onclick = () => {
    window.studentState.gameQuestionIndex++;
    window.loadGameQuestion();
  };
};


// ==========================================
// 5. HIỂN THỊ BÁO CÁO TỔNG KẾT (REPORT CARD SCREEN)
// ==========================================
window.showGameReport = (score, total) => {
  // Ẩn tất cả các màn hình chơi game đang chạy
  document.getElementById('game-quiz-screen').classList.add('hidden');
  document.getElementById('game-scramble-screen').classList.add('hidden');
  document.getElementById('game-fitb-screen').classList.add('hidden');

  // Hiện màn hình báo cáo điểm số
  document.getElementById('game-report-screen').classList.remove('hidden');

  document.getElementById('report-score').textContent = `${score}/${total}`;

  // Đánh giá dựa trên điểm số
  const percent = (score / total) * 100;
  const titleEl = document.getElementById('report-title');
  const subtitleEl = document.getElementById('report-subtitle');
  const badgeEl = document.getElementById('report-badge');

  if (percent === 100) {
    titleEl.textContent = '🎉 Siêu Nhân Từ Vựng! 🎉';
    subtitleEl.textContent = 'Con đạt điểm tuyệt đối 100%! Trí nhớ của con thật sự vô song!';
    badgeEl.textContent = '🏆 Thủ khoa Tiếng Anh Cô Hiền';
    badgeEl.className = 'text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block mt-3 border border-amber-200';
    
    // Nổ confetti rực rỡ nhiều lần liên tiếp
    let end = Date.now() + (2 * 1000);
    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  } else if (percent >= 80) {
    titleEl.textContent = '🌟 Xuất Sắc Quá Con Ơi! 🌟';
    subtitleEl.textContent = 'Kỹ năng từ vựng cực kỳ tốt! Tiếp tục phát huy thế mạnh này nhé!';
    badgeEl.textContent = '🏅 Siêu sao Từ Vựng';
    badgeEl.className = 'text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mt-3 border border-emerald-200';
    
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  } else if (percent >= 50) {
    titleEl.textContent = '👍 Rất Tốt, Hãy Cố Gắng Thêm! 👍';
    subtitleEl.textContent = 'Con đã nhớ được kha khá từ vựng rồi. Chơi lại vài lần nữa là thuộc 100% luôn!';
    badgeEl.textContent = '🎖️ Học sinh hiếu học';
    badgeEl.className = 'text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full inline-block mt-3 border border-blue-200';
  } else {
    titleEl.textContent = '💪 Đừng Nản Lòng Nhé Con! 💪';
    subtitleEl.textContent = 'Học từ vựng cần có thời gian và sự kiên trì. Hãy lật Flashcard ôn lại một chút rồi thử thách lại nha!';
    badgeEl.textContent = '🌱 Chiến binh kiên cường';
    badgeEl.className = 'text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-full inline-block mt-3 border border-slate-200';
  }

  // Cài đặt sự kiện cho nút chơi lại
  const retryBtn = document.getElementById('report-retry-btn');
  retryBtn.onclick = () => {
    window.startGame(window.studentState.gameType);
  };
};


// ==========================================
// 3. PHÒNG LUYỆN THI TRỰC TUYẾN (STUDENT)
// ==========================================

window.loadStudentExams = async () => {
  try {
    const list = await window.apiFetch('/api/exams');
    const grid = document.getElementById('s-exams-cards-grid');
    grid.innerHTML = '';

    if (list.length === 0) {
      grid.innerHTML = '<p class="col-span-full text-center text-slate-400 text-sm">Hiện tại chưa có đề thi thử nào được mở.</p>';
      return;
    }

    list.forEach(e => {
      const isHSG = e.exam_type.startsWith('hsg_');
      const typeText = e.exam_type === 'thpt_qg' ? 'Thi THPT Quốc Gia' : (isHSG ? 'Bồi dưỡng Học Sinh Giỏi' : 'Kiểm Tra Định Kỳ');
      
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-brand-300 hover:shadow-md transition-all space-y-4';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-2">
              <span class="px-2.5 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full uppercase">${typeText}</span>
              <span class="px-2.5 py-0.5 ${e.difficulty === 'hard' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} text-[10px] font-bold rounded-full uppercase">${e.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span>
            </div>
            <h4 class="font-extrabold text-slate-900 text-base">${e.title}</h4>
            <p class="text-xs text-slate-400">Thời gian làm bài: ${e.duration_minutes} phút | Đối tượng: Lớp ${e.grade}</p>
          </div>
          ${e.is_ai_generated ? '<span class="text-xs font-extrabold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200">AI</span>' : ''}
        </div>
        <div class="flex gap-2.5">
          <button onclick="startExam(${e.id})" class="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-all shadow shadow-brand-500/10 cursor-pointer">
            Vào Làm Bài Thi Thử
          </button>
          <button onclick="window.showExamLeaderboard(${e.id}, '${e.title}')" class="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs transition-all border border-amber-200 flex items-center justify-center gap-1 cursor-pointer" title="Xem bảng xếp hạng">
            <i data-lucide="trophy" class="w-4.5 h-4.5"></i> BXH
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    alert('Không thể tải đề thi thử: ' + err.message);
  }
};

// Vào thi thử, bắt đầu đồng hồ
window.startExam = async (examId) => {
  try {
    const data = await window.apiFetch(`/api/exams/${examId}`);
    window.studentState.activeExam = data.exam;
    window.studentState.activeQuestions = data.questions;
    window.studentState.answers = {};

    document.getElementById('exam-taking-title').textContent = data.exam.title;
    
    // Khởi tạo thời gian đếm ngược
    let secondsLeft = data.exam.duration_minutes * 60;
    window.studentState.duration_minutes = data.exam.duration_minutes;
    window.studentState.secondsLeft = secondsLeft;
    
    const timerDisplay = document.getElementById('exam-timer');
    
    function updateTimer() {
      const minutes = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      window.studentState.secondsLeft = secondsLeft;
      
      if (secondsLeft <= 0) {
        clearInterval(window.studentState.examTimerInterval);
        alert('Đã hết thời gian thi thử! Hệ thống sẽ tự động nộp bài thi của con.');
        submitExam();
      }
      secondsLeft--;
    }
    
    updateTimer();
    clearInterval(window.studentState.examTimerInterval);
    window.studentState.examTimerInterval = setInterval(updateTimer, 1000);

    // Kết xuất câu hỏi thi
    const listContainer = document.getElementById('exam-questions-list');
    listContainer.innerHTML = '';

    const quickNav = document.getElementById('exam-quick-navigation');
    quickNav.innerHTML = '';

    const grouped = groupQuestions(data.questions);
    grouped.forEach((g, gIdx) => {
      if (g.type === 'single') {
        const qNum = g.original_num;
        
        // Khối câu hỏi đơn lẻ
        const div = document.createElement('div');
        div.id = `question-block-${qNum}`;
        div.className = 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4';
        div.innerHTML = `
          <div class="flex items-center gap-2 border-b border-slate-50 pb-2">
            <span class="w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              ${qNum}
            </span>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${g.part || 'Trắc nghiệm'}</span>
          </div>
          <p class="font-semibold text-slate-800 leading-relaxed text-sm whitespace-pre-line">${g.question_text}</p>
          
          <div class="space-y-2.5">
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all">
              <input type="radio" name="q-${qNum}" value="A" onclick="selectOption(${qNum}, 'A')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>A.</strong> <span>${g.option_a}</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all">
              <input type="radio" name="q-${qNum}" value="B" onclick="selectOption(${qNum}, 'B')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>B.</strong> <span>${g.option_b}</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all">
              <input type="radio" name="q-${qNum}" value="C" onclick="selectOption(${qNum}, 'C')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>C.</strong> <span>${g.option_c}</span>
            </label>
            <label class="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-sm transition-all">
              <input type="radio" name="q-${qNum}" value="D" onclick="selectOption(${qNum}, 'D')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
              <strong>D.</strong> <span>${g.option_d}</span>
            </label>
          </div>
        `;
        listContainer.appendChild(div);

        // Nút ô vuông định hướng nhanh bên cột phải
        const navBtn = document.createElement('button');
        navBtn.id = `nav-bubble-${qNum}`;
        navBtn.className = 'w-10 h-10 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-center transition-all bg-white hover:bg-slate-50';
        navBtn.textContent = qNum;
        navBtn.onclick = () => {
          document.getElementById(`question-block-${qNum}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        quickNav.appendChild(navBtn);
      } else if (g.type === 'reading_group') {
        // Khối cha chứa bài đọc hiểu chùm
        const groupBlock = document.createElement('div');
        groupBlock.className = 'bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-6';
        
        groupBlock.innerHTML = `
          <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <i data-lucide="book-open" class="w-3.5 h-3.5"></i> Bài Đọc Hiểu (Reading Comprehension)
            </span>
          </div>
          <div class="bg-slate-50 border border-slate-150 rounded-2xl p-5 leading-relaxed text-slate-800 text-sm whitespace-pre-line font-medium max-h-[350px] overflow-y-auto shadow-inner border-dashed">
            ${g.passage}
          </div>
          <div class="space-y-6" id="sub-questions-container-${gIdx}">
          </div>
        `;
        listContainer.appendChild(groupBlock);

        const subContainer = groupBlock.querySelector(`#sub-questions-container-${gIdx}`);
        g.subQuestions.forEach((subQ) => {
          const qNum = subQ.original_num;
          const subDiv = document.createElement('div');
          subDiv.id = `question-block-${qNum}`;
          subDiv.className = 'border border-slate-100 rounded-2xl p-5 bg-slate-50/20 space-y-3 transition-all hover:shadow-sm';
          subDiv.innerHTML = `
            <div class="flex items-center gap-2 border-b border-slate-50 pb-1.5">
              <span class="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                ${qNum}
              </span>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${subQ.part || 'Đọc hiểu'}</span>
            </div>
            <p class="font-semibold text-slate-800 leading-relaxed text-sm whitespace-pre-line">${subQ.question_text}</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all">
                <input type="radio" name="q-${qNum}" value="A" onclick="selectOption(${qNum}, 'A')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">A.</strong> <span>${subQ.option_a}</span>
              </label>
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all">
                <input type="radio" name="q-${qNum}" value="B" onclick="selectOption(${qNum}, 'B')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">B.</strong> <span>${subQ.option_b}</span>
              </label>
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all">
                <input type="radio" name="q-${qNum}" value="C" onclick="selectOption(${qNum}, 'C')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">C.</strong> <span>${subQ.option_c}</span>
              </label>
              <label class="flex items-center gap-3 p-3 border border-slate-150 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-sm transition-all">
                <input type="radio" name="q-${qNum}" value="D" onclick="selectOption(${qNum}, 'D')" class="w-4 h-4 text-brand-600 focus:ring-brand-500">
                <strong class="text-slate-600">D.</strong> <span>${subQ.option_d}</span>
              </label>
            </div>
          `;
          subContainer.appendChild(subDiv);

          // Nút ô vuông định hướng nhanh bên cột phải cho câu hỏi con
          const navBtn = document.createElement('button');
          navBtn.id = `nav-bubble-${qNum}`;
          navBtn.className = 'w-10 h-10 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-center transition-all bg-white hover:bg-slate-50';
          navBtn.textContent = qNum;
          navBtn.onclick = () => {
            document.getElementById(`question-block-${qNum}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
          };
          quickNav.appendChild(navBtn);
        });
      }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Hiện màn hình làm bài, ẩn danh sách đề
    document.getElementById('s-exams-list-screen').classList.add('hidden');
    document.getElementById('s-exams-taking-screen').classList.remove('hidden');
    document.getElementById('s-exams-results-screen').classList.add('hidden');

  } catch (err) {
    alert('Không thể mở đề thi: ' + err.message);
  }
};

// Chọn đáp án
window.selectOption = (questionOrder, answer) => {
  window.studentState.answers[questionOrder] = answer;
  
  // Đánh dấu ô vuông định hướng nhanh đã làm
  const navBubble = document.getElementById(`nav-bubble-${questionOrder}`);
  if (navBubble) {
    navBubble.className = 'w-10 h-10 bg-brand-600 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-all';
  }
};

// Nộp bài thi
window.submitExam = async () => {
  if (!confirm('Con có chắc chắn muốn nộp bài thi ngay không? Hãy kiểm tra lại các đáp án.')) return;
  
  // Dừng timer
  clearInterval(window.studentState.examTimerInterval);

  // Tính thời gian làm bài (seconds)
  const durationSecs = (window.studentState.duration_minutes || 0) * 60;
  const secondsLeft = window.studentState.secondsLeft || 0;
  const secondsSpent = Math.max(0, durationSecs - secondsLeft);

  try {
    const res = await window.apiFetch('/api/exam-results', {
      method: 'POST',
      body: JSON.stringify({
        exam_id: window.studentState.activeExam.id,
        answers: window.studentState.answers,
        seconds_spent: secondsSpent
      })
    });

    // Ẩn màn hình thi, hiện kết quả lớn
    document.getElementById('s-exams-taking-screen').classList.add('hidden');
    document.getElementById('s-exams-results-screen').classList.remove('hidden');

    document.getElementById('result-screen-exam-title').textContent = window.studentState.activeExam.title;
    document.getElementById('result-score').textContent = `${res.score}đ`;
    document.getElementById('result-correct-ratio').textContent = `${res.total_correct} / ${res.total_questions}`;

    // Đăng ký nút xem lời giải chi tiết
    document.getElementById('btn-show-solutions').onclick = () => {
      showExamSolutions(window.studentState.activeQuestions, window.studentState.answers);
    };

    // Ẩn bảng đáp án của kỳ thi trước
    document.getElementById('exam-solutions-container').classList.add('hidden');

  } catch (err) {
    alert('Nộp bài thất bại: ' + err.message);
  }
};

// Hiển thị lời giải chi tiết (Correct/Incorrect highlights)
function showExamSolutions(questions, studentAnswers) {
  const container = document.getElementById('exam-solutions-container');
  const list = document.getElementById('exam-solutions-list');
  
  list.innerHTML = '';
  container.classList.remove('hidden');

  const grouped = groupQuestions(questions);
  grouped.forEach((g, gIdx) => {
    if (g.type === 'single') {
      const qNum = g.original_num;
      const sAns = studentAnswers[qNum] || 'Chưa làm';
      const cAns = g.correct_answer.toUpperCase().trim();
      const isCorrect = sAns.toUpperCase().trim() === cAns;

      const div = document.createElement('div');
      div.className = `p-6 rounded-2xl border ${
        isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/10'
      } space-y-4`;

      div.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
            isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }">
            ${qNum}
          </span>
          <span class="text-xs font-extrabold uppercase tracking-widest text-slate-400">${g.part || 'Câu Hỏi'}</span>
          <span class="ml-auto text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-600'} flex items-center gap-1">
            ${isCorrect ? '✓ Trả lời đúng' : '✗ Trả lời sai'}
          </span>
        </div>
        <p class="font-semibold text-slate-800 text-sm whitespace-pre-line">${g.question_text}</p>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div class="p-2 border rounded-lg ${cAns === 'A' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'A' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
            A. ${g.option_a}
          </div>
          <div class="p-2 border rounded-lg ${cAns === 'B' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'B' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
            B. ${g.option_b}
          </div>
          <div class="p-2 border rounded-lg ${cAns === 'C' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'C' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
            C. ${g.option_c}
          </div>
          <div class="p-2 border rounded-lg ${cAns === 'D' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'D' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
            D. ${g.option_d}
          </div>
        </div>

        <div class="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Giải thích của Cô Hiền:</p>
          <p class="text-xs text-slate-600 leading-relaxed">${g.explanation || 'Không có lời giải thích sẵn.'}</p>
        </div>
      `;
      list.appendChild(div);
    } else if (g.type === 'reading_group') {
      // Khối cha giải thích bài đọc hiểu
      const groupBlock = document.createElement('div');
      groupBlock.className = 'bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6';
      
      groupBlock.innerHTML = `
        <div class="border-b border-slate-100 pb-3">
          <span class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i> Lời Giải Bài Đọc Hiểu (Reading Comprehension)
          </span>
        </div>
        <div class="bg-slate-50 border border-slate-150 rounded-2xl p-5 leading-relaxed text-slate-800 text-sm whitespace-pre-line font-medium max-h-[250px] overflow-y-auto">
          ${g.passage}
        </div>
        <div class="space-y-4" id="solutions-sub-container-${gIdx}">
        </div>
      `;
      list.appendChild(groupBlock);

      const subContainer = groupBlock.querySelector(`#solutions-sub-container-${gIdx}`);
      g.subQuestions.forEach((subQ) => {
        const qNum = subQ.original_num;
        const sAns = studentAnswers[qNum] || 'Chưa làm';
        const cAns = subQ.correct_answer.toUpperCase().trim();
        const isCorrect = sAns.toUpperCase().trim() === cAns;

        const subDiv = document.createElement('div');
        subDiv.className = `p-5 rounded-2xl border ${
          isCorrect ? 'border-emerald-200 bg-emerald-50/10' : 'border-rose-200 bg-rose-50/5'
        } space-y-3`;

        subDiv.innerHTML = `
          <div class="flex items-center gap-2 border-b border-slate-50 pb-1.5">
            <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
              isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }">
              ${qNum}
            </span>
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Đọc hiểu</span>
            <span class="ml-auto text-[10px] font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-600'} flex items-center gap-0.5">
              ${isCorrect ? '✓ Trả lời đúng' : '✗ Trả lời sai'}
            </span>
          </div>
          <p class="font-semibold text-slate-800 text-sm whitespace-pre-line">${subQ.question_text}</p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2 border rounded-lg ${cAns === 'A' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'A' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
              A. ${subQ.option_a}
            </div>
            <div class="p-2 border rounded-lg ${cAns === 'B' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'B' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
              B. ${subQ.option_b}
            </div>
            <div class="p-2 border rounded-lg ${cAns === 'C' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'C' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
              C. ${subQ.option_c}
            </div>
            <div class="p-2 border rounded-lg ${cAns === 'D' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'border-slate-100'} ${sAns === 'D' && !isCorrect ? 'bg-rose-50 border-rose-300' : ''}">
              D. ${subQ.option_d}
            </div>
          </div>

          <div class="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Giải thích của Cô Hiền:</p>
            <p class="text-xs text-slate-600 leading-relaxed">${subQ.explanation || 'Không có lời giải thích sẵn.'}</p>
          </div>
        `;
        subContainer.appendChild(subDiv);
      });
    }
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Cuộn mượt mà đến khu vực đáp án chi tiết
  container.scrollIntoView({ behavior: 'smooth' });
}

window.backToExamList = () => {
  document.getElementById('s-exams-list-screen').classList.remove('hidden');
  document.getElementById('s-exams-taking-screen').classList.add('hidden');
  document.getElementById('s-exams-results-screen').classList.add('hidden');
  loadStudentExams();
};


// ==========================================
// 4. HỎI ĐÁP CÔ HIỀN (Q&A BOARD)
// ==========================================

window.loadStudentQna = async () => {
  const container = document.getElementById('s-qna-list');
  try {
    const list = await window.apiFetch('/api/qna');
    if (list.length === 0) {
      container.innerHTML = '<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Con chưa có câu hỏi nào. Đừng ngại hỏi Cô Hiền nhé!</div>';
      return;
    }
    
    container.innerHTML = list.map(q => {
      let answerHtml = '';
      if (q.status === 'ai_answered' && q.ai_answer) {
        answerHtml = `
          <div class="mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100 flex gap-3">
            <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm shrink-0">👩‍🏫</div>
            <div class="text-sm text-slate-800 leading-relaxed"><strong class="text-brand-700 block mb-1">Cô Hiền (AI):</strong>${q.ai_answer.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      } else if (q.status === 'teacher_answered' && q.teacher_answer) {
        answerHtml = `
          <div class="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0">👩‍🏫</div>
            <div class="text-sm text-slate-800 leading-relaxed"><strong class="text-emerald-700 block mb-1">Cô Hiền:</strong>${q.teacher_answer.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      } else {
         answerHtml = `
          <div class="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
            <i data-lucide="clock" class="w-4 h-4"></i> Đang chờ Cô Hiền trả lời...
          </div>
          <button onclick="requestAiAnswer(${q.id})" class="mt-2 text-xs text-brand-600 hover:underline flex items-center gap-1">
            <i data-lucide="bot" class="w-3 h-3"></i> Nhờ AI trả lời ngay
          </button>
         `;
      }
      
      return `
        <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div class="text-sm text-slate-600 mb-2 font-medium">Câu hỏi của con:</div>
          <div class="text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">${q.question_text.replace(/\n/g, '<br>')}</div>
          ${answerHtml}
        </div>
      `;
    }).join('');
    
    if(window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">Lỗi: ${err.message}</div>`;
  }
};

window.requestAiAnswer = async (questionId) => {
  try {
    alert('AI đang suy nghĩ câu trả lời...');
    await window.apiFetch(`/api/qna/${questionId}/ai-answer`, { method: 'POST' });
    alert('AI đã trả lời thành công!');
    window.loadStudentQna();
  } catch (err) {
    alert(err.message);
  }
};

document.getElementById('qna-input-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('qna-input-msg');
  const question_text = input.value.trim();
  if (!question_text) return;
  
  const btn = e.target.querySelector('button');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = 'Đang gửi...';
  btn.disabled = true;
  
  try {
    await window.apiFetch('/api/qna', {
      method: 'POST',
      body: JSON.stringify({ question_text })
    });
    input.value = '';
    alert('Đã gửi câu hỏi thành công! Cô Hiền sẽ sớm trả lời con.');
    window.loadStudentQna();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
});


// ==========================================
// 5. PHÂN TÍCH VĂN BẢN (STUDENT ANALYZER)
// ==========================================

window.analyzeStudentWriting = async () => {
  const text = document.getElementById('student-writing-text').value.trim();
  if (!text) {
    alert('Con vui lòng dán một bài luận hoặc văn bản trước nhé!');
    return;
  }

  const btn = document.getElementById('btn-analyze-writing');
  const originText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Cô đang đọc và phân tích bài luận cho con nhé...`;

  const placeholder = document.getElementById('writing-analysis-result-placeholder');
  const resultBox = document.getElementById('writing-analysis-result');

  try {
    const res = await window.apiFetch('/api/ai/analyze-exam', {
      method: 'POST',
      body: JSON.stringify({ exam_text: text })
    });

    placeholder.classList.add('hidden');
    resultBox.classList.remove('hidden');

    // Chuyển đổi cú pháp markdown đơn giản thành thẻ HTML để học sinh dễ đọc
    const htmlOutput = res.analysis
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-extrabold">$1</strong>')
      .replace(/### (.*?)(<br>|<\/p>)/g, '<h4 class="text-base font-extrabold text-brand-600 mt-4 mb-2">$1</h4>')
      .replace(/- (.*?)(<br>|<\/p>)/g, '<li class="ml-4 list-disc text-xs">$1</li>');

    resultBox.innerHTML = `<p class="mb-4">${htmlOutput}</p>`;

  } catch (err) {
    alert('Không thể thực hiện phân tích: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originText;
  }
};

// Hàm helper nhóm câu hỏi có bài đọc hiểu dùng chung
function groupQuestions(questions) {
  const grouped = [];
  let currentPassage = null;
  let currentGroup = null;

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    if (q.question_text && q.question_text.startsWith('[READING_PASSAGE]')) {
      const parts = q.question_text.substring('[READING_PASSAGE]'.length).split('|||');
      const passage = parts[0] || '';
      const subQuestionText = parts.slice(1).join('|||') || '';

      if (currentPassage === passage && currentGroup) {
        currentGroup.subQuestions.push({
          ...q,
          original_num: qNum,
          question_text: subQuestionText
        });
      } else {
        currentPassage = passage;
        currentGroup = {
          type: 'reading_group',
          passage: passage,
          part: q.part || 'Đọc hiểu',
          subQuestions: [{
            ...q,
            original_num: qNum,
            question_text: subQuestionText
          }]
        };
        grouped.push(currentGroup);
      }
    } else {
      currentPassage = null;
      currentGroup = null;
      grouped.push({
        type: 'single',
        original_num: qNum,
        ...q
      });
    }
  });

  return grouped;
}
