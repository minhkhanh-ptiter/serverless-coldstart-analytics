# === STAGE 1: Build Stage ===
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Chỉ copy file mô tả dependency để tận dụng Docker cache
COPY package*.json ./
RUN npm install --only=production

# === STAGE 2: Production Stage ===
FROM node:20-alpine
WORKDIR /usr/src/app

# Chỉ copy những phần cần thiết từ Stage 1
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

EXPOSE 8080
USER node

CMD ["npm", "start"]