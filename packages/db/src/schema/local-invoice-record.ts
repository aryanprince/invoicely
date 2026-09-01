import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const localInvoiceRecords = pgTable("local_invoice_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  schemaVersion: integer("schema_version").notNull().default(1),
  templateName: text("template_name").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  data: jsonb("data").$type<unknown>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
