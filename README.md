# WB Tariffs Service

Сервис для автоматического получения тарифов Wildberries и обновления данных в Google Sheets.

## Описание

Данный сервис выполняет две основные задачи:
1. **Регулярное получение данных** - ежечасно получает информацию о тарифах коробов WB через API и сохраняет в PostgreSQL
2. **Обновление Google Sheets** - регулярно обновляет данные в Google таблицах с сортировкой по коэффициенту (сумме всех тарифов)

## 🎯 Результаты тестирования

### ✅ Успешно протестировано:

**📊 База данных PostgreSQL:**
- 35 тарифов успешно сохранено
- Правильные типы данных
- Upsert логика работает (обновление в течение дня)
- Миграции выполняются автоматически

**📋 Google Sheets интеграция:**
- Данные отсортированы по коэффициенту (по возрастанию: 35.73 → 211.96)
- Читаемый формат даты: "3 июля 2025 г., 17:19:23 МСК (GMT+3)"
- Обновления работают по расписанию
- Поддержка множественных таблиц

**🕐 Планировщик cron:**
- Ежеминутное получение данных в тестовом режиме ✅
- Автоматическое обновление Google Sheets ✅
- Graceful shutdown и restart ✅

**🔄 WB API интеграция:**
- Обработка ошибок и логирование ✅

