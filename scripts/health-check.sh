#!/bin/bash

# Health check script для проверки состояния приложения

echo "🔍 Checking WB Tariffs Service health..."

# Проверка Docker контейнеров
echo "📦 Checking Docker containers..."
docker compose ps

# Проверка логов приложения
echo "📋 Latest application logs:"
docker compose logs --tail=10 app

# Проверка базы данных
echo "🗄️ Checking database connection..."
docker compose exec -T postgres pg_isready -U postgres
if [ $? -eq 0 ]; then
    echo "✅ Database is ready"
else
    echo "❌ Database is not ready"
    exit 1
fi

# Проверка количества записей в базе
echo "📊 Database statistics:"
docker compose exec -T postgres psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT date) as unique_dates,
    COUNT(DISTINCT warehouse_id) as unique_warehouses,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM tariffs;
"

# Проверка последних записей
echo "📅 Latest data by date:"
docker compose exec -T postgres psql -U postgres -d postgres -c "
SELECT date, COUNT(*) as records_count 
FROM tariffs 
GROUP BY date 
ORDER BY date DESC 
LIMIT 5;
"

echo "✅ Health check completed!"

/**
 * Проверка доступности API
 */
async healthCheck(): Promise<boolean> {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(`${this.baseUrl}${this.tariffEndpoint}`, {
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      params: {
        date: currentDate  // Добавляем параметр date
      },
      timeout: 10000,
    });

    return response.status === 200;
  } catch (error) {
    this.logger.error('WB API health check failed', error);
    return false;
  }
}