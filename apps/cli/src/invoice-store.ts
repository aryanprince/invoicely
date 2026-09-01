type InvoiceStore = typeof import("@invoicely/db/local-invoices");

export async function withInvoiceStore<Result>(operation: (store: InvoiceStore) => Promise<Result>): Promise<Result> {
  const store = await import("@invoicely/db/local-invoices");

  try {
    return await operation(store);
  } finally {
    const { sql } = await import("@invoicely/db");
    await sql.end();
  }
}
