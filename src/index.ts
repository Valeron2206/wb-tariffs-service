import "dotenv/config";
import fs from "fs";
import path from "path";
import { WBApiService } from "./services/WBApiService";
import { DatabaseService } from "./services/DatabaseService";
import { GoogleSheetsService } from "./services/GoogleSheetsService";
import { SchedulerService } from "./services/SchedulerService";
import { AppConfig } from "./types";
import { Logger } from "./services/Logger";

/**
 * Главный класс приложения
 */
class WBTariffsApp {
  private config!: AppConfig;
  private wbApiService!: WBApiService;
  private databaseService!: DatabaseService;
  private googleSheetsService!: GoogleSheetsService;
  private schedulerService!: SchedulerService;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("WBTariffsApp");
  }

  /**
   * Инициализация приложения
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info("Starting WB Tariffs Service initialization");

      // Загружаем конфигурацию
      this.loadConfig();

      // Инициализируем сервисы
      this.initializeServices();

      // Инициализируем базу данных
      await this.databaseService.initialize();

      this.logger.info("Application initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize application", error);
      throw error;
    }
  }

  /**
   * Загрузка конфигурации
   */
  private loadConfig(): void {
    try {
      const configPath = path.join(process.cwd(), "config", "config.json");

      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const configData = fs.readFileSync(configPath, "utf8");
      this.config = JSON.parse(configData);

      // Валидация обязательных полей
      this.validateConfig();

      this.logger.info("Configuration loaded successfully");
    } catch (error) {
      this.logger.error("Failed to load configuration", error);
      throw error;
    }
  }

  /**
   * Валидация конфигурации
   */
  private validateConfig(): void {
    if (!this.config.wb?.apiKey) {
      throw new Error("WB API key is required in configuration");
    }

    if (!this.config.database) {
      throw new Error("Database configuration is required");
    }

    if (!this.config.googleSheets || this.config.googleSheets.length === 0) {
      throw new Error("At least one Google Sheets configuration is required");
    }

    // Проверяем каждую конфигурацию Google Sheets
    for (const sheetConfig of this.config.googleSheets) {
      if (!sheetConfig.spreadsheetId) {
        throw new Error("Google Sheets spreadsheetId is required");
      }
      if (!sheetConfig.credentials) {
        throw new Error("Google Sheets credentials are required");
      }
    }

    this.logger.info("Configuration validation passed");
  }

  /**
   * Инициализация всех сервисов
   */
  private initializeServices(): void {
    this.wbApiService = new WBApiService(this.config.wb);
    this.databaseService = new DatabaseService(this.config.database);
    this.googleSheetsService = new GoogleSheetsService();

    this.schedulerService = new SchedulerService(
      this.wbApiService,
      this.databaseService,
      this.googleSheetsService,
      this.config
    );

    this.logger.info("Services initialized successfully");
  }

  /**
   * Запуск приложения
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      // Запускаем планировщик
      this.schedulerService.start();

      this.logger.info("WB Tariffs Service started successfully");
      this.logger.info("Application is running...");

      // Обработка сигналов для graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      this.logger.error("Failed to start application", error);
      process.exit(1);
    }
  }

  /**
   * Остановка приложения
   */
  async stop(): Promise<void> {
    try {
      this.logger.info("Stopping WB Tariffs Service...");

      // Останавливаем планировщик
      if (this.schedulerService) {
        this.schedulerService.stop();
      }

      // Закрываем соединение с базой данных
      if (this.databaseService) {
        await this.databaseService.close();
      }

      this.logger.info("WB Tariffs Service stopped successfully");
    } catch (error) {
      this.logger.error("Error during application shutdown", error);
    }
  }

  /**
   * Настройка graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const signals = ["SIGTERM", "SIGINT", "SIGUSR2"];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.stop();
        process.exit(0);
      });
    });

    // Обработка необработанных ошибок
    process.on("unhandledRejection", (reason, promise) => {
      this.logger.error("Unhandled Rejection at:", { promise, reason });
    });

    process.on("uncaughtException", (error) => {
      this.logger.error("Uncaught Exception:", error);
      process.exit(1);
    });
  }

  /**
   * Получение статуса приложения
   */
  getStatus(): any {
    if (!this.schedulerService) {
      return { status: "not_initialized" };
    }

    return {
      status: "running",
      scheduler: this.schedulerService.getStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Ручное выполнение задач (для отладки)
   */
  async runManualTasks(): Promise<void> {
    if (!this.schedulerService) {
      throw new Error("Application not initialized");
    }

    this.logger.info("Running manual tasks...");

    await this.schedulerService.runFetchTariffsManually();
    await this.schedulerService.runUpdateSheetsManually();

    this.logger.info("Manual tasks completed");
  }
}

// Создаем и запускаем приложение
const app = new WBTariffsApp();

// Проверяем аргументы командной строки для специальных команд
const args = process.argv.slice(2);

if (args.includes("--manual")) {
  // Ручной режим для тестирования
  app
    .initialize()
    .then(() => app.runManualTasks())
    .then(() => {
      console.log("Manual tasks completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Manual tasks failed:", error);
      process.exit(1);
    });
} else {
  // Обычный режим работы
  app.start().catch((error) => {
    console.error("Failed to start application:", error);
    process.exit(1);
  });
}

export { WBTariffsApp };
