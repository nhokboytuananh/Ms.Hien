/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import { getGeminiClient, generateWithRetry } from '../lib/gemini.js';
import { Type } from "@google/genai";

const router = express.Router();

/**
 * @route GET /api/exams
 * @desc Lấy danh sách đề thi (có thể lọc theo loại exam_type, khối grade)
 */
router.get('/exams', requireAuth, async (req, res) => {
  const { type, grade } = req.query;

  try {
    const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC');
    let exams = result.rows;

    // Nếu người dùng là học sinh, chỉ hiển thị đề thi đã giao (status === 'assigned' hoặc undefined)
    if (req.user && req.user.role === 'student') {
      const studentGrade = req.user.class_name ? req.user.class_name.match(/^(10|11|12)/)?.[1] : null;
      exams = exams.filter(e => {
        if (e.status !== 'assigned' && e.status !== 'published' && e.status !== undefined) return false;
        
        if (e.assigned_groups) {
          try {
            const groups = typeof e.assigned_groups === 'string' ? JSON.parse(e.assigned_groups) : e.assigned_groups;
            if (groups.includes('all')) return true;
            if (studentGrade && groups.includes(studentGrade)) return true;
            return false;
          } catch(err) {
            return true;
          }
        }
        return true;
      });
    }

    if (type) {
      exams = exams.filter(e => e.exam_type === type);
    }
    if (grade) {
      exams = exams.filter(e => e.grade === Number(grade));
    }

    res.json(exams);
  } catch (error) {
    console.error('Lỗi khi tải đề thi:', error);
    res.status(500).json({ error: 'Không thể tải danh sách đề thi.' });
  }
});

/**
 * @route PUT /api/exams/:id
 * @desc Chỉnh sửa thông tin đề thi và danh sách câu hỏi (Chỉ dành cho Giáo viên)
 */
router.put('/exams/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { title, grade, duration_minutes, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Tiêu đề đề thi và danh sách câu hỏi là bắt buộc.' });
  }

  try {
    // 1. Cập nhật thông tin chung đề thi
    const examUpdateRes = await db.query(
      'UPDATE exams SET title = $1, grade = $2, duration_minutes = $3 WHERE id = $4 RETURNING *',
      [title, Number(grade) || 12, Number(duration_minutes) || 60, Number(id)]
    );

    if (examUpdateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi để cập nhật.' });
    }

    // 2. Xoá tất cả câu hỏi cũ của đề thi này
    await db.query('DELETE FROM exam_questions WHERE exam_id = $1', [Number(id)]);

    // 3. Thêm lại danh sách câu hỏi mới
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        'INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          Number(id),
          i + 1,
          q.part || 'Trắc nghiệm',
          q.question_text,
          q.option_a || '',
          q.option_b || '',
          q.option_c || '',
          q.option_d || '',
          (q.correct_answer || 'A').toUpperCase().trim(),
          q.explanation || ''
        ]
      );
    }

    res.json({
      message: 'Cập nhật đề thi thành công!',
      exam: examUpdateRes.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật đề thi:', error);
    res.status(500).json({ error: 'Không thể cập nhật đề thi.' });
  }
});

/**
 * @route PUT /api/exams/:id/status
 * @desc Cập nhật trạng thái đề thi (Nháp -> Giao bài cho học sinh)
 */
router.put('/exams/:id/status', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { status, assigned_groups } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Thiếu trạng thái status để cập nhật.' });
  }

  try {
    let result;
    if (assigned_groups) {
      result = await db.query('UPDATE exams SET status = $1, assigned_groups = $2 WHERE id = $3 RETURNING *', [status, JSON.stringify(assigned_groups), Number(id)]);
    } else {
      result = await db.query('UPDATE exams SET status = $1 WHERE id = $2 RETURNING *', [status, Number(id)]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi cần cập nhật.' });
    }
    res.json({
      message: status === 'assigned' ? 'Giao đề thi cho học sinh thành công!' : 'Đã chuyển đề thi về dạng nháp.',
      exam: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đề thi:', error);
    res.status(500).json({ error: `Không thể cập nhật trạng thái đề thi: ${error.message}` });
  }
});

/**
 * @route GET /api/exams/:id
 * @desc Lấy chi tiết đề thi gồm đề bài + danh sách toàn bộ câu hỏi
 */
router.get('/exams/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Lấy thông tin đề thi
    const examRes = await db.query('SELECT * FROM exams WHERE id = $1', [Number(id)]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Đề thi không tồn tại.' });
    }

    const exam = examRes.rows[0];

    // 2. Lấy danh sách các câu hỏi của đề thi đó
    const questionsRes = await db.query(
      'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY question_order ASC',
      [Number(id)]
    );

    res.json({
      exam,
      questions: questionsRes.rows
    });
  } catch (error) {
    console.error('Lỗi khi tải chi tiết đề thi:', error);
    res.status(500).json({ error: 'Không thể tải chi tiết đề thi.' });
  }
});

