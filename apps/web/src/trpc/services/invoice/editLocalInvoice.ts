import { localInvoiceProcedure } from "@/trpc/procedures/localInvoiceProcedure";
import { createInvoiceSchema } from "@/zod-schemas/invoice/create-invoice";
import { updateLocalInvoiceRecord } from "@invoicely/db/local-invoices";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants/issues";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const editLocalInvoiceSchema = z.object({
  id: z.string().uuid(),
  invoice: createInvoiceSchema,
});

export const editLocalInvoice = localInvoiceProcedure.input(editLocalInvoiceSchema).mutation(async ({ input }) => {
  const record = await updateLocalInvoiceRecord(input.id, input.invoice);

  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: ERROR_MESSAGES.INVOICE_NOT_FOUND });
  }

  return {
    success: true,
    message: SUCCESS_MESSAGES.INVOICE_EDITED,
  };
});
