FROM node:20-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Строим TypeScript проект
RUN npm run build

# Удаляем devDependencies после сборки для уменьшения размера
RUN npm ci --only=production && npm cache clean --force

# Создаем директории для логов и конфигов
RUN mkdir -p /app/logs /app/config

# Устанавливаем права
RUN chown -R node:node /app
USER node

# Экспонируем порт (если нужен)
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]