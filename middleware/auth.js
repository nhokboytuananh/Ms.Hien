/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jwt from 'jsonwebtoken';

// Sử dụng JWT_SECRET từ môi trường hoặc chuỗi mặc định trong phát triển
const JWT_SECRET = process.env.JWT_SECRET || 'giao_vien_tieng_anh_ms_hien_bi_mat_123';

/**
 * Middleware xác thực người dùng bằng JWT
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện chức năng này.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Gắn thông tin người dùng vào request để các route sau có thể truy cập
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Lỗi xác thực JWT:', error);
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
  }
};

/**
 * Middleware kiểm tra quyền Giáo viên (Teacher only)
 */
export const requireTeacher = (req, res, next) => {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chức năng này chỉ dành cho Giáo viên.' });
  }
  next();
};
