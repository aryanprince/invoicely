import { localInvoiceProcedure } from "@/trpc/procedures/localInvoiceProcedure";
import { getLocalInvoiceRecord } from "@invoicely/db/local-invoices";
import { ERROR_MESSAGES } from "@/constants/issues";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const getLocalInvoiceSchema = z.object({
  id: z.string().uuid(),
});

export const getLocalInvoice = localInvoiceProcedure.input(getLocalInvoiceSchema).query(async ({ input }) => {
  const record = await getLocalInvoiceRecord(input.id);

  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: ERROR_MESSAGES.INVOICE_NOT_FOUND });
  }

  return {
    id: record.id,
    type: "local" as const,
    origin: "cli" as const,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: "pending" as const,
    paidAt: null,
    invoiceFields: record.data,
  };
});