/**
 * @route GET /api/exams/:id/export-word
 * @desc Xuất đề thi ra file Word (.doc) (Chỉ dành cho Giáo viên)
 */
router.get('/exams/:id/export-word', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Lấy thông tin đề thi
    const examRes = await db.query('SELECT * FROM exams WHERE id = $1', [Number(id)]);
    if (examRes.rows.length === 0) {
      return res.status(404).send('<h1>Đề thi không tồn tại.</h1>');
    }
    const exam = examRes.rows[0];

    // 2. Lấy danh sách câu hỏi
    const questionsRes = await db.query(
      'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY question_order ASC',
      [Number(id)]
    );
    const questions = questionsRes.rows;

    if (questions.length === 0) {
      return res.status(404).send('<h1>Đề thi chưa có câu hỏi nào để xuất bản.</h1>');
    }

    // 3. Nhóm câu hỏi theo bài đọc hiểu (giống client side)
    const grouped = [];
    let currentPassage = null;
    let currentGroup = null;

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (q.question_text && q.question_text.startsWith('[READING_PASSAGE]')) {
        const parts = q.question_text
          .substring('[READING_PASSAGE]'.length)
          .split('|||');
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
            subQuestions: [
              {
                ...q,
                original_num: qNum,
                question_text: subQuestionText
              }
            ]
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

    // 4. Tạo mã HTML cho câu hỏi
    let htmlQuestions = '';
    grouped.forEach((g) => {
      if (g.type === 'single') {
        htmlQuestions += `
          <div class="question-item">
            <span class="question-header">Câu ${g.original_num}:</span> ${g.question_text}
            <table class="options-grid">
              <tr>
                <td><strong>A.</strong> ${g.option_a || ''}</td>
                <td><strong>B.</strong> ${g.option_b || ''}</td>
                <td><strong>C.</strong> ${g.option_c || ''}</td>
                <td><strong>D.</strong> ${g.option_d || ''}</td>
              </tr>
            </table>
          </div>
        `;
      } else if (g.type === 'reading_group') {
        htmlQuestions += `
          <div class="passage-box">
            <strong>Read the following passage and mark the letter A, B, C, or D on your answer sheet to indicate the correct answer to each of the questions:</strong><br><br>
            ${g.passage.replace(/\n/g, '<br>')}
          </div>
        `;
        g.subQuestions.forEach((subQ) => {
          htmlQuestions += `
            <div class="question-item">
              <span class="question-header">Câu ${subQ.original_num}:</span> ${subQ.question_text}
              <table class="options-grid">
                <tr>
                  <td><strong>A.</strong> ${subQ.option_a || ''}</td>
                  <td><strong>B.</strong> ${subQ.option_b || ''}</td>
                  <td><strong>C.</strong> ${subQ.option_c || ''}</td>
                  <td><strong>D.</strong> ${subQ.option_d || ''}</td>
                </tr>
              </table>
            </div>
          `;
        });
      }
    });

    // 5. Tạo bảng đáp án Answer Key (chia thành 5 cột gọn gàng)
    const colsCount = 5;
    const rowsCount = Math.ceil(questions.length / colsCount);
    
    let answerKeyGridHtml = '<table class="answer-key-table"><thead><tr>';
    for (let c = 0; c < colsCount; c++) {
      answerKeyGridHtml += `<th>Câu hỏi</th><th>Đáp án</th>`;
    }
    answerKeyGridHtml += '</tr></thead><tbody>';
    
    for (let r = 0; r < rowsCount; r++) {
      answerKeyGridHtml += '<tr>';
      for (let c = 0; c < colsCount; c++) {
        const qIdx = r + c * rowsCount;
        if (qIdx < questions.length) {
          const q = questions[qIdx];
          answerKeyGridHtml += `<td><strong>Câu ${q.question_order}</strong></td><td style="color: #059669; font-weight: bold; text-align: center;">${q.correct_answer || 'A'}</td>`;
        } else {
          answerKeyGridHtml += `<td></td><td></td>`;
        }
      }
      answerKeyGridHtml += '</tr>';
    }
    answerKeyGridHtml += '</tbody></table>';

    // 6. Tạo danh sách hướng dẫn giải chi tiết
    let htmlExplanations = '';
    questions.forEach((q) => {
      htmlExplanations += `
        <div class="explanation-item">
          <strong>Câu ${q.question_order}:</strong> Chọn <strong>${q.correct_answer || 'A'}</strong><br>
          <span style="color: #4b5563;">Giải thích: ${q.explanation || 'Chưa có giải thích chi tiết.'}</span>
        </div>
      `;
    });

    // 7. Tạo toàn bộ tệp HTML hoàn chỉnh tương thích Word
    const fileContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${exam.title}</title>
  <style>
    @page {
      size: A4;
      margin: 1in;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.25;
      color: #000000;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      border: none;
      padding: 0;
      vertical-align: top;
    }
    .title-section {
      text-align: center;
      margin-top: 15px;
      margin-bottom: 25px;
    }
    .exam-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .exam-meta {
      font-size: 10.5pt;
      font-style: italic;
    }
    .divider {
      border-top: 1.5px solid #000000;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    .passage-box {
      border: 1px dashed #000000;
      background-color: #fcfcfc;
      padding: 8px;
      margin-top: 10px;
      margin-bottom: 15px;
    }
    .question-item {
      margin-bottom: 12px;
    }
    .question-header {
      font-weight: bold;
    }
    .options-grid {
      width: 100%;
      margin-top: 3px;
      margin-bottom: 8px;
    }
    .options-grid td {
      width: 25%;
      padding: 1px 0;
      vertical-align: top;
    }
    .page-break {
      page-break-before: always;
    }
    .section-heading {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 25px;
      margin-bottom: 10px;
      text-transform: uppercase;
      text-align: center;
    }
    .answer-key-table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 15px;
      margin-bottom: 25px;
    }
    .answer-key-table th, .answer-key-table td {
      border: 1px solid #000000;
      padding: 5px;
    }
    .answer-key-table th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: center;
    }
    .explanation-item {
      margin-bottom: 12px;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 8px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 50%; text-align: center;">
        <span style="font-weight: bold; font-size: 11pt;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</span><br>
        <span style="font-weight: bold; font-size: 11pt; text-decoration: underline;">KỲ THI THỬ THPT QUỐC GIA</span>
      </td>
      <td style="width: 50%; text-align: center;">
        <span style="font-weight: bold; font-size: 11pt;">ĐỀ THI CHÍNH THỨC</span><br>
        <span style="font-style: italic; font-size: 11pt;">(Đề thi gồm có ${questions.length} câu trắc nghiệm)</span>
      </td>
    </tr>
  </table>

  <div class="title-section">
    <div class="exam-title">${exam.title}</div>
    <div class="exam-meta">
      Thời gian làm bài: ${exam.duration_minutes} phút | Khối: ${exam.grade}<br>
      Mã đề thi: 101 - Mức độ: ${exam.difficulty === 'hard' ? 'Khó' : 'Trung bình'}
    </div>
  </div>
  
  <div class="divider"></div>

  ${htmlQuestions}

  <!-- PAGE BREAK FOR ANSWER KEY & EXPLANATIONS -->
  <div class="page-break"></div>
  
  <div class="section-heading">ĐÁP ÁN ĐỀ THI: ${exam.title}</div>
  ${answerKeyGridHtml}

  <div class="section-heading" style="text-align: left; border-bottom: 1px solid #000000; padding-bottom: 5px; margin-top: 30px;">HƯỚNG DẪN GIẢI CHI TIẾT</div>
  <div style="margin-top: 15px;">
    ${htmlExplanations}
  </div>
</body>
</html>
`;

    // 8. Đặt các header tải file
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(exam.title)}.doc"`);
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    // Gửi kèm BOM UTF-8 (\uFEFF) để Word hiển thị dấu tiếng Việt hoàn hảo
    res.send('\uFEFF' + fileContent);

  } catch (error) {
    console.error('Lỗi khi xuất đề thi ra Word:', error);
    res.status(500).send('<h1>Lỗi khi xuất đề thi ra Word: ' + error.message + '</h1>');
  }
});

