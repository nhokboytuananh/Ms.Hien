import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../db/index.js';
import { generateWithRetry } from '../lib/gemini.js';

const router = express.Router();

// GET /api/qna - Lấy danh sách câu hỏi (Giáo viên lấy tất cả, học sinh lấy của mình)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id } = req.user;
    let result;
    
    if (role === 'teacher') {
      result = await db.query(`
        SELECT q.*, u.full_name as student_name, u.class_name
        FROM student_questions q
        JOIN users u ON q.student_id = u.id
        ORDER BY q.created_at DESC
      `);
    } else {
      result = await db.query(`
        SELECT * FROM student_questions
        WHERE student_id = $1
        ORDER BY created_at DESC
      `, [id]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách câu hỏi:', error);
    res.status(500).json({ error: error.message || 'Lỗi máy chủ' });
  }
});

// POST /api/qna - Học sinh đặt câu hỏi
router.post('/', requireAuth, async (req, res) => {
  try {
    const { role, id } = req.user;
    if (role !== 'student') {
      return res.status(403).json({ error: 'Chỉ học sinh mới có thể đặt câu hỏi.' });
    }
    
    const { question_text } = req.body;
    if (!question_text) {
      return res.status(400).json({ error: 'Nội dung câu hỏi không được để trống.' });
    }
    
    const result = await db.query(`
      INSERT INTO student_questions (student_id, question_text)
      VALUES ($1, $2)
      RETURNING *
    `, [id, question_text]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi đặt câu hỏi:', error);
    res.status(500).json({ error: error.message || 'Lỗi máy chủ' });
  }
});

// POST /api/qna/:id/teacher-answer - Giáo viên trả lời câu hỏi
router.post('/:id/teacher-answer', requireAuth, async (req, res) => {
  try {
    const { role, id: teacherId } = req.user;
    if (role !== 'teacher') {
      return res.status(403).json({ error: 'Chỉ giáo viên mới có thể trả lời câu hỏi.' });
    }
    
    const { id } = req.params;
    const { teacher_answer } = req.body;
    
    if (!teacher_answer) {
      return res.status(400).json({ error: 'Nội dung trả lời không được để trống.' });
    }
    
    const result = await db.query(`
      UPDATE student_questions
      SET teacher_answer = $1, answered_by_teacher_id = $2, status = 'teacher_answered', updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [teacher_answer, teacherId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi giáo viên trả lời câu hỏi:', error);
    res.status(500).json({ error: error.message || 'Lỗi máy chủ' });
  }
});

// POST /api/qna/:id/ai-answer - AI trả lời câu hỏi
router.post('/:id/ai-answer', requireAuth, async (req, res) => {
  try {
    const { role } = req.user;
    // Cả học sinh và giáo viên đều có thể yêu cầu AI trả lời
    
    const { id } = req.params;
    
    // Lấy thông tin câu hỏi
    const questionResult = await db.query('SELECT * FROM student_questions WHERE id = $1', [id]);
    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
    }
    
    const question = questionResult.rows[0];
    
    // Gọi Gemini API để lấy câu trả lời
    const prompt = `
      Bạn là Cô Hiền, một giáo viên Tiếng Anh cấp 3 thân thiện, tâm huyết và nhiệt tình.
      Học sinh của bạn hỏi: "${question.question_text}"
      Hãy trả lời bằng tiếng Việt, hướng dẫn chi tiết về ngữ pháp hoặc từ vựng nếu cần thiết.
      Cách nói chuyện gần gũi, xưng "Cô" và gọi học sinh là "Con" hoặc "Các em".
    `;
    
    const aiResponse = await generateWithRetry({
      contents: prompt,
      model: "gemini-3.5-flash",
      config: {
        maxOutputTokens: 800,
      }
    });
    
    const ai_answer = aiResponse.text;
    
    // Cập nhật vào DB
    const result = await db.query(`
      UPDATE student_questions
      SET ai_answer = $1, status = 'ai_answered', updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [ai_answer, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi AI trả lời câu hỏi:', error);
    res.status(500).json({ error: error.message || 'Lỗi máy chủ' });
  }
});

export default router;
