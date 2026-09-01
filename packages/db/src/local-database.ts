function assertLocalInvoiceDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const hostname = new URL(databaseUrl).hostname;
  const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const remoteStorageAllowed = process.env.INVOICELY_ALLOW_REMOTE_TEMPLATES === "true";

  if (!isLoopback && !remoteStorageAllowed) {
    throw new Error(
      "CLI invoice data is private-local by default. Set INVOICELY_ALLOW_REMOTE_TEMPLATES=true to use a non-loopback DATABASE_URL.",
    );
  }
}

export { assertLocalInvoiceDatabase };
