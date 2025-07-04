import winston from "winston";

/**
 * Сервис логирования
 */
export class Logger {
  private logger: winston.Logger;

  constructor(context: string) {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: context },
      transports: [
        new winston.transports.File({
          filename: "./logs/error.log",
          level: "error",
        }),
        new winston.transports.File({
          filename: "./logs/combined.log",
        }),
      ],
    });

    // Добавляем вывод в консоль для development
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: any): void {
    this.logger.error(message, {
      error: error?.message || error,
      stack: error?.stack,
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}