/**
 * @route POST /api/exams
 * @desc Tạo một đề thi thủ công hoàn chỉnh (Chỉ dành cho Giáo viên)
 */
router.post('/exams', requireAuth, requireTeacher, async (req, res) => {
  const { title, exam_type, year, province, grade, duration_minutes, difficulty, questions } = req.body;

  if (!title || !exam_type || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Thiếu thông tin đề thi hoặc danh sách câu hỏi.' });
  }

  try {
    const creatorId = req.user.id;

    // 1. Lưu thông tin đề thi trước để sinh ra exam_id
    const examResult = await db.query(
      'INSERT INTO exams (title, exam_type, year, province, grade, duration_minutes, difficulty, is_ai_generated, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        title,
        exam_type,
        year ? Number(year) : new Date().getFullYear(),
        province || 'Toàn quốc',
        grade ? Number(grade) : 12,
        duration_minutes ? Number(duration_minutes) : 60,
        difficulty || 'medium',
        false,
        creatorId
      ]
    );

    const newExam = examResult.rows[0];

    // 2. Lưu từng câu hỏi vào bảng exam_questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        'INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          newExam.id,
          i + 1,
          q.part || 'Chung',
          q.question_text,
          q.option_a || '',
          q.option_b || '',
          q.option_c || '',
          q.option_d || '',
          (q.correct_answer || 'A').toUpperCase().trim(),
          q.explanation || ''
        ]
      );
    }

    res.status(201).json({
      message: 'Tạo đề thi thủ công thành công!',
      exam_id: newExam.id
    });
  } catch (error) {
    console.error('Lỗi khi tạo đề thi thủ công:', error);
    res.status(500).json({ error: 'Không thể lưu đề thi vào hệ thống.' });
  }
});

