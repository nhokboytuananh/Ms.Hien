# Sử dụng Node.js image mới nhất
FROM node:20-alpine

# Cài đặt thư mục làm việc
WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Chạy backend server
EXPOSE 3000
CMD ["npm", "start"]