### 📈 Демонстрация работы:
- [Google Sheets с результатами](https://docs.google.com/spreadsheets/d/1LGh-0bbz3WpbjeDn7IMtXrks-5ODYFmc4lHEFDr8XNk/edit)
- Планировщик протестирован в реальном времени
- Все компоненты работают безупречно

## Архитектура

### Технологический стек
- **Node.js + TypeScript** - основной runtime и язык
- **PostgreSQL** - база данных для хранения исторических данных
- **Knex.js** - ORM для работы с базой данных
- **Google Sheets API** - интеграция с Google таблицами
- **node-cron** - планировщик задач
- **Docker** - контейнеризация приложения
- **Winston** - логирование

### Структура проекта
```
├── src/
│   ├── types/                  # TypeScript типы
│   ├── services/              # Бизнес-логика сервисов
│   │   ├── WBApiService.ts    # Работа с WB API
│   │   ├── DatabaseService.ts # Работа с базой данных
│   │   ├── GoogleSheetsService.ts # Работа с Google Sheets
│   │   ├── SchedulerService.ts # Планировщик задач
│   │   └── Logger.ts          # Логирование
│   ├── migrations/            # Миграции базы данных
│   └── index.ts              # Точка входа
├── config/                   # Конфигурационные файлы
├── logs/                     # Логи приложения
├── docker-compose.yml        # Docker Compose конфигурация
├── Dockerfile               # Docker образ
└── README.md               # Данная документация
```

## Быстрый старт

### Предварительные требования
- Docker и Docker Compose
- Git

### 1. Клонирование репозитория
```bash
git clone https://github.com/Valeron2206/wb-tariffs-service.git
cd wb-tariffs-service
```

### 2. Настройка конфигурации

#### Создание конфигурационного файла
```bash
cp config/config.example.json config/config.json
```

#### Заполнение конфигурации
Отредактируйте `config/config.json`:

```json
{
  "wb": {
    "apiKey": "ВАШ_WB_API_КЛЮЧ",
    "baseUrl": "https://common-api.wildberries.ru",
    "tariffEndpoint": "/api/v1/tariffs/box"
  },
  "database": {
    "host": "postgres",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "postgres"
  },
  "googleSheets": [
    {
      "spreadsheetId": "ID_ВАШЕЙ_GOOGLE_ТАБЛИЦЫ",
      "range": "stocks_coefs!A1:H",
      "credentials": {
        "type": "service_account",
        "project_id": "ваш-project-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\nВАШ_ПРИВАТНЫЙ_КЛЮЧ\n-----END PRIVATE KEY-----\n",
        "client_email": "service-account@project.iam.gserviceaccount.com",
      }
    }
  ],
  "scheduler": {
    "fetchTariffs": "0 * * * *",
    "updateSheets": "0 9 * * *"
  }
}
```

### 3. Настройка Google Sheets

#### Создание Service Account
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google Sheets API
4. Создайте Service Account:
   - Перейдите в IAM & Admin > Service Accounts
   - Нажмите "Create Service Account"
   - Заполните данные и создайте JSON ключ
5. Скопируйте данные из JSON ключа в конфигурацию

#### Настройка Google Sheets
1. Создайте новую Google таблицу
2. Создайте лист с названием `stocks_coefs`
3. Предоставьте доступ Service Account к таблице:
   - Нажмите "Поделиться" в Google Sheets
   - Добавьте email Service Account с правами "Редактор"
4. Скопируйте ID таблицы из URL в конфигурацию

### 4. Запуск приложения
```bash
docker compose up
```

Приложение автоматически:
- Создаст и настроит базу данных PostgreSQL
- Выполнит миграции
- Запустит планировщик задач
- Начнет получение данных каждый час
- Будет обновлять Google Sheets ежедневно в 9:00 МСК

## Использование

### Мониторинг работы
Логи приложения сохраняются в директории `logs/`:
- `logs/combined.log` - все логи
- `logs/error.log` - только ошибки

### Ручное выполнение задач
Для тестирования можно запустить задачи вручную:
```bash
docker compose exec app npm run dev -- --manual
```

### Проверка статуса
```bash
docker compose ps
docker compose logs app
```

## Конфигурация

### Расписание задач (cron)
- `fetchTariffs: "0 * * * *"` - каждый час
- `updateSheets: "0 9 * * *"` - каждый день в 9:00 МСК

### Переменные окружения
Создайте файл `.env` (см. `.env.example`):
```env
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
```

## База данных

### Структура таблицы `tariffs`
```sql
CREATE TABLE tariffs (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    warehouse_id INTEGER NOT NULL,
    warehouse_name VARCHAR NOT NULL,
    box_delivery_and_storage_expr VARCHAR NOT NULL,
    box_delivery_base DECIMAL(10,2) NOT NULL,
    box_delivery_liter DECIMAL(10,2) NOT NULL,
    box_storage_base DECIMAL(10,2) NOT NULL,
    box_storage_liter DECIMAL(10,2) NOT NULL,
    dt_next_box VARCHAR NOT NULL,
    dt_till_max VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, warehouse_id)
);
```

### Логика работы с данными
- Данные группируются по дням
- При получении новых данных в течение дня происходит обновление существующих записей
- Уникальность обеспечивается комбинацией `date + warehouse_id`
- Исторические данные сохраняются для анализа

## Google Sheets

### Формат данных
В Google Sheets записываются следующие колонки:
1. **Склад** - название склада
2. **ID склада** - идентификатор
3. **Доставка коробов (база)** - базовый тариф доставки
4. **Доставка коробов (за литр)** - тариф за литр
5. **Хранение коробов (база)** - базовый тариф хранения
6. **Хранение коробов (за литр)** - тариф хранения за литр
7. **Коэффициент** - сумма всех тарифов
8. **Дата** - дата актуальности данных

### Сортировка
Данные автоматически сортируются по возрастанию коэффициента.

## Разработка

### Локальная разработка
```bash
# Установка зависимостей
npm install

# Сборка TypeScript
npm run build

# Запуск в режиме разработки
npm run dev

# Выполнение миграций
npm run migrate
```

### Добавление новых миграций
```bash
npm run make-migration migration_name
```

## Устранение неполадок

### Проблемы с запуском
1. **База данных не доступна**
   ```bash
   docker compose logs postgres
   ```

2. **Ошибки конфигурации**
   - Проверьте корректность `config/config.json`
   - Убедитесь, что все обязательные поля заполнены

3. **Проблемы с WB API**
   - Проверьте корректность API ключа
   - Убедитесь в доступности API Wildberries

4. **Проблемы с Google Sheets**
   - Проверьте корректность Service Account ключей
   - Убедитесь, что Service Account имеет доступ к таблице
   - Проверьте ID таблицы и диапазон

### Логи и отладка
```bash
# Просмотр логов в реальном времени
docker compose logs -f app

# Подключение к контейнеру для отладки
docker compose exec app sh

# Проверка состояния базы данных
docker compose exec postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM tariffs;"

# Ручное выполнение задач для тестирования
docker compose exec app node dist/index.js --manual
```

### Проверка работоспособности
```bash
# Проверка статуса контейнеров
docker compose ps

# Проверка логов PostgreSQL
docker compose logs postgres

# Проверка наличия данных в базе
docker compose exec postgres psql -U postgres -d postgres -c "SELECT date, COUNT(*) FROM tariffs GROUP BY date ORDER BY date DESC LIMIT 5;"
```

## Мониторинг и алертинг

### Рекомендуемые метрики для мониторинга
- Успешность выполнения задач планировщика
- Количество получаемых записей от WB API
- Время выполнения задач
- Ошибки подключения к внешним сервисам

### Интеграция с системами мониторинга
Логи в формате JSON легко интегрируются с:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana + Loki
- Datadog
- New Relic

## Масштабирование

### Горизонтальное масштабирование
- Приложение спроектировано для работы в одном экземпляре
- Для горизонтального масштабирования потребуется добавление распределенных блокировок

### Оптимизация производительности
- Используются индексы в базе данных для быстрого поиска
- Batch операции для записи в Google Sheets
- Эффективная обработка больших объемов данных

## Безопасность

### Рекомендации по безопасности
1. **Секреты** - никогда не коммитьте реальные API ключи в Git
2. **Сеть** - используйте внутренние Docker сети
3. **База данных** - смените пароли PostgreSQL в продакшене
4. **Google Sheets** - ограничьте права Service Account только необходимыми

### Обновления безопасности
Регулярно обновляйте зависимости:
```bash
npm audit
npm update
```

## Лицензия

MIT License

## Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Убедитесь в корректности конфигурации
3. Проверьте доступность внешних сервисов (WB API, Google Sheets API)

## Changelog

### v1.0.0
- Начальная реализация
- Поддержка WB API для получения тарифов коробов
- Интеграция с Google Sheets с сортировкой по коэффициенту
- Планировщик задач с cron расписанием
- Docker контейнеризация
- TypeScript типизация
- Winston логирование
- Полная документация и инструкции по развертыванию