/**
 * @route POST /api/exams/upload
 * @desc Dán văn bản thô đề thi -> AI phân tích (Gemini) -> Lưu DB tự động (Chỉ dành cho Giáo viên)
 */
router.post('/exams/upload', requireAuth, requireTeacher, async (req, res) => {
  const { title, exam_type, year, province, grade, duration_minutes, difficulty, raw_text } = req.body;

  if (!title || !raw_text) {
    return res.status(400).json({ error: 'Tiêu đề đề thi và nội dung văn bản đề là bắt buộc.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình (Thiếu API Key). Vui lòng thử lại sau.' });
  }

  try {
    // 1. Thiết lập hướng dẫn hệ thống và gửi nội dung văn bản đề thô cho Gemini để phân tách cấu trúc
    const systemPrompt = 
      "Bạn là một chuyên gia khảo thí Tiếng Anh THPT tại Việt Nam. " +
      "Nhiệm vụ của bạn là đọc một văn bản thô chứa các câu hỏi thi trắc nghiệm Tiếng Anh (bao gồm câu hỏi, 4 lựa chọn A, B, C, D) " +
      "và chuyển đổi nó sang dạng dữ liệu JSON cấu trúc chính xác theo schema được cung cấp. " +
      "Hãy cố gắng trích xuất đáp án đúng và phần giải thích ngắn gọn bằng tiếng Việt cho mỗi câu hỏi. Nếu văn bản không nêu rõ đáp án, hãy tự giải và đưa ra đáp án chính xác.";

    const contents = 
      `Hãy phân tích đề thi sau và trích xuất thành danh sách JSON:\n\n${raw_text}`;

    // Định nghĩa cấu trúc JSON đầu ra cho Gemini
    const responseSchema = {
      type: Type.ARRAY,
      description: "Danh sách toàn bộ các câu hỏi trắc nghiệm tiếng Anh được trích xuất.",
      items: {
        type: Type.OBJECT,
        properties: {
          part: { type: Type.STRING, description: "Phần của đề thi, ví dụ: 'Pronunciation', 'Grammar', 'Reading', 'Vocabulary'" },
          question_text: { type: Type.STRING, description: "Nội dung câu hỏi đầy đủ, ví dụ: 'Choose the word whose underlined part...'" },
          option_a: { type: Type.STRING, description: "Lựa chọn A" },
          option_b: { type: Type.STRING, description: "Lựa chọn B" },
          option_c: { type: Type.STRING, description: "Lựa chọn C" },
          option_d: { type: Type.STRING, description: "Lựa chọn D" },
          correct_answer: { type: Type.STRING, description: "Đáp án đúng, chỉ gồm 1 chữ cái in hoa: A, B, C hoặc D" },
          explanation: { type: Type.STRING, description: "Lời giải thích ngắn gọn bằng tiếng Việt" }
        },
        required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer"]
      }
    };

    const aiResponse = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const parsedQuestions = JSON.parse(aiResponse.text.trim());

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error("Không thể phân tích dữ liệu câu hỏi từ văn bản cung cấp.");
    }

    // 2. Tạo đề thi mới trong bảng exams
    const creatorId = req.user.id;
    const examResult = await db.query(
      'INSERT INTO exams (title, exam_type, year, province, grade, duration_minutes, difficulty, is_ai_generated, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        title,
        exam_type || 'thpt_qg',
        year ? Number(year) : new Date().getFullYear(),
        province || 'Toàn quốc',
        grade ? Number(grade) : 12,
        duration_minutes ? Number(duration_minutes) : 60,
        difficulty || 'medium',
        true, // Đánh dấu là được sinh/xử lý bởi AI
        creatorId
      ]
    );

    const newExam = examResult.rows[0];

    // 3. Lưu toàn bộ các câu hỏi đã được AI parse vào bảng exam_questions
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      await db.query(
        'INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          newExam.id,
          i + 1,
          q.part || 'Trắc nghiệm',
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer.toUpperCase().trim(),
          q.explanation || ''
        ]
      );
    }

    res.status(201).json({
      message: `Tải đề thi lên thành công! AI đã nhận dạng được ${parsedQuestions.length} câu hỏi.`,
      exam_id: newExam.id
    });

  } catch (error) {
    console.error('Lỗi khi parse và tải đề lên bằng AI:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi trong quá trình phân tích đề thi bằng AI. Vui lòng kiểm tra lại định dạng đề.' });
  }
});

