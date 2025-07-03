import axios, { AxiosResponse } from "axios";
import { WBTariffResponse, WBWarehouse, TariffRecord } from "../types";
import { Logger } from "./Logger";

/**
 * Сервис для работы с WB API
 */
export class WBApiService {
  private apiKey: string;
  private baseUrl: string;
  private tariffEndpoint: string;
  private logger: Logger;

  constructor(config: any) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.tariffEndpoint = config.tariffEndpoint;
    this.logger = new Logger("WBApiService");
  }

  /**
   * Преобразует строку с запятой в число
   */
  private parseNumericValue(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      // Заменяем запятую на точку и преобразуем в число
      return parseFloat(value.replace(",", ".")) || 0;
    }
    return 0;
  }

  /**
   * Получение тарифов для коробов от WB API
   */
  async fetchTariffs(): Promise<TariffRecord[]> {
    try {
      this.logger.info("Fetching tariffs from WB API");

      // Добавляем текущую дату в формате YYYY-MM-DD
      const currentDate = new Date().toISOString().split("T")[0];

      const response: AxiosResponse<WBTariffResponse> = await axios.get(
        `${this.baseUrl}${this.tariffEndpoint}`,
        {
          headers: {
            Authorization: this.apiKey,
            "Content-Type": "application/json",
          },
          params: {
            date: currentDate, // Добавляем обязательный параметр date
          },
          timeout: 30000, // 30 секунд
        }
      );

      if (!response.data?.response?.data) {
        throw new Error("Invalid response format from WB API");
      }

      const { data } = response.data.response;

      const tariffs: TariffRecord[] = data.warehouseList.map(
        (warehouse: WBWarehouse) => ({
          date: currentDate,
          warehouse_id: warehouse.warehouseID,
          warehouse_name: warehouse.warehouseName,
          box_delivery_and_storage_expr: warehouse.boxDeliveryAndStorageExpr,
          box_delivery_base: this.parseNumericValue(warehouse.boxDeliveryBase),
          box_delivery_liter: this.parseNumericValue(
            warehouse.boxDeliveryLiter
          ),
          box_storage_base: this.parseNumericValue(warehouse.boxStorageBase),
          box_storage_liter: this.parseNumericValue(warehouse.boxStorageLiter),
          dt_next_box: data.dtNextBox,
          dt_till_max: data.dtTillMax,
        })
      );

      this.logger.info(
        `Successfully fetched ${tariffs.length} tariffs from WB API`
      );
      return tariffs;
    } catch (error) {
      this.logger.error("Failed to fetch tariffs from WB API", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          this.logger.error(
            `API Error: ${error.response.status} - ${error.response.statusText}`,
            {
              data: error.response.data,
              headers: error.response.headers,
            }
          );
        } else if (error.request) {
          this.logger.error("No response received from WB API", {
            request: error.request,
          });
        }
      }

      throw error;
    }
  }

  /**
   * Проверка доступности API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const currentDate = new Date().toISOString().split("T")[0];

      const response = await axios.get(
        `${this.baseUrl}${this.tariffEndpoint}`,
        {
          headers: {
            Authorization: this.apiKey,
            "Content-Type": "application/json",
          },
          params: {
            date: currentDate, // Добавляем параметр date и в healthCheck
          },
          timeout: 10000,
        }
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error("WB API health check failed", error);
      return false;
    }
  }
}
