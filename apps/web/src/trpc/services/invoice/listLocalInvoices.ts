import { listLocalInvoiceRecords } from "@invoicely/db/local-invoices";
import { baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

const loopbackHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLoopbackHostname(hostname: string | null): boolean {
  return hostname !== null && loopbackHostnames.has(hostname);
}

function isLoopbackDatabase(): boolean {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) return false;

  try {
    return isLoopbackHostname(new URL(databaseUrl).hostname);
  } catch {
    return false;
  }
}

export const listLocalInvoices = baseProcedure.query(async ({ ctx }) => {
  if (!isLoopbackHostname(ctx.requestHostname) || !isLoopbackDatabase()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "CLI invoice records are only available from a loopback app connected to a loopback database.",
    });
  }

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
