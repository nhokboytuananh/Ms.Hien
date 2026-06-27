/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/scores
 * @desc Lấy danh sách điểm số của một bài tập (Chỉ dành cho Giáo viên)
 */
router.get('/scores', requireAuth, requireTeacher, async (req, res) => {
  const { assignment_id } = req.query;

  if (!assignment_id) {
    return res.status(400).json({ error: 'ID bài tập là bắt buộc.' });
  }

  try {
    // Truy vấn kết hợp lấy điểm số và họ tên học sinh
    const result = await db.query(
      'SELECT s.*, u.full_name as student_name, u.email as student_email FROM scores s JOIN users u ON s.student_id = u.id WHERE s.assignment_id = $1 ORDER BY u.full_name ASC',
      [Number(assignment_id)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy bảng điểm bài tập:', error);
    res.status(500).json({ error: 'Không thể lấy bảng điểm.' });
  }
});

/**
 * @route POST /api/scores
 * @desc Nhập hoặc cập nhật điểm số cho học sinh (Chỉ dành cho Giáo viên)
 */
router.post('/scores', requireAuth, requireTeacher, async (req, res) => {
  const { student_id, assignment_id, score, note } = req.body;

  if (!student_id || !assignment_id || score === undefined) {
    return res.status(400).json({ error: 'Thiếu thông tin học sinh, bài tập hoặc điểm số.' });
  }

  try {
    const gradedBy = req.user.id;

    // Thực hiện chèn hoặc cập nhật điểm số nếu học sinh đã có điểm cho bài tập này (UPSERT)
    const result = await db.query(
      'INSERT INTO scores (student_id, assignment_id, score, note, graded_by, graded_at) ' +
      'VALUES ($1, $2, $3, $4, $5, NOW()) ' +
      'RETURNING *',
      [Number(student_id), Number(assignment_id), Number(score), note || '', gradedBy]
    );

    res.status(201).json({
      message: 'Lưu điểm thành công!',
      score: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi lưu điểm số:', error);
    res.status(500).json({ error: 'Không thể nhập điểm cho học sinh.' });
  }
});

/**
 * @route GET /api/scores/my
 * @desc Lấy danh sách điểm số cá nhân của học sinh đang đăng nhập
 */
router.get('/scores/my', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Chức năng này chỉ dành cho học sinh.' });
    }

    const studentId = req.user.id;

    // Lấy toàn bộ danh sách điểm số kết hợp với tiêu đề bài tập
    const result = await db.query(
      'SELECT s.id as score_id, s.score, s.note, s.graded_at, a.title as assignment_title, a.skill, a.deadline, u.full_name as teacher_name ' +
      'FROM scores s ' +
      'JOIN assignments a ON s.assignment_id = a.id ' +
      'JOIN users u ON s.graded_by = u.id ' +
      'WHERE s.student_id = $1 ' +
      'ORDER BY s.graded_at DESC',
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy điểm học sinh:', error);
    res.status(500).json({ error: 'Không thể tải bảng điểm cá nhân.' });
  }
});

export default router;
