import { updateInvoiceStatus } from "./updateInvoiceStatus";
import { listLocalInvoices } from "./listLocalInvoices";
import { editLocalInvoice } from "./editLocalInvoice";
import { getLocalInvoice } from "./getLocalInvoice";
import { insertInvoice } from "./insertInvoice";
import { deleteInvoice } from "./deleteInvoice";
import { createTRPCRouter } from "@/trpc/init";
import { listInvoices } from "./listInvoices";
import { migrateToDb } from "./migrateToDb";
import { editInvoice } from "./editInvoice";
import { getInvoice } from "./getInvoice";

export const invoiceRouter = createTRPCRouter({
  list: listInvoices,
  listLocal: listLocalInvoices,
  getLocal: getLocalInvoice,
  editLocal: editLocalInvoice,
  insert: insertInvoice,
  updateStatus: updateInvoiceStatus,
  delete: deleteInvoice,
  get: getInvoice,
  edit: editInvoice,
  migrateToDb: migrateToDb,
});
