/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/assignments
 * @desc Lấy danh sách bài tập.
 * - Đối với giáo viên: trả về tất cả hoặc lọc theo class_id
 * - Đối với học sinh: chỉ trả về bài tập của lớp học sinh đó
 */
router.get('/assignments', requireAuth, async (req, res) => {
  const { class_id } = req.query;

  try {
    let result;

    if (req.user.role === 'teacher') {
      if (class_id) {
        // Lấy bài tập cho một lớp cụ thể
        result = await db.query(
          'SELECT * FROM assignments WHERE class_id = $1 ORDER BY created_at DESC',
          [Number(class_id)]
        );
      } else {
        // Lấy toàn bộ bài tập của giáo viên này
        result = await db.query(
          'SELECT * FROM assignments WHERE teacher_id = $1 ORDER BY created_at DESC',
          [req.user.id]
        );
      }
    } else {
      // Học sinh: chỉ xem bài tập thuộc lớp của mình
      // Đầu tiên, tìm class_id tương ứng với class_name của học sinh
      const classRes = await db.query('SELECT id FROM classes WHERE name = $1', [req.user.class_name]);
      if (classRes.rows.length === 0) {
        return res.json([]); // Chưa thuộc lớp nào hoạt động
      }
      
      const studentClassId = classRes.rows[0].id;
      result = await db.query(
        'SELECT * FROM assignments WHERE class_id = $1 AND status = \'open\' ORDER BY deadline ASC',
        [studentClassId]
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bài tập:', error);
    res.status(500).json({ error: 'Không thể tải danh sách bài tập.' });
  }
});

/**
 * @route POST /api/assignments
 * @desc Tạo bài tập mới (Chỉ dành cho Giáo viên)
 */
router.post('/assignments', requireAuth, requireTeacher, async (req, res) => {
  const { title, description, skill, class_id, deadline } = req.body;

  if (!title || !class_id) {
    return res.status(400).json({ error: 'Tiêu đề và lớp học nhận bài tập là bắt buộc.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO assignments (title, description, skill, class_id, teacher_id, deadline, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description || '', skill || 'Grammar', Number(class_id), req.user.id, deadline || null, 'open']
    );

    res.status(201).json({
      message: 'Giao bài tập mới thành công!',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi tạo bài tập:', error);
    res.status(500).json({ error: 'Không thể tạo bài tập mới.' });
  }
});

/**
 * @route PUT /api/assignments/:id
 * @desc Cập nhật bài tập (Chỉ dành cho Giáo viên)
 */
router.put('/assignments/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { title, description, skill, deadline, status } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Tiêu đề bài tập là bắt buộc.' });
  }

  try {
    const result = await db.query(
      'UPDATE assignments SET title = $1, description = $2, skill = $3, deadline = $4, status = $5 WHERE id = $6 RETURNING *',
      [title, description || '', skill || 'Grammar', deadline || null, status || 'open', Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bài tập không tồn tại hoặc bạn không có quyền sửa.' });
    }

    res.json({
      message: 'Cập nhật bài tập thành công!',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi sửa bài tập:', error);
    res.status(500).json({ error: 'Không thể cập nhật thông tin bài tập.' });
  }
});

/**
 * @route DELETE /api/assignments/:id
 * @desc Xóa bài tập (Chỉ dành cho Giáo viên)
 */
router.delete('/assignments/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    // Đầu tiên xóa toàn bộ điểm số liên quan đến bài tập này (để tránh lỗi khóa ngoại)
    await db.query('DELETE FROM scores WHERE assignment_id = $1', [Number(id)]);

    // Tiếp theo xóa bài tập
    const result = await db.query('DELETE FROM assignments WHERE id = $1', [Number(id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Bài tập không tồn tại.' });
    }

    res.json({ message: 'Đã xóa bài tập thành công!' });
  } catch (error) {
    console.error('Lỗi khi xóa bài tập:', error);
    res.status(500).json({ error: 'Không thể xóa bài tập.' });
  }
});

export default router;
