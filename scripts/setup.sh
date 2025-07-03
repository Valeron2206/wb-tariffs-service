#!/bin/bash

# Setup script для первоначальной настройки проекта

echo "🚀 Setting up WB Tariffs Service..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Создание необходимых директорий
echo "📁 Creating directories..."
mkdir -p config logs

# Копирование примера конфигурации
if [ ! -f "config/config.json" ]; then
    echo "📄 Creating configuration file..."
    cp config/config.example.json config/config.json
    echo "⚠️  Please edit config/config.json with your actual credentials"
else
    echo "✅ Configuration file already exists"
fi

# Создание .env файла
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Установка зависимостей (если Node.js доступен локально)
if command -v npm &> /dev/null; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "⚠️  Node.js not found locally. Dependencies will be installed in Docker container."
fi

echo "🔧 Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit config/config.json with your WB API key and Google Sheets credentials"
echo "2. Run: docker compose up"
echo "3. Check logs: docker compose logs -f app"
echo "4. Health check: ./scripts/health-check.sh"