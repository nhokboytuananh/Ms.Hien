/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import { getGeminiClient, generateWithRetry } from '../lib/gemini.js';
import { Type } from '@google/genai';

const router = express.Router();

/**
 * Cấu trúc JSON chung cho câu hỏi thi Tiếng Anh trắc nghiệm
 */
const QUESTION_SCHEMA = {
  type: Type.ARRAY,
  description: "Mảng chứa danh sách các câu hỏi tiếng Anh trắc nghiệm.",
  items: {
    type: Type.OBJECT,
    properties: {
      part: { type: Type.STRING, description: "Phần thi: 'Pronunciation', 'Stress', 'Grammar', 'Vocabulary', 'Reading', 'Writing'" },
      question_text: { type: Type.STRING, description: "Nội dung câu hỏi đầy đủ" },
      option_a: { type: Type.STRING, description: "Lựa chọn A" },
      option_b: { type: Type.STRING, description: "Lựa chọn B" },
      option_c: { type: Type.STRING, description: "Lựa chọn C" },
      option_d: { type: Type.STRING, description: "Lựa chọn D" },
      correct_answer: { type: Type.STRING, description: "Đáp án đúng, chỉ gồm 1 chữ in hoa: A, B, C hoặc D" },
      explanation: { type: Type.STRING, description: "Lời giải thích cặn kẽ bằng tiếng Việt tại sao chọn đáp án đó" }
    },
    required: ["part", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation"]
  }
};

/**
 * @route POST /api/ai/generate-thpt
 * @desc AI tạo đề luyện thi THPT Quốc Gia (20 câu trắc nghiệm chất lượng cao) -> Lưu DB -> Trả về exam_id
 */
router.post('/generate-thpt', requireAuth, requireTeacher, async (req, res) => {
  const { grade, topic } = req.body; // grade mặc định là 12

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình. Vui lòng thiết lập API Key.' });
  }

  try {
    const currentYear = new Date().getFullYear();
    const targetGrade = grade ? Number(grade) : 12;
    const themeInfo = topic ? `với các từ vựng và chủ đề liên quan đến: "${topic}"` : "bám sát chương trình THPT hiện hành";

    const systemPrompt = 
      "Bạn là một chuyên gia ra đề thi THPT Quốc gia môn Tiếng Anh giàu kinh nghiệm. " +
      "Hãy soạn thảo một đề thi thử trắc nghiệm tiếng Anh chất lượng cao gồm đúng 20 câu hỏi, cấu trúc chuẩn hóa, " +
      "có sự phân hóa học sinh rõ rệt (60% nhận biết-thông hiểu, 30% vận dụng, 10% vận dụng cao). " +
      "Mỗi câu hỏi phải bao gồm đầy đủ 4 đáp án lựa chọn A, B, C, D, chỉ rõ đáp án đúng và có giải thích chi tiết bằng tiếng Việt.";

    const contents = `Hãy tạo 20 câu hỏi trắc nghiệm luyện thi THPT Quốc Gia dành cho học sinh Lớp ${targetGrade} ${themeInfo}.`;

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: QUESTION_SCHEMA
      }
    });

    const questions = JSON.parse(response.text.trim());

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Không thể chuyển đổi câu hỏi sang cấu trúc mảng.");
    }

    // 1. Lưu thông tin đề thi AI vào DB
    const examTitle = `Đề Luyện Thi THPT QG Lớp ${targetGrade} (Tạo Tự Động Bởi AI Ms.Hiền)` + (topic ? ` - Chủ đề: ${topic}` : "");
    const examRes = await db.query(
      'INSERT INTO exams (title, exam_type, year, province, grade, duration_minutes, difficulty, is_ai_generated, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [examTitle, 'thpt_qg', currentYear, 'AI Generator', targetGrade, 60, 'medium', true, req.user.id]
    );

    const newExam = examRes.rows[0];

    // 2. Lưu các câu hỏi thi vào DB
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        'INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          newExam.id,
          i + 1,
          q.part || 'Grammar',
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
      message: 'AI đã tạo thành công đề luyện thi THPT Quốc Gia 20 câu hỏi!',
      exam_id: newExam.id
    });

  } catch (error) {
    console.error('Lỗi khi AI tạo đề THPT QG:', error);
    res.status(500).json({ error: 'Quá trình tạo đề thi THPT tự động thất bại. Vui lòng thử lại.' });
  }
});

/**
 * @route POST /api/ai/generate-hsg
 * @desc AI tạo đề thi Học Sinh Giỏi (15 câu trắc nghiệm nâng cao) -> Lưu DB -> Trả về exam_id
 */
router.post('/generate-hsg', requireAuth, requireTeacher, async (req, res) => {
  const { grade, difficulty_level } = req.body; // difficulty_level: 'truong', 'tinh', 'quocgia'

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình. Vui lòng thiết lập API Key.' });
  }

  try {
    const currentYear = new Date().getFullYear();
    const targetGrade = grade ? Number(grade) : 11;
    const diffText = difficulty_level === 'tinh' ? 'Cấp Tỉnh' : (difficulty_level === 'quocgia' ? 'Cấp Quốc Gia' : 'Cấp Trường');
    const examType = difficulty_level === 'tinh' ? 'hsg_tinh' : (difficulty_level === 'quocgia' ? 'hsg_quocgia' : 'hsg_truong');

    const systemPrompt = 
      "Bạn là giáo viên chuyên bồi dưỡng Học sinh giỏi môn Tiếng Anh cấp Quốc gia. " +
      "Hãy soạn thảo 15 câu hỏi trắc nghiệm tiếng Anh cực kỳ nâng cao và học thuật (Lexico-Grammar, Collocations, Idioms, Phrasal verbs, Cloze test, Reading). " +
      "Đề thi đòi hỏi tính tư duy sâu sắc, vốn từ vựng phong phú. " +
      "Mỗi câu hỏi phải bao gồm đầy đủ 4 đáp án lựa chọn A, B, C, D, chỉ rõ đáp án đúng và giải thích cấu trúc ngữ pháp hay thành ngữ đi kèm một cách chi tiết bằng tiếng Việt.";

    const contents = `Hãy soạn thảo đề thi Học Sinh Giỏi ${diffText} môn Tiếng Anh lớp ${targetGrade} gồm 15 câu hỏi học thuật cực khó.`;

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: QUESTION_SCHEMA
      }
    });

    const questions = JSON.parse(response.text.trim());

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Không thể chuyển đổi danh sách câu hỏi HSG thành mảng.");
    }

    // 1. Lưu thông tin đề thi HSG AI vào DB
    const examTitle = `Đề thi Học Sinh Giỏi ${diffText} Lớp ${targetGrade} (Tạo Tự Động Bởi AI Ms.Hiền)`;
    const examRes = await db.query(
      'INSERT INTO exams (title, exam_type, year, province, grade, duration_minutes, difficulty, is_ai_generated, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [examTitle, examType, currentYear, 'AI Generator', targetGrade, 45, 'hard', true, req.user.id]
    );

    const newExam = examRes.rows[0];

    // 2. Lưu các câu hỏi thi vào DB
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        'INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          newExam.id,
          i + 1,
          q.part || 'Lexico-Grammar',
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
      message: `AI đã tạo thành công đề thi Học Sinh Giỏi môn Tiếng Anh ${diffText}!`,
      exam_id: newExam.id
    });

  } catch (error) {
    console.error('Lỗi khi AI tạo đề thi HSG:', error);
    res.status(500).json({ error: 'Quá trình tạo đề thi Học Sinh Giỏi tự động thất bại.' });
  }
});

/**
 * @route POST /api/ai/analyze-exam
 * @desc Phân tích đề thi học sinh dán vào, chỉ ra điểm mạnh/yếu, cấu trúc ngữ pháp quan trọng
 */
router.post('/analyze-exam', requireAuth, async (req, res) => {
  const { exam_text } = req.body;

  if (!exam_text) {
    return res.status(400).json({ error: 'Vui lòng cung cấp nội dung đề hoặc bài làm để phân tích.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình. Vui lòng thiết lập API Key.' });
  }

  try {
    const systemPrompt = 
      "Bạn là Cô Hiền - giáo viên dạy tiếng Anh THPT tận tâm và thông thái. " +
      "Nhiệm vụ của bạn là phân tích một đề thi, một đoạn văn bài tập, hoặc bài làm tiếng Anh do học sinh dán vào. " +
      "Hãy đưa ra đánh giá, nhận xét chi tiết, thân thiện bằng tiếng Việt. Cụ thể:\n" +
      "1. Tóm tắt nội dung học thuật chính của đề/bài viết.\n" +
      "2. Chỉ ra các chủ điểm ngữ pháp trọng tâm xuất hiện (Present perfect, Relatives, passive, inversion...).\n" +
      "3. Liệt kê từ vựng khó cần ghi nhớ kèm nghĩa tiếng Việt và cách dùng.\n" +
      "4. Gợi ý phương pháp ôn tập hoặc mẹo tránh bẫy đối với dạng bài này.\n" +
      "Hãy định dạng câu trả lời bằng Markdown rõ ràng, dễ đọc, có các gạch đầu dòng, lời động viên học sinh trìu mến.";

    const contents = `Hãy phân tích nội dung sau giúp học sinh của cô:\n\n${exam_text}`;

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.json({ analysis: response.text });
  } catch (error) {
    console.error('Lỗi phân tích bài thi:', error);
    res.status(500).json({ error: 'Không thể phân tích đề thi lúc này.' });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc Hỏi đáp trực tuyến với Giáo viên ảo "Cô Hiền"
 */
router.post('/chat', requireAuth, async (req, res) => {
  const { message, chat_history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Vui lòng điền tin nhắn.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Tính năng Giáo viên ảo chưa được bật (Thiếu API Key).' });
  }

  try {
    const systemPrompt = 
      "Bạn là Cô Hiền, giáo viên dạy tiếng Anh cấp THPT tại Việt Nam. " +
      "Tính cách của bạn: hiền hậu, vô cùng yêu thương học trò, nhẹ nhàng, kiên nhẫn và có chuyên môn sư phạm tuyệt vời. " +
      "Hãy giao tiếp bằng tiếng Việt, thi thoảng chêm thêm một số cụm từ tiếng Anh ngắn thân quen (giao tiếp song ngữ tự nhiên) để giúp học sinh nâng cao phản xạ. " +
      "Ví dụ: 'Hello các con! Rất vui được gặp các con hôm nay.', 'Excellent! Con làm đúng rồi!', 'Đừng lo lắng nhé, practice makes perfect!'. " +
      "Giải thích ngữ pháp một cách dễ hiểu như dạy cho trẻ nhỏ, sửa lỗi sai phát âm hay chia động từ bất cứ khi nào thấy học sinh viết sai trong khung chat. " +
      "Động viên tinh thần học tập của các em nhiệt tình.";

    // Chuyển lịch sử trò chuyện sang định dạng Gemini API nếu có
    let contents = [];
    if (chat_history && Array.isArray(chat_history)) {
      chat_history.forEach(item => {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.json({ reply: response.text });

  } catch (error) {
    console.error('Lỗi chat giáo viên ảo:', error);
    res.status(500).json({ error: 'Cô Hiền đang bận chấm bài, vui lòng nhắn lại sau ít phút nhé!' });
  }
});

export default router;
