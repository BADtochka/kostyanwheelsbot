# 1. Этап сборки
FROM node:20-alpine AS builder
WORKDIR /app

# Устанавливаем pnpm
RUN npm install -g pnpm

# Копируем package.json и lockfile для кэширования зависимостей
COPY package.json ./

# Устанавливаем все зависимости (включая dev)
RUN pnpm install

# Копируем исходники
COPY . .

# Сборка проекта
RUN pnpm run build

# 2. Финальный образ
FROM node:20-alpine AS runner
WORKDIR /app

# Устанавливаем pnpm
RUN npm install -g pnpm

# Копируем только prod-зависимости
COPY package.json ./
RUN pnpm install --prod

# Копируем собранный код из builder
COPY --from=builder /app/dist ./dist

# Запуск приложения
CMD ["node", "dist/main.js"]
