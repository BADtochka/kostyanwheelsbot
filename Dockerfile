# 1. Базовый образ с Bun
FROM oven/bun:1 as base
WORKDIR /app

# 2. Установка зависимостей
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 3. Копируем весь проект
COPY . .

# 4. Сборка NestJS (если используешь ts->js билд)
# Если хочешь запускать прямо на TS — можно пропустить этот шаг
RUN bun run build

# 5. Запуск приложения
# Если у тебя билд в dist — указывай dist/main.js
# Если без билда — можно bun run start:dev
CMD ["bun", "run", "start:prod"]