/**
 * @route POST /api/exam-results
 * @desc Nộp bài làm của học sinh, chấm điểm và lưu kết quả
 */
router.post('/exam-results', requireAuth, async (req, res) => {
  const { exam_id, answers, seconds_spent } = req.body; // answers: {"1":"A", "2":"C", ...}

  if (!exam_id || !answers) {
    return res.status(400).json({ error: 'Thiếu ID đề thi hoặc đáp án bài làm.' });
  }

  try {
    const studentId = req.user.id;

    // 1. Lấy danh sách câu hỏi và đáp án đúng từ database để đối chiếu
    const questionsRes = await db.query(
      'SELECT id, question_order, correct_answer FROM exam_questions WHERE exam_id = $1',
      [Number(exam_id)]
    );

    const questions = questionsRes.rows;
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi của đề thi này.' });
    }

    // 2. Chấm điểm bài làm
    let totalCorrect = 0;
    const totalQuestions = questions.length;

    questions.forEach(q => {
      const studentAns = answers[q.question_order];
      const correctAns = q.correct_answer ? String(q.correct_answer).toUpperCase().trim() : '';
      
      if (studentAns && correctAns && String(studentAns).toUpperCase().trim() === correctAns) {
        totalCorrect++;
      }
    });

    // Điểm số quy ra thang điểm 10.0 (Làm tròn đến 2 chữ số thập phân)
    const rawScore = (totalCorrect / totalQuestions) * 10;
    const finalScore = Math.round(rawScore * 100) / 100;

    // 3. Lưu kết quả làm bài vào bảng exam_results
    const result = await db.query(
      'INSERT INTO exam_results (student_id, exam_id, answers, score, total_correct, total_questions, seconds_spent) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [studentId, Number(exam_id), answers, finalScore, totalCorrect, totalQuestions, Number(seconds_spent) || 0]
    );

    res.status(201).json({
      message: 'Nộp bài thi thành công!',
      result: result.rows[0],
      total_correct: totalCorrect,
      total_questions: totalQuestions,
      score: finalScore
    });

  } catch (error) {
    console.error('Lỗi khi chấm điểm bài thi:', error);
    res.status(500).json({ error: `Không thể hoàn tất nộp bài thi: ${error.message}` });
  }
});

/**
 * @route GET /api/exam-results
 * @desc Xem danh sách kết quả làm bài thi
 * - Giáo viên: xem kết quả của toàn bộ học sinh cho một đề thi cụ thể (?exam_id=)
 * - Học sinh: xem lịch sử thi của cá nhân
 */
router.get('/exam-results', requireAuth, async (req, res) => {
  const { exam_id } = req.query;

  try {
    if (req.user.role === 'teacher') {
      if (!exam_id) {
        return res.status(400).json({ error: 'Yêu cầu truyền exam_id đối với quyền Giáo viên.' });
      }
      
      // Lấy toàn bộ kết quả thi kèm tên học sinh làm bài
      const result = await db.query(
        'SELECT r.*, u.full_name as student_name, u.class_name, u.email as student_email ' +
        'FROM exam_results r ' +
        'JOIN users u ON r.student_id = u.id ' +
        'WHERE r.exam_id = $1 ' +
        'ORDER BY r.completed_at DESC',
        [Number(exam_id)]
      );
      res.json(result.rows);
    } else {
      // Học sinh: Xem toàn bộ kết quả thi của chính mình
      const result = await db.query(
        'SELECT r.*, e.title as exam_title, e.exam_type, e.duration_minutes ' +
        'FROM exam_results r ' +
        'JOIN exams e ON r.exam_id = e.id ' +
        'WHERE r.student_id = $1 ' +
        'ORDER BY r.completed_at DESC',
        [req.user.id]
      );
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Lỗi khi xem kết quả thi:', error);
    res.status(500).json({ error: 'Không thể lấy kết quả làm bài.' });
  }
});

/**
 * @route DELETE /api/exams/:id
 * @desc Xóa đề thi (Chỉ dành cho Giáo viên)
 */
router.delete('/exams/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Xóa tất cả kết quả thi liên quan
    await db.query('DELETE FROM exam_results WHERE exam_id = $1', [Number(id)]);

    // 2. Xóa tất cả các câu hỏi thuộc đề thi
    await db.query('DELETE FROM exam_questions WHERE exam_id = $1', [Number(id)]);

    // 3. Xóa chính đề thi
    const result = await db.query('DELETE FROM exams WHERE id = $1 RETURNING *', [Number(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Đề thi không tồn tại.' });
    }

    res.json({ message: 'Đã xóa đề thi thành công!' });
  } catch (error) {
    console.error('Lỗi khi xóa đề thi:', error);
    res.status(500).json({ error: 'Không thể xóa đề thi.' });
  }
});

/**
 * @route GET /api/exams/:id/leaderboard
 * @desc Lấy bảng xếp hạng học sinh cho đề thi cụ thể
 */
router.get('/exams/:id/leaderboard', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const resultsRes = await db.query(
      'SELECT r.*, u.full_name as student_name, u.class_name, u.email as student_email ' +
      'FROM exam_results r ' +
      'JOIN users u ON r.student_id = u.id ' +
      'WHERE r.exam_id = $1 ' +
      'ORDER BY r.score DESC, r.seconds_spent ASC, r.completed_at ASC',
      [Number(id)]
    );

    const rows = resultsRes.rows;
    const studentStats = {};

    rows.forEach(row => {
      const sId = row.student_id;
      if (!studentStats[sId]) {
        studentStats[sId] = {
          student_id: sId,
          student_name: row.student_name,
          class_name: row.class_name,
          student_email: row.student_email,
          high_score: Number(row.score),
          fastest_seconds: Number(row.seconds_spent) || 0,
          attempts_count: 1,
          completed_at: row.completed_at
        };
      } else {
        const stats = studentStats[sId];
        stats.attempts_count += 1;
        
        if (Number(row.score) > stats.high_score) {
          stats.high_score = Number(row.score);
          stats.fastest_seconds = Number(row.seconds_spent) || 0;
          stats.completed_at = row.completed_at;
        } else if (Number(row.score) === stats.high_score) {
          const rowSecs = Number(row.seconds_spent) || 0;
          if (rowSecs < stats.fastest_seconds) {
            stats.fastest_seconds = rowSecs;
            stats.completed_at = row.completed_at;
          }
        }
      }
    });

    const leaderboard = Object.values(studentStats).sort((a, b) => {
      if (b.high_score !== a.high_score) {
        return b.high_score - a.high_score;
      }
      return a.fastest_seconds - b.fastest_seconds;
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Lỗi khi lấy bảng xếp hạng đề thi:', error);
    res.status(500).json({ error: 'Không thể tải bảng xếp hạng đề thi.' });
  }
});

export default router;
