/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/classes
 * @desc Lấy danh sách toàn bộ các lớp học (Chỉ dành cho Giáo viên)
 */
router.get('/classes', requireAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.user.id;
    // Lấy toàn bộ lớp học mà giáo viên này đang dạy
    const result = await db.query(
      'SELECT * FROM classes WHERE teacher_id = $1 ORDER BY name ASC',
      [teacherId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách lớp:', error);
    res.status(500).json({ error: 'Không thể tải danh sách lớp học.' });
  }
});

/**
 * @route POST /api/classes
 * @desc Tạo một lớp học mới (Chỉ dành cho Giáo viên)
 */
router.post('/classes', requireAuth, requireTeacher, async (req, res) => {
  const { name, school_year } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Tên lớp học là bắt buộc.' });
  }

  try {
    const teacherId = req.user.id;
    
    // Kiểm tra trùng tên lớp học
    const checkDuplicate = await db.query('SELECT * FROM classes WHERE name = $1', [name]);
    if (checkDuplicate.rows.length > 0) {
      return res.status(400).json({ error: 'Lớp học này đã tồn tại.' });
    }

    const result = await db.query(
      'INSERT INTO classes (name, teacher_id, school_year) VALUES ($1, $2, $3) RETURNING *',
      [name, teacherId, school_year || '2025-2026']
    );

    res.status(201).json({
      message: 'Tạo lớp học mới thành công!',
      class: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi tạo lớp học:', error);
    res.status(500).json({ error: 'Không thể tạo lớp học mới.' });
  }
});

/**
 * @route DELETE /api/classes/:id
 * @desc Xóa lớp học và cập nhật học sinh thuộc lớp đó thành không thuộc lớp nào (Chỉ dành cho Giáo viên)
 */
router.delete('/classes/:id', requireAuth, requireTeacher, async (req, res) => {
  const classId = req.params.id;
  const teacherId = req.user.id;

  try {
    // 1. Kiểm tra lớp học xem có đúng là của giáo viên này không
    const classResult = await db.query(
      'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2',
      [classId, teacherId]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lớp học không tồn tại hoặc bạn không có quyền xóa lớp này.' });
    }

    const className = classResult.rows[0].name;

    // 2. Cập nhật học sinh thuộc lớp học này thành class_name = null (Giải phóng học sinh)
    await db.query(
      "UPDATE users SET class_name = NULL WHERE role = 'student' AND class_name = $1",
      [className]
    );

    // 3. Xóa lớp học khỏi bảng classes
    await db.query(
      'DELETE FROM classes WHERE id = $1',
      [classId]
    );

    res.json({
      message: `Đã xóa lớp học "${className}" thành công. Các học sinh cũ đã được chuyển trạng thái tự do.`
    });
  } catch (error) {
    console.error('Lỗi khi xóa lớp học:', error);
    res.status(500).json({ error: 'Không thể xóa lớp học này. Vui lòng thử lại sau.' });
  }
});

/**
 * @route GET /api/classes/:name/students
 * @desc Lấy danh sách học sinh thuộc một lớp học cụ thể theo tên lớp (ví dụ: '10A1')
 */
router.get('/classes/:name/students', requireAuth, async (req, res) => {
  const className = req.params.name;

  try {
    // Học sinh chỉ có thể xem danh sách lớp của chính mình. Giáo viên thì xem được bất kỳ lớp nào.
    if (req.user.role === 'student' && req.user.class_name !== className) {
      return res.status(403).json({ error: 'Bạn không có quyền xem học sinh của lớp này.' });
    }

    const result = await db.query(
      "SELECT id, full_name, email, class_name, created_at FROM users WHERE role = 'student' AND class_name = $1 ORDER BY full_name ASC",
      [className]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách học sinh của lớp:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách học sinh.' });
  }
});

/**
 * @route DELETE /api/students/:id
 * @desc Xóa tài khoản học sinh (Chỉ dành cho Giáo viên quản lý học sinh của họ)
 */
router.delete('/students/:id', requireAuth, requireTeacher, async (req, res) => {
  const studentId = Number(req.params.id);
  const teacherId = req.user.id;

  try {
    // 1. Kiểm tra tài khoản học sinh
    const studentRes = await db.query('SELECT * FROM users WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0 || studentRes.rows[0].role !== 'student') {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản học sinh này.' });
    }
    const student = studentRes.rows[0];

    // 2. Kiểm tra quyền của giáo viên đối với lớp của học sinh
    const classesRes = await db.query('SELECT * FROM classes WHERE teacher_id = $1', [teacherId]);
    const teacherClassNames = classesRes.rows.map(c => c.name);

    if (student.class_name && !teacherClassNames.includes(student.class_name)) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa học sinh này vì thuộc lớp của giáo viên khác.' });
    }

    // 3. Tiến hành xóa học sinh
    await db.query('DELETE FROM users WHERE id = $1', [studentId]);
    res.json({ message: `Đã xóa thành công tài khoản học sinh "${student.full_name}".` });
  } catch (error) {
    console.error('Lỗi khi xóa học sinh:', error);
    res.status(500).json({ error: 'Không thể xóa học sinh này.' });
  }
});

/**
 * @route PUT /api/students/:id/class
 * @desc Chuyển lớp học sinh (Chỉ dành cho Giáo viên)
 */
router.put('/students/:id/class', requireAuth, requireTeacher, async (req, res) => {
  const studentId = Number(req.params.id);
  const { class_name } = req.body;
  const teacherId = req.user.id;

  try {
    // 1. Kiểm tra tài khoản học sinh
    const studentRes = await db.query('SELECT * FROM users WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0 || studentRes.rows[0].role !== 'student') {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản học sinh này.' });
    }
    const student = studentRes.rows[0];

    // 2. Kiểm tra xem lớp học cũ và lớp học mới có nằm trong phạm vi quản lý của giáo viên không
    const classesRes = await db.query('SELECT * FROM classes WHERE teacher_id = $1', [teacherId]);
    const teacherClassNames = classesRes.rows.map(c => c.name);

    if (student.class_name && !teacherClassNames.includes(student.class_name)) {
      return res.status(403).json({ error: 'Bạn không có quyền quản lý học sinh thuộc lớp này.' });
    }

    if (class_name && !teacherClassNames.includes(class_name)) {
      return res.status(400).json({ error: 'Lớp mới phải là một lớp thuộc sự quản lý của bạn.' });
    }

    // 3. Cập nhật lớp học
    await db.query('UPDATE users SET class_name = $1 WHERE id = $2', [class_name || null, studentId]);
    res.json({ message: `Đã chuyển học sinh "${student.full_name}" sang lớp "${class_name || 'Tự do'}" thành công.` });
  } catch (error) {
    console.error('Lỗi khi chuyển lớp cho học sinh:', error);
    res.status(500).json({ error: 'Không thể chuyển lớp cho học sinh.' });
  }
});

export default router;
