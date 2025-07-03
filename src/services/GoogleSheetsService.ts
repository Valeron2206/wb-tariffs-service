import { google } from "googleapis";
import { GoogleSheetsConfig, TariffRecord, SheetRow } from "../types";
import { Logger } from "./Logger";

/**
 * Сервис для работы с Google Sheets
 */
export class GoogleSheetsService {
  private sheets: any;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("GoogleSheetsService");
  }

  /**
   * Инициализация Google Sheets API
   */
  private async initializeAuth(credentials: any) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({ version: "v4", auth });
  }

  /**
   * Обновление данных в Google Sheets
   */
  async updateSheets(
    configs: GoogleSheetsConfig[],
    tariffs: TariffRecord[]
  ): Promise<void> {
    if (!tariffs.length) {
      this.logger.warn("No tariffs to update in Google Sheets");
      return;
    }

    // Подготавливаем данные для Google Sheets
    const sheetData = this.prepareSheetData(tariffs);

    // Обновляем каждую таблицу
    for (const config of configs) {
      try {
        await this.updateSingleSheet(config, sheetData);
        this.logger.info(
          `Successfully updated Google Sheet: ${config.spreadsheetId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to update Google Sheet: ${config.spreadsheetId}`,
          error
        );
      }
    }
  }

  /**
   * Обновление одной Google Sheets таблицы
   */
  private async updateSingleSheet(
    config: GoogleSheetsConfig,
    data: SheetRow[]
  ): Promise<void> {
    try {
      const sheets = await this.initializeAuth(config.credentials);

      // Подготавливаем данные в формате для Google Sheets
      const values = [
        // Заголовки
        [
          "Склад",
          "ID склада",
          "Доставка коробов (база)",
          "Доставка коробов (за литр)",
          "Хранение коробов (база)",
          "Хранение коробов (за литр)",
          "Коэффициент",
          "Дата",
        ],
        // Данные
        ...data.map((row) => [
          row.warehouseName,
          row.warehouseId,
          row.boxDeliveryBase,
          row.boxDeliveryLiter,
          row.boxStorageBase,
          row.boxStorageLiter,
          row.coefficient,
          row.date,
        ]),
      ];

      // Очищаем существующие данные и записываем новые
      await sheets.spreadsheets.values.clear({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });
    } catch (error) {
      this.logger.error("Failed to update single sheet", error);
      throw error;
    }
  }

  /**
   * Подготовка данных для Google Sheets с сортировкой по коэффициенту
   */
  private prepareSheetData(tariffs: TariffRecord[]): SheetRow[] {
    console.log("Preparing sheet data for", tariffs.length, "tariffs");

    const sheetData: SheetRow[] = tariffs.map((tariff) => {
      // Явное преобразование в числа и сложение
      const base = parseFloat(String(tariff.box_delivery_base)) || 0;
      const liter = parseFloat(String(tariff.box_delivery_liter)) || 0;
      const storageBase = parseFloat(String(tariff.box_storage_base)) || 0;
      const storageLiter = parseFloat(String(tariff.box_storage_liter)) || 0;

      const coefficient = base + liter + storageBase + storageLiter;

      // Создаем красивую дату в московском времени
      const moscowDate = new Date();
      const moscowTime = new Date(moscowDate.getTime() + 3 * 60 * 60 * 1000); // +3 часа к UTC

      const formatDateRussian = (date: Date): string => {
        const months = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");

        return `${day} ${month} ${year} г., ${hours}:${minutes}:${seconds} МСК (GMT+3)`;
      };

      console.log(
        "Warehouse:",
        tariff.warehouse_name,
        "Coefficient:",
        coefficient
      );

      return {
        warehouseName: tariff.warehouse_name,
        warehouseId: tariff.warehouse_id,
        boxDeliveryBase: base,
        boxDeliveryLiter: liter,
        boxStorageBase: storageBase,
        boxStorageLiter: storageLiter,
        coefficient: Math.round(coefficient * 100) / 100,
        date: formatDateRussian(moscowTime),
      };
    });

    // Сортируем по возрастанию коэффициента
    const sorted = sheetData.sort((a, b) => a.coefficient - b.coefficient);
    console.log(
      "First 3 after sorting:",
      sorted
        .slice(0, 3)
        .map((s) => ({ name: s.warehouseName, coef: s.coefficient }))
    );

    return sorted;
  }

  /**
   * Проверка доступности Google Sheets API
   */
  async healthCheck(config: GoogleSheetsConfig): Promise<boolean> {
    try {
      const sheets = await this.initializeAuth(config.credentials);

      const response = await sheets.spreadsheets.get({
        spreadsheetId: config.spreadsheetId,
      });

      return !!response.data;
    } catch (error) {
      this.logger.error("Google Sheets health check failed", error);
      return false;
    }
  }
}
