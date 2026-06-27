/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Tải các biến môi trường từ file .env
dotenv.config();

// Tự động cập nhật mật khẩu 123456 trong local_db.json nếu có
const localDbPath = path.join(process.cwd(), 'db', 'local_db.json');
if (fs.existsSync(localDbPath)) {
  try {
    let content = fs.readFileSync(localDbPath, 'utf-8');
    if (content.includes('$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')) {
      content = content.replaceAll('$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee');
      fs.writeFileSync(localDbPath, content, 'utf-8');
      console.log('--- ĐÃ CẬP NHẬT MẬT KHẨU KHỞI TẠO LOCAL_DB THÀNH 123456 ---');
    }
  } catch (err) {
    console.error('Lỗi khi tự động di chuyển database:', err);
  }
}

// Import các router chức năng
import authRouter from './routes/auth.js';
import studentRouter from './routes/students.js';
import assignmentRouter from './routes/assignments.js';
import scoreRouter from './routes/scores.js';
import vocabularyRouter from './routes/vocabulary.js';
import examRouter from './routes/exams.js';
import aiRouter from './routes/ai.js';
import qnaRouter from './routes/qna.js';

// Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình các Middleware cơ bản
app.use(cors());
app.use(express.json()); // Phân tích nội dung JSON gửi lên trong body của request

// Cấu hình các API routes đầu tiên
app.use('/api/auth', authRouter);
app.use('/api', studentRouter);
app.use('/api', assignmentRouter);
app.use('/api', scoreRouter);
app.use('/api', vocabularyRouter);
app.use('/api', examRouter);
app.use('/api/ai', aiRouter);
app.use('/api/qna', qnaRouter);

// Cấu hình phục vụ thư mục static frontend (/public)
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Endpoint kiểm tra sức khỏe hệ thống (Health check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hệ thống English Ms.Hiền hoạt động bình thường.' });
});

// Điều hướng tất cả các route không khớp về trang đăng nhập chính
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Lắng nghe kết nối trên Port quy định (Mặc định: 3000)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(` SERVER ĐÃ KHỞI CHẠY THÀNH CÔNG!`);
    console.log(` Chạy tại địa chỉ: http://localhost:${PORT}`);
    console.log(` Môi trường: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });
}

export default app;
