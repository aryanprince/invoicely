import type { LocalInvoiceRecord } from "@invoicely/db/local-invoices";
import { executeCli, type CliDependencies } from "../src/commands";
import { createInvoiceJsonSchema } from "@invoicely/invoice-core";
import { describe, expect, test } from "bun:test";
import type { CliIo } from "../src/io";
import { resolve } from "node:path";

const fixtureDirectory = resolve(import.meta.dir, "fixtures");

function createMemoryIo(): { io: CliIo; stderr: string[]; stdout: string[] } {
  const stderr: string[] = [];
  const stdout: string[] = [];

  return {
    io: {
      cwd: fixtureDirectory,
      stderr: (message) => stderr.push(message),
      stdout: (message) => stdout.push(message),
    },
    stderr,
    stdout,
  };
}

async function loadExampleInvoiceRecord(): Promise<LocalInvoiceRecord> {
  const invoice = createInvoiceJsonSchema.parse(
    await Bun.file(resolve(fixtureDirectory, "example-invoice.json")).json(),
  );
  const timestamp = new Date("2026-01-15T12:00:00.000Z");

  return {
    id: "afcf486a-30df-4a5d-8585-6320dd02d486",
    schemaVersion: 1,
    templateName: "example-studio",
    invoiceNumber: `${invoice.invoiceDetails.prefix}${invoice.invoiceDetails.serialNumber}`,
    data: invoice,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createFakeInvoiceStore(
  store: Record<string, (...args: never[]) => Promise<unknown>>,
): NonNullable<CliDependencies["withInvoiceStore"]> {
  return async (operation) => operation(store as never);
}

describe("validation commands", () => {
  test("validates a JSON invoice and reports Decimal-backed totals", async () => {
    const output = createMemoryIo();
    const exitCode = await executeCli(["validate", "invoice", "--file", "example-invoice.json", "--json"], output.io);

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.stdout[0] ?? "{}")).toMatchObject({
      invoice: { itemCount: 1, subtotal: "251.00", total: "276.10" },
      ok: true,
      valid: true,
    });
  });

  test("validates a synthetic named template", async () => {
    const output = createMemoryIo();
    const exitCode = await executeCli(["validate", "template", "--file", "example-template.json", "--json"], output.io);

    expect(exitCode).toBe(0);
    expect(output.stderr).toEqual([]);
    expect(JSON.parse(output.stdout[0] ?? "{}")).toMatchObject({
      ok: true,
      template: { name: "example-studio", nextSerialNumber: "0042" },
      valid: true,
    });
  });

  test("accepts ISO dates in agent-oriented generation input", async () => {
    const output = createMemoryIo();
    const exitCode = await executeCli(["validate", "input", "--file", "example-input.json", "--json"], output.io);

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.stdout[0] ?? "{}")).toMatchObject({
      input: { clientName: "Sample Customer", itemCount: 1 },
      ok: true,
      valid: true,
    });
  });

  test("returns structured validation failures and exit code 3", async () => {
    const output = createMemoryIo();
    const exitCode = await executeCli(["validate", "input", "--file", "invalid-input.json", "--json"], output.io);

    expect(exitCode).toBe(3);
    expect(output.stdout).toEqual([]);
    expect(JSON.parse(output.stderr[0] ?? "{}")).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
      ok: false,
    });
  });
});

test("returns a stable usage error for unknown commands", async () => {
  const output = createMemoryIo();
  const exitCode = await executeCli(["unknown", "--json"], output.io);

  expect(exitCode).toBe(2);
  expect(JSON.parse(output.stderr[0] ?? "{}")).toMatchObject({
    error: { code: "USAGE_ERROR" },
    ok: false,
  });
});

describe("invoice record commands", () => {
  test("creates a validated record with an explicit historical serial", async () => {
    const output = createMemoryIo();
    const record = await loadExampleInvoiceRecord();
    const received: unknown[] = [];
    const exitCode = await executeCli(
      [
        "record",
        "create",
        "--template",
        "example-studio",
        "--input",
        "example-input.json",
        "--serial",
        "0042",
        "--json",
      ],
      output.io,
      {
        withInvoiceStore: createFakeInvoiceStore({
          createLocalInvoiceRecord: async (...args: never[]) => {
            received.push(args[0]);
            return record;
          },
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ serialNumber: "0042", templateName: "example-studio" });
    expect(JSON.parse(output.stdout[0] ?? "{}")).toMatchObject({
      ok: true,
      record: {
        id: record.id,
        invoiceNumber: record.invoiceNumber,
        subtotal: "251.00",
        total: "276.10",
      },
    });
  });

  test("returns a stable conflict and creates no duplicate record", async () => {
    const output = createMemoryIo();
    const duplicateError = Object.assign(new Error('Invoice "INV-0042" already exists. No duplicate was created.'), {
      code: "LOCAL_INVOICE_EXISTS",
    });
    const exitCode = await executeCli(
      [
        "record",
        "create",
        "--template",
        "example-studio",
        "--input",
        "example-input.json",
        "--serial",
        "0042",
        "--json",
      ],
      output.io,
      {
        withInvoiceStore: createFakeInvoiceStore({
          createLocalInvoiceRecord: async () => {
            throw duplicateError;
          },
        }),
      },
    );

    expect(exitCode).toBe(5);
    expect(output.stdout).toEqual([]);
    expect(JSON.parse(output.stderr[0] ?? "{}")).toMatchObject({
      error: { code: "INVOICE_EXISTS" },
      ok: false,
    });
  });

  test("deletes exactly one record by invoice number", async () => {
    const output = createMemoryIo();
    const received: string[] = [];
    const exitCode = await executeCli(["record", "delete", "INV-0042", "--json"], output.io, {
      withInvoiceStore: createFakeInvoiceStore({
        deleteLocalInvoiceRecord: async (...args: never[]) => {
          received.push(String(args[0]));
          return true;
        },
      }),
    });

    expect(exitCode).toBe(0);
    expect(received).toEqual(["INV-0042"]);
    expect(JSON.parse(output.stdout[0] ?? "{}")).toEqual({
      deleted: true,
      identifier: "INV-0042",
      ok: true,
    });
  });
});
