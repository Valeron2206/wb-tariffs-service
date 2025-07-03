import knex, { Knex } from "knex";
import { TariffRecord, WBTariff } from "../types";
import { Logger } from "./Logger";

/**
 * Сервис для работы с базой данных
 */
export class DatabaseService {
  private knex: Knex;
  private logger: Logger;

  constructor(config: any) {
    this.logger = new Logger("DatabaseService");
    this.knex = knex({
      client: "pg",
      connection: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
      },
      migrations: {
        directory: "./dist/migrations",
        extension: "js",
        loadExtensions: [".js"],
      },
    });
  }

  /**
   * Преобразует строку с запятой в число
   */
  private parseNumericValue(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      // Заменяем запятую на точку и преобразуем в число
      const normalized = value.replace(",", ".");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Валидация и преобразование даты
   */
  private parseDateTime(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === "") {
      return null;
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Инициализация базы данных
   */
  async initialize(): Promise<void> {
    try {
      await this.knex.migrate.latest();
      this.logger.info("Database initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize database", error);
      throw error;
    }
  }

  /**
   * Сохранение или обновление тарифов за день
   */
  async saveTariffs(tariffs: TariffRecord[]): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];

      for (const tariff of tariffs) {
        // Используем warehouse_id из API, если есть, иначе генерируем
        const warehouseId =
          tariff.warehouse_id ||
          this.generateWarehouseId(tariff.warehouse_name);

        await this.knex("tariffs")
          .insert({
            date: today,
            warehouse_id: warehouseId,
            warehouse_name: tariff.warehouse_name,
            box_delivery_and_storage_expr:
              tariff.box_delivery_and_storage_expr || null,
            box_delivery_base: this.parseNumericValue(tariff.box_delivery_base),
            box_delivery_liter: this.parseNumericValue(
              tariff.box_delivery_liter
            ),
            box_storage_base: this.parseNumericValue(tariff.box_storage_base),
            box_storage_liter: this.parseNumericValue(tariff.box_storage_liter),
            dt_next_box: this.parseDateTime(tariff.dt_next_box as string),
            dt_till_max: this.parseDateTime(tariff.dt_till_max as string),
          })
          .onConflict(["date", "warehouse_name"])
          .merge({
            warehouse_id: warehouseId,
            box_delivery_and_storage_expr:
              tariff.box_delivery_and_storage_expr || null,
            box_delivery_base: this.parseNumericValue(tariff.box_delivery_base),
            box_delivery_liter: this.parseNumericValue(
              tariff.box_delivery_liter
            ),
            box_storage_base: this.parseNumericValue(tariff.box_storage_base),
            box_storage_liter: this.parseNumericValue(tariff.box_storage_liter),
            dt_next_box: this.parseDateTime(tariff.dt_next_box as string),
            dt_till_max: this.parseDateTime(tariff.dt_till_max as string),
            updated_at: new Date(),
          });
      }

      this.logger.info(`Saved ${tariffs.length} tariffs for ${today}`);
    } catch (error) {
      this.logger.error("Error saving tariffs:", error);
      throw error;
    }
  }

  /**
   * Генерация warehouse_id на основе названия склада (fallback)
   */
  private generateWarehouseId(warehouseName: string): number {
    let hash = 0;
    for (let i = 0; i < warehouseName.length; i++) {
      const char = warehouseName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Получение актуальных тарифов (последние данные)
   */
  async getLatestTariffs(): Promise<TariffRecord[]> {
    try {
      const latestDate = await this.knex("tariffs")
        .max("date as max_date")
        .first();

      if (!latestDate?.max_date) {
        return [];
      }

      const tariffs = await this.knex("tariffs")
        .where("date", latestDate.max_date)
        .orderBy("warehouse_name");

      this.logger.info(
        `Retrieved ${tariffs.length} latest tariffs for date ${latestDate.max_date}`
      );
      return tariffs;
    } catch (error) {
      this.logger.error("Failed to get latest tariffs", error);
      throw error;
    }
  }

  /**
   * Получение тарифов за определенную дату
   */
  async getTariffsByDate(date: string): Promise<TariffRecord[]> {
    try {
      const tariffs = await this.knex("tariffs")
        .where("date", date)
        .orderBy("warehouse_name");

      this.logger.info(`Retrieved ${tariffs.length} tariffs for date ${date}`);
      return tariffs;
    } catch (error) {
      this.logger.error(`Failed to get tariffs for date ${date}`, error);
      throw error;
    }
  }

  /**
   * Получение тарифов отсортированных по коэффициенту для Google Sheets
   */
  async getTariffsForSheets(): Promise<TariffRecord[]> {
    try {
      const latestDate = await this.knex("tariffs")
        .max("date as max_date")
        .first();

      if (!latestDate?.max_date) {
        return [];
      }

      const tariffs = await this.knex("tariffs")
        .where("date", latestDate.max_date)
        .orderBy("box_delivery_base", "asc") // Сортировка по коэффициенту по возрастанию
        .orderBy("warehouse_name");

      this.logger.info(
        `Retrieved ${tariffs.length} tariffs for Google Sheets for date ${latestDate.max_date}`
      );
      return tariffs;
    } catch (error) {
      this.logger.error("Failed to get tariffs for Google Sheets", error);
      throw error;
    }
  }

  /**
   * Получение статистики по тарифам
   */
  async getTariffsStats(): Promise<any> {
    try {
      const stats = await this.knex("tariffs")
        .select(
          this.knex.raw("COUNT(*) as total_records"),
          this.knex.raw("COUNT(DISTINCT date) as unique_dates"),
          this.knex.raw("COUNT(DISTINCT warehouse_id) as unique_warehouses"),
          this.knex.raw("MIN(date) as earliest_date"),
          this.knex.raw("MAX(date) as latest_date")
        )
        .first();

      this.logger.info("Retrieved tariffs statistics");
      return stats;
    } catch (error) {
      this.logger.error("Failed to get tariffs statistics", error);
      throw error;
    }
  }

  /**
   * Проверка подключения к базе данных
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.knex.raw("SELECT 1");
      this.logger.info("Database connection is healthy");
      return true;
    } catch (error) {
      this.logger.error("Database connection failed", error);
      return false;
    }
  }

  /**
   * Закрытие соединения с базой данных
   */
  async close(): Promise<void> {
    await this.knex.destroy();
    this.logger.info("Database connection closed");
  }
}
