import {
  buildInvoiceFromTemplate,
  createInvoiceJsonSchema,
  incrementSerialNumber,
  invoiceGenerationInputSchema,
  namedInvoiceTemplateSchema,
  type InvoiceGenerationInput,
  type ZodCreateInvoiceSchema,
} from "@invoicely/invoice-core";
import { localInvoiceTemplates } from "./schema/local-invoice-template";
import { localInvoiceRecords } from "./schema/local-invoice-record";
import { assertLocalInvoiceDatabase } from "./local-database";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "./index";

type LocalInvoiceStoreErrorCode = "LOCAL_INVOICE_EXISTS" | "LOCAL_INVOICE_NOT_FOUND" | "LOCAL_TEMPLATE_NOT_FOUND";

export class LocalInvoiceStoreError extends Error {
  public constructor(
    public readonly code: LocalInvoiceStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LocalInvoiceStoreError";
  }
}

export interface LocalInvoiceRecord {
  id: string;
  schemaVersion: 1;
  templateName: string;
  invoiceNumber: string;
  data: ZodCreateInvoiceSchema;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocalInvoiceRecordInput {
  templateName: string;
  input: InvoiceGenerationInput;
  serialNumber?: string;
}

function parseInvoiceRecord(row: typeof localInvoiceRecords.$inferSelect): LocalInvoiceRecord {
  if (row.schemaVersion !== 1) {
    throw new Error(`Unsupported local invoice record schema version: ${row.schemaVersion}`);
  }

  return {
    id: row.id,
    schemaVersion: 1,
    templateName: row.templateName,
    invoiceNumber: row.invoiceNumber,
    data: createInvoiceJsonSchema.parse(row.data),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createLocalInvoiceRecord(candidate: CreateLocalInvoiceRecordInput): Promise<LocalInvoiceRecord> {
  assertLocalInvoiceDatabase();
  const input = invoiceGenerationInputSchema.parse(candidate.input);
  const explicitSerial =
    candidate.serialNumber !== undefined
      ? namedInvoiceTemplateSchema.shape.nextSerialNumber.parse(candidate.serialNumber)
      : undefined;

  return db.transaction(async (transaction) => {
    const [templateRow] = await transaction
      .select()
      .from(localInvoiceTemplates)
      .where(eq(localInvoiceTemplates.name, candidate.templateName))
      .for("update")
      .limit(1);

    if (!templateRow) {
      throw new LocalInvoiceStoreError(
        "LOCAL_TEMPLATE_NOT_FOUND",
        `Invoice template "${candidate.templateName}" was not found`,
      );
    }

    const template = namedInvoiceTemplateSchema.parse({
      schemaVersion: templateRow.schemaVersion,
      name: templateRow.name,
      nextSerialNumber: templateRow.nextSerialNumber,
      data: templateRow.data,
    });
    const serialNumber = explicitSerial ?? template.nextSerialNumber;
    const invoice = buildInvoiceFromTemplate(template, { ...input, serialNumber });
    const invoiceNumber = `${invoice.invoiceDetails.prefix}${serialNumber}`;
    const [createdRecord] = await transaction
      .insert(localInvoiceRecords)
      .values({
        schemaVersion: 1,
        templateName: template.name,
        invoiceNumber,
        data: invoice,
      })
      .onConflictDoNothing({ target: localInvoiceRecords.invoiceNumber })
      .returning();

    if (!createdRecord) {
      throw new LocalInvoiceStoreError(
        "LOCAL_INVOICE_EXISTS",
        `Invoice "${invoiceNumber}" already exists. No duplicate was created.`,
      );
    }

    if (!explicitSerial) {
      await transaction
        .update(localInvoiceTemplates)
        .set({ nextSerialNumber: incrementSerialNumber(serialNumber), updatedAt: new Date() })
        .where(eq(localInvoiceTemplates.name, template.name));
    }

    return parseInvoiceRecord(createdRecord);
  });
}

export async function listLocalInvoiceRecords(): Promise<LocalInvoiceRecord[]> {
  assertLocalInvoiceDatabase();
  const records = await db
    .select()
    .from(localInvoiceRecords)
    .orderBy(desc(localInvoiceRecords.createdAt), asc(localInvoiceRecords.invoiceNumber));

  return records.map(parseInvoiceRecord);
}

export async function getLocalInvoiceRecord(identifier: string): Promise<LocalInvoiceRecord | null> {
  assertLocalInvoiceDatabase();
  const column = isUuid(identifier) ? localInvoiceRecords.id : localInvoiceRecords.invoiceNumber;
  const [record] = await db.select().from(localInvoiceRecords).where(eq(column, identifier)).limit(1);

  return record ? parseInvoiceRecord(record) : null;
}

export async function deleteLocalInvoiceRecord(identifier: string): Promise<boolean> {
  assertLocalInvoiceDatabase();
  const column = isUuid(identifier) ? localInvoiceRecords.id : localInvoiceRecords.invoiceNumber;
  const deletedRecords = await db
    .delete(localInvoiceRecords)
    .where(eq(column, identifier))
    .returning({ id: localInvoiceRecords.id });

  return deletedRecords.length === 1;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
