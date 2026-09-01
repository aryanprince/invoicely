import { localInvoiceProcedure } from "@/trpc/procedures/localInvoiceProcedure";
import { listLocalInvoiceRecords } from "@invoicely/db/local-invoices";

export const listLocalInvoices = localInvoiceProcedure.query(async () => {
  const records = await listLocalInvoiceRecords();

  return records.map((record) => ({
    id: record.id,
    type: "local" as const,
    origin: "cli" as const,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: "pending" as const,
    paidAt: null,
    invoiceFields: record.data,
  }));
});
