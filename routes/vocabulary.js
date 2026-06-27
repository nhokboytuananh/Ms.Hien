/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import db from '../db/index.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/vocabulary
 * @desc Lấy danh sách từ vựng có lọc theo lớp (grade), bài học (unit), chủ đề (topic) hoặc tìm kiếm (q)
 */
router.get('/vocabulary', requireAuth, async (req, res) => {
  const { grade, unit, topic, q } = req.query;

  try {
    // 1. Lấy toàn bộ từ vựng từ database
    const result = await db.query('SELECT * FROM vocabulary ORDER BY word ASC');
    let words = result.rows;

    // 2. Thực hiện bộ lọc bằng Javascript trong bộ nhớ để đạt hiệu năng cao và đồng nhất cả môi trường Local & Postgres
    if (grade) {
      words = words.filter(w => w.grade === Number(grade));
    }
    
    if (unit) {
      words = words.filter(w => w.unit && w.unit.toLowerCase().includes(unit.toLowerCase()));
    }

    if (topic) {
      words = words.filter(w => w.topic && w.topic.toLowerCase().includes(topic.toLowerCase()));
    }

    if (q) {
      const searchStr = q.toLowerCase();
      words = words.filter(w => 
        w.word.toLowerCase().includes(searchStr) || 
        (w.meaning_vi && w.meaning_vi.toLowerCase().includes(searchStr))
      );
    }

    res.json(words);
  } catch (error) {
    console.error('Lỗi khi tải từ vựng:', error);
    res.status(500).json({ error: 'Không thể tải danh sách từ vựng.' });
  }
});

/**
 * @route POST /api/vocabulary
 * @desc Thêm từ vựng mới (Chỉ dành cho Giáo viên)
 */
router.post('/vocabulary', requireAuth, requireTeacher, async (req, res) => {
  const { word, ipa, word_type, meaning_vi, example, topic, grade, unit } = req.body;

  if (!word || !meaning_vi) {
    return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa tiếng Việt là bắt buộc.' });
  }

  try {
    const creatorId = req.user.id;
    const result = await db.query(
      'INSERT INTO vocabulary (word, ipa, word_type, meaning_vi, example, topic, grade, unit, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        word,
        ipa || '',
        word_type || 'n',
        meaning_vi,
        example || '',
        topic || 'Chung',
        grade ? Number(grade) : null,
        unit || null,
        creatorId
      ]
    );

    res.status(201).json({
      message: 'Thêm từ vựng thành công!',
      vocabulary: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi thêm từ vựng:', error);
    res.status(500).json({ error: 'Không thể thêm từ vựng mới.' });
  }
});

/**
 * @route PUT /api/vocabulary/:id
 * @desc Sửa đổi thông tin từ vựng (Chỉ dành cho Giáo viên)
 */
router.put('/vocabulary/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { word, ipa, word_type, meaning_vi, example, topic, grade, unit } = req.body;

  if (!word || !meaning_vi) {
    return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa tiếng Việt là bắt buộc.' });
  }

  try {
    const result = await db.query(
      'UPDATE vocabulary SET word = $1, ipa = $2, word_type = $3, meaning_vi = $4, example = $5, topic = $6, grade = $7, unit = $8 ' +
      'WHERE id = $9 RETURNING *',
      [
        word,
        ipa || '',
        word_type || 'n',
        meaning_vi,
        example || '',
        topic || 'Chung',
        grade ? Number(grade) : null,
        unit || null,
        Number(id)
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng yêu cầu sửa.' });
    }

    res.json({
      message: 'Cập nhật từ vựng thành công!',
      vocabulary: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật từ vựng:', error);
    res.status(500).json({ error: 'Không thể sửa đổi thông tin từ vựng.' });
  }
});

/**
 * @route DELETE /api/vocabulary/:id
 * @desc Xóa từ vựng khỏi hệ thống (Chỉ dành cho Giáo viên)
 */
router.delete('/vocabulary/:id', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM vocabulary WHERE id = $1', [Number(id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Từ vựng không tồn tại.' });
    }

    res.json({ message: 'Đã xóa từ vựng khỏi danh sách thành công!' });
  } catch (error) {
    console.error('Lỗi khi xóa từ vựng:', error);
    res.status(500).json({ error: 'Không thể xóa từ vựng.' });
  }
});

export default router;
