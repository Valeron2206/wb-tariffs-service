import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("tariffs", (table) => {
    table.increments("id").primary();
    table.date("date").notNullable();
    table.string("warehouse_name").notNullable();
    table.integer("warehouse_id").nullable();
    table.string("box_delivery_and_storage_expr");
    table.decimal("box_delivery_base", 10, 2);
    table.decimal("box_delivery_liter", 10, 2);
    table.decimal("box_storage_base", 10, 2);
    table.decimal("box_storage_liter", 10, 2);
    table.datetime("dt_next_box");
    table.datetime("dt_till_max");
    table.timestamps(true, true);

    // Уникальный индекс по дате и названию склада
    table.unique(
      ["date", "warehouse_name"],
      "tariffs_date_warehouse_name_unique"
    );
    table.index(["date"]);
    table.index(["warehouse_name"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("tariffs");
}
