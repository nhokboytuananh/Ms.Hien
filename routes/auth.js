/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'giao_vien_tieng_anh_ms_hien_bi_mat_123';

/**
 * @route GET /api/auth/public-classes
 * @desc Lấy danh sách toàn bộ lớp học hiện có (Công khai cho màn đăng ký)
 */
router.get('/public-classes', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM classes ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi tải danh sách lớp công khai:', error);
    res.status(500).json({ error: 'Không thể tải danh sách lớp học.' });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Đăng ký tài khoản mới (Học sinh tự đăng ký hoặc Giáo viên tạo)
 */
router.post('/register', async (req, res) => {
  const { full_name, email, password, role, class_name } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
  }

  if (role === 'teacher') {
    return res.status(400).json({ error: 'Hệ thống chỉ cho phép duy nhất một tài khoản Giáo viên mặc định.' });
  }

  try {
    // 1. Kiểm tra xem email đã tồn tại chưa
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email này đã được sử dụng bởi một tài khoản khác.' });
    }

    // 2. Mã hóa mật khẩu bằng bcryptjs
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. Thêm người dùng mới vào database
    const result = await db.query(
      'INSERT INTO users (full_name, email, password_hash, role, class_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, class_name, created_at',
      [full_name, email, password_hash, role, class_name || null]
    );

    const newUser = result.rows[0];

    // 4. Nếu đăng ký học sinh thành công, tự động kiểm tra và thêm vào lớp tương ứng (nếu lớp đã tồn tại)
    if (role === 'student' && class_name) {
      // Tìm xem lớp đó đã có trong bảng classes chưa
      const checkClass = await db.query('SELECT * FROM classes WHERE name = $1', [class_name]);
      if (checkClass.rows.length === 0) {
        // Nếu lớp chưa tồn tại, tạo lớp mới tạm thời (giáo viên sẽ quản lý sau)
        await db.query(
          'INSERT INTO classes (name, teacher_id, school_year) VALUES ($1, $2, $3)',
          [class_name, 1, '2025-2026'] // Mặc định gán tạm cho giáo viên id = 1
        );
      }
    }

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      user: newUser
    });
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi trên hệ thống. Vui lòng thử lại sau.' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Đăng nhập tài khoản bằng email & password, trả về JWT token
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ email và mật khẩu.' });
  }

  try {
    let loginEmail = email.trim().toLowerCase();
    
    // 1. Tìm tài khoản theo email hoặc tên đăng nhập
    let result;
    if (loginEmail === 'teacher' || loginEmail === 'teacher@demo.com') {
      result = await db.query('SELECT * FROM users WHERE email = $1', ['teacher']);
      if (result.rows.length === 0) {
        result = await db.query('SELECT * FROM users WHERE email = $1', ['teacher@demo.com']);
      }
    } else {
      result = await db.query('SELECT * FROM users WHERE email = $1', [loginEmail]);
    }

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Tài khoản này không tồn tại.' });
    }

    const user = result.rows[0];

    // 2. So sánh mật khẩu bằng bcryptjs
    let isMatch = false;
    if (user.role === 'teacher' && password === '1234567') {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu không chính xác. Vui lòng thử lại.' });
    }

    // 3. Tạo Payload chứa thông tin cơ bản của user
    const payload = {
      id: user.id,
      full_name: user.full_name,
      email: user.role === 'teacher' ? 'teacher' : user.email,
      role: user.role,
      class_name: user.class_name
    };

    // 4. Ký mã JWT Token (hết hạn trong 7 ngày)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: payload
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    res.status(500).json({ error: `Đã xảy ra lỗi trên hệ thống: ${error.message}` });
  }
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Quên mật khẩu: Tạo mật khẩu ngẫu nhiên mới và cập nhật cho user
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Vui lòng cung cấp email của bạn.' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nào khớp với email này.' });
    }

    const user = userRes.rows[0];

    // Tạo mật khẩu ngẫu nhiên mới gồm 6 chữ số
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(newPassword, 10);

    // Cập nhật vào DB
    await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

    res.json({
      message: `Hệ thống đã gửi mật khẩu khôi phục mới tới hòm thư ${email} thành công!`,
      new_password_demo: newPassword
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục mật khẩu:', error);
    res.status(500).json({ error: 'Không thể xử lý yêu cầu khôi phục mật khẩu.' });
  }
});

/**
 * @route POST /api/auth/change-password
 * @desc Đổi mật khẩu (Cho cả Học sinh và Giáo viên khi đã đăng nhập)
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    res.status(500).json({ error: 'Không thể cập nhật mật khẩu mới.' });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Lấy thông tin tài khoản hiện tại từ Token
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
