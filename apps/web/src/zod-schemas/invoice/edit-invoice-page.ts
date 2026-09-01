import { invoiceTypeEnum } from "@invoicely/db/schema/invoice";
import { z } from "zod";

export const EditInvoiceTypeSchema = z.enum([...invoiceTypeEnum.enumValues, "cli"]);

export const EditInvoicePageSchema = z.object({
  type: EditInvoiceTypeSchema,
  id: z.string().uuid(),
});

export type EditInvoiceType = z.infer<typeof EditInvoiceTypeSchema>;
