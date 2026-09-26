# ========================================================
# DOCKERFILE - TICKET BOOKING APPLICATION
# SINH VIÊN: NGUYỄN TUẤN ĐẠT - MSV: DTC245200452
# HỌC PHẦN: TRIỂN KHAI & QUẢN TRỊ HỆ THỐNG PHẦN MỀM K23
# ========================================================

# Bước 1: Base Image Node.js LTS siêu nhẹ
FROM node:20-alpine AS base

# Cài đặt curl/wget phục vụ healthcheck
RUN apk add --no-cache wget

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Bước 2: Dependencies Cache Layer
COPY package*.json ./
RUN npm ci --only=production

# Bước 3: Copy toàn bộ source code
COPY . .

# HARDENING BẢO MẬT: Chuyển quyền sở hữu cho user không đặc quyền 'node'
RUN chown -R node:node /usr/src/app

# Chạy container dưới quyền user 'node' (non-root)
USER node

# Khai báo cổng ứng dụng
EXPOSE 3000

# Healthcheck tự động theo dõi tình trạng container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Lệnh khởi chạy ứng dụng
CMD ["node", "src/server.js"]
