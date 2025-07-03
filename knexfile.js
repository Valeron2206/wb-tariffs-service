require("dotenv").config();

const config = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    },
    migrations: {
      directory: "./dist/migrations",
      extension: "js",
      loadExtensions: [".js"], // Добавляем это
    },
    seeds: {
      directory: "./dist/seeds",
    },
  },
  production: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "postgres",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    },
    migrations: {
      directory: "./dist/migrations",
      extension: "js",
      loadExtensions: [".js"], // Добавляем это
    },
    seeds: {
      directory: "./dist/seeds",
    },
  },
};

module.exports = config;
