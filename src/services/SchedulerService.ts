import * as cron from "node-cron";
import { WBApiService } from "./WBApiService";
import { DatabaseService } from "./DatabaseService";
import { GoogleSheetsService } from "./GoogleSheetsService";
import { AppConfig } from "../types";
import { Logger } from "./Logger";

/**
 * Сервис планировщика задач
 */
export class SchedulerService {
  private wbApiService: WBApiService;
  private databaseService: DatabaseService;
  private googleSheetsService: GoogleSheetsService;
  private config: AppConfig;
  private logger: Logger;
  private tasks: cron.ScheduledTask[] = [];

  constructor(
    wbApiService: WBApiService,
    databaseService: DatabaseService,
    googleSheetsService: GoogleSheetsService,
    config: AppConfig
  ) {
    this.wbApiService = wbApiService;
    this.databaseService = databaseService;
    this.googleSheetsService = googleSheetsService;
    this.config = config;
    this.logger = new Logger("SchedulerService");
  }

  /**
   * Запуск планировщика
   */
  start(): void {
    this.logger.info("Starting scheduler service");

    // Задача для получения тарифов (ежечасно)
    const fetchTariffsTask = cron.schedule(
      this.config.scheduler.fetchTariffs,
      async () => {
        await this.fetchAndSaveTariffs();
      },
      {
        scheduled: false,
        timezone: "Europe/Moscow",
      }
    );

    // Задача для обновления Google Sheets (ежедневно в 9:00)
    const updateSheetsTask = cron.schedule(
      this.config.scheduler.updateSheets,
      async () => {
        await this.updateGoogleSheets();
      },
      {
        scheduled: false,
        timezone: "Europe/Moscow",
      }
    );

    this.tasks.push(fetchTariffsTask, updateSheetsTask);

    // Запускаем задачи
    fetchTariffsTask.start();
    updateSheetsTask.start();

    this.logger.info("Scheduler tasks started successfully");
    this.logger.info(
      `Fetch tariffs schedule: ${this.config.scheduler.fetchTariffs}`
    );
    this.logger.info(
      `Update sheets schedule: ${this.config.scheduler.updateSheets}`
    );

    // Выполняем первоначальное получение данных
    this.runInitialFetch();
  }

  /**
   * Остановка планировщика
   */
  stop(): void {
    this.logger.info("Stopping scheduler service");

    this.tasks.forEach((task) => {
      task.stop();
    });

    this.tasks = [];
    this.logger.info("Scheduler stopped");
  }

  /**
   * Получение и сохранение тарифов
   */
  private async fetchAndSaveTariffs(): Promise<void> {
    try {
      this.logger.info("Starting tariffs fetch job");

      const tariffs = await this.wbApiService.fetchTariffs();

      if (tariffs.length === 0) {
        this.logger.warn("No tariffs received from WB API");
        return;
      }

      await this.databaseService.saveTariffs(tariffs);

      this.logger.info(`Successfully processed ${tariffs.length} tariffs`);
    } catch (error) {
      this.logger.error("Failed to fetch and save tariffs", error);
    }
  }

  /**
   * Обновление Google Sheets
   */
  private async updateGoogleSheets(): Promise<void> {
    try {
      this.logger.info("Starting Google Sheets update job");

      const latestTariffs = await this.databaseService.getLatestTariffs();

      if (latestTariffs.length === 0) {
        this.logger.warn(
          "No tariffs found in database for Google Sheets update"
        );
        return;
      }

      await this.googleSheetsService.updateSheets(
        this.config.googleSheets,
        latestTariffs
      );

      this.logger.info("Google Sheets updated successfully");
    } catch (error) {
      this.logger.error("Failed to update Google Sheets", error);
    }
  }

  /**
   * Первоначальное получение данных при запуске
   */
  private async runInitialFetch(): Promise<void> {
    this.logger.info("Running initial data fetch");

    try {
      // Проверяем здоровье API
      const isApiHealthy = await this.wbApiService.healthCheck();
      if (!isApiHealthy) {
        this.logger.error("WB API is not available, skipping initial fetch");
        return;
      }

      // Получаем статистику из базы
      const stats = await this.databaseService.getTariffsStats();
      this.logger.info("Database statistics", stats);

      // Если данных нет или они старые, выполняем загрузку
      if (!stats.total_records || this.shouldFetchFresh(stats.latest_date)) {
        await this.fetchAndSaveTariffs();
      }

      // Если есть данные, обновляем Google Sheets
      if (stats.total_records > 0) {
        await this.updateGoogleSheets();
      }
    } catch (error) {
      this.logger.error("Initial fetch failed", error);
    }
  }

  /**
   * Проверка, нужно ли получать свежие данные
   */
  private shouldFetchFresh(latestDate: string | null): boolean {
    if (!latestDate) return true;

    const today = new Date().toISOString().split("T")[0];
    return latestDate !== today;
  }

  /**
   * Ручной запуск задачи получения тарифов
   */
  async runFetchTariffsManually(): Promise<void> {
    this.logger.info("Manual tariffs fetch triggered");
    await this.fetchAndSaveTariffs();
  }

  /**
   * Ручной запуск задачи обновления Google Sheets
   */
  async runUpdateSheetsManually(): Promise<void> {
    this.logger.info("Manual Google Sheets update triggered");
    await this.updateGoogleSheets();
  }

  /**
   * Получение статуса планировщика
   */
  getStatus(): any {
    return {
      isRunning: this.tasks.length > 0,
      activeTasksCount: this.tasks.length,
      totalTasksCount: this.tasks.length,
      schedules: {
        fetchTariffs: this.config.scheduler.fetchTariffs,
        updateSheets: this.config.scheduler.updateSheets,
      },
    };
  }
}
