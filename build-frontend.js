import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Lấy BACKEND_URL từ biến môi trường của Vercel
const backendUrl = process.env.BACKEND_URL;

if (backendUrl) {
  // Thay thế const API_BASE = ''; thành const API_BASE = 'https://...';
  appJs = appJs.replace(/const API_BASE = '';/, `const API_BASE = '${backendUrl}';`);
  fs.writeFileSync(appJsPath, appJs);
  console.log(`[Build] Đã cập nhật API_BASE thành: ${backendUrl}`);
} else {
  console.error(`[Build Lỗi] Không tìm thấy biến môi trường BACKEND_URL! Vui lòng thêm BACKEND_URL vào Vercel Environment Variables và Redeploy.`);
  process.exit(1);
}
