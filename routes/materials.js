/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/materials
 * @desc Lấy danh sách tài liệu tham khảo (Học sinh chỉ xem tài liệu được giao, Giáo viên xem tất cả)
 */
router.get('/materials', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM materials ORDER BY created_at DESC');
    let materials = result.rows;

    // Nếu người dùng là học sinh, lọc tài liệu được giao cho lớp/khối của họ
    if (req.user && req.user.role === 'student') {
      let studentGrade = null;
      if (req.user.class_name) {
        const match = req.user.class_name.match(/^(9|10|11|12)/);
        if (match) {
          studentGrade = match[1];
        } else if (/tự do|tu do/i.test(req.user.class_name)) {
          studentGrade = "0";
        }
      }

      materials = materials.filter(m => {
        if (m.status !== 'assigned') return false;
        
        if (m.assigned_groups) {
          try {
            const groups = typeof m.assigned_groups === 'string' ? JSON.parse(m.assigned_groups) : m.assigned_groups;
            if (groups.includes('all')) return true;
            if (studentGrade && groups.includes(studentGrade)) return true;
            return false;
          } catch (err) {
            return true;
          }
        }
        return true;
      });
    }

    res.json(materials);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tài liệu:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách tài liệu tham khảo.' });
  }
});

/**
 * @route POST /api/materials
 * @desc Thêm mới tài liệu tham khảo (Chỉ Giáo viên)
 */
router.post('/materials', requireAuth, requireTeacher, async (req, res) => {
  const { title, link } = req.body;

  if (!title || !link) {
    return res.status(400).json({ error: 'Tên tài liệu và link tải là bắt buộc.' });
  }

  try {
    const creatorId = req.user.id;
    const result = await db.query(
      'INSERT INTO materials (title, link, status, assigned_groups, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, link, 'draft', JSON.stringify([]), creatorId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi thêm mới tài liệu tham khảo:', error);
    res.status(500).json({ error: 'Không thể thêm tài liệu tham khảo.' });
  }
});

/**
 * @route PUT /api/materials/:id
 * @desc Cập nhật thông tin tài liệu tham khảo (Chỉ Giáo viên)
 */
router.put('/materials/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { title, link } = req.body;

  if (!title || !link) {
    return res.status(400).json({ error: 'Tên tài liệu và link tải là bắt buộc.' });
  }

  try {
    const result = await db.query(
      'UPDATE materials SET title = $1, link = $2 WHERE id = $3 RETURNING *',
      [title, link, Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài liệu tham khảo để cập nhật.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi cập nhật tài liệu tham khảo:', error);
    res.status(500).json({ error: 'Không thể cập nhật tài liệu tham khảo.' });
  }
});

/**
 * @route PUT /api/materials/:id/status
 * @desc Giao hoặc thu hồi tài liệu tham khảo cho lớp học (Chỉ Giáo viên)
 */
router.put('/materials/:id/status', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { status, assigned_groups } = req.body;

  if (!status || !assigned_groups || !Array.isArray(assigned_groups)) {
    return res.status(400).json({ error: 'Thiếu trạng thái giao hoặc danh sách lớp được chỉ định.' });
  }

  try {
    const result = await db.query(
      'UPDATE materials SET status = $1, assigned_groups = $2 WHERE id = $3 RETURNING *',
      [status, JSON.stringify(assigned_groups), Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài liệu tham khảo.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái giao tài liệu:', error);
    res.status(500).json({ error: 'Không thể giao/thu hồi tài liệu tham khảo.' });
  }
});

/**
 * @route DELETE /api/materials/:id
 * @desc Xóa tài liệu tham khảo (Chỉ Giáo viên)
 */
router.delete('/materials/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM materials WHERE id = $1', [Number(id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài liệu tham khảo để xóa.' });
    }

    res.json({ message: 'Đã xóa tài liệu tham khảo thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa tài liệu tham khảo:', error);
    res.status(500).json({ error: 'Không thể xóa tài liệu tham khảo.' });
  }
});

export default router;
