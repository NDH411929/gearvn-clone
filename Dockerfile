# Sử dụng Node.js phiên bản nhẹ
FROM node:18-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json vào container
COPY package*.json ./

# Cài đặt dependencies
RUN npm install --production

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Mở cổng cho ứng dụng
EXPOSE 3001

# Chạy ứng dụng
CMD ["npm", "start"]
