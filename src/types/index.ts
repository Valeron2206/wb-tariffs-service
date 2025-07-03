/**
 * Типы для работы с WB API и базой данных
 */

/**
 * Ответ от WB API для тарифов коробов
 */
export interface WBTariffResponse {
  response: {
    data: {
      dtNextBox: string;
      dtTillMax: string;
      warehouseList: WBWarehouse[];
    };
  };
}

/**
 * Информация о складе WB
 */
export interface WBWarehouse {
  warehouseID: number;
  warehouseName: string;
  boxDeliveryAndStorageExpr: string;
  boxDeliveryBase: number;
  boxDeliveryLiter: number;
  boxStorageBase: number;
  boxStorageLiter: number;
}

/**
 * Отдельный тариф WB 
 */
export interface WBTariff {
  warehouse_id: number;
  warehouse_name: string;
  box_delivery_and_storage_expr?: string;
  box_delivery_base: number;
  box_delivery_liter: number;
  box_storage_base: number;
  box_storage_liter: number;
  dt_next_box?: string;
  dt_till_max?: string;
}

/**
 * Тариф для сохранения в БД
 */
export interface TariffRecord {
  id?: number;
  date: string;
  warehouse_id: number;
  warehouse_name: string;
  box_delivery_and_storage_expr: string;
  box_delivery_base: number;
  box_delivery_liter: number;
  box_storage_base: number;
  box_storage_liter: number;
  dt_next_box: string;
  dt_till_max: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Конфигурация базы данных
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Конфигурация WB API
 */
export interface WBApiConfig {
  apiKey: string;
  baseUrl: string;
  tariffEndpoint: string;
}

/**
 * Конфигурация для Google Sheets
 */
export interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  credentials: {
    type: string;
    project_id: string;
    private_key_id?: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
  };
}

/**
 * Конфигурация планировщика
 */
export interface SchedulerConfig {
  fetchTariffs: string; // cron expression
  updateSheets: string; // cron expression
}

/**
 * Конфигурация приложения
 */
export interface AppConfig {
  wb: WBApiConfig;
  database: DatabaseConfig;
  googleSheets: GoogleSheetsConfig[];
  scheduler: SchedulerConfig;
}

/**
 * Данные для Google Sheets
 */
export interface SheetRow {
  warehouseName: string;
  warehouseId: number;
  boxDeliveryBase: number;
  boxDeliveryLiter: number;
  boxStorageBase: number;
  boxStorageLiter: number;
  coefficient: number;
  date: string;
}

/**
 * Данные для отправки в Google Sheets (альтернативный формат)
 */
export interface SheetData {
  warehouse_name: string;
  warehouse_id: number;
  box_delivery_base: number;
  box_delivery_liter: number;
  box_storage_base: number;
  box_storage_liter: number;
  coefficient: number;
  dt_next_box: string;
  dt_till_max: string;
  date: string;
}

/**
 * Статистика по тарифам
 */
export interface TariffStats {
  total_records: number;
  unique_dates: number;
  unique_warehouses: number;
  earliest_date: string;
  latest_date: string;
}

/**
 * Результат операции
 */
export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Параметры для получения тарифов
 */
export interface GetTariffsParams {
  date?: string;
  warehouseId?: number;
  sortBy?: "warehouse_name" | "box_delivery_base" | "date";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Логгер уровни
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Конфигурация логгера
 */
export interface LoggerConfig {
  level: LogLevel;
  file?: string;
  console?: boolean;
}
