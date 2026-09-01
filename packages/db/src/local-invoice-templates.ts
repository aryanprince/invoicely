import { incrementSerialNumber, namedInvoiceTemplateSchema, type NamedInvoiceTemplate } from "@invoicely/invoice-core";
import { localInvoiceTemplates } from "./schema/local-invoice-template";
import { assertLocalInvoiceDatabase } from "./local-database";
import { eq } from "drizzle-orm";
import { db } from "./index";

export interface ReservedInvoiceSerial {
  serialNumber: string;
  template: NamedInvoiceTemplate;
}

function parseTemplateRow(row: typeof localInvoiceTemplates.$inferSelect): NamedInvoiceTemplate {
  return namedInvoiceTemplateSchema.parse({
    schemaVersion: row.schemaVersion,
    name: row.name,
    nextSerialNumber: row.nextSerialNumber,
    data: row.data,
  });
}

export async function saveLocalInvoiceTemplate(template: NamedInvoiceTemplate): Promise<NamedInvoiceTemplate> {
  assertLocalInvoiceDatabase();
  const parsedTemplate = namedInvoiceTemplateSchema.parse(template);
  const [savedTemplate] = await db
    .insert(localInvoiceTemplates)
    .values({
      name: parsedTemplate.name,
      schemaVersion: parsedTemplate.schemaVersion,
      nextSerialNumber: parsedTemplate.nextSerialNumber,
      data: parsedTemplate.data,
    })
    .onConflictDoUpdate({
      target: localInvoiceTemplates.name,
      set: {
        schemaVersion: parsedTemplate.schemaVersion,
        nextSerialNumber: parsedTemplate.nextSerialNumber,
        data: parsedTemplate.data,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!savedTemplate) {
    throw new Error(`Failed to save invoice template "${parsedTemplate.name}"`);
  }

  return parseTemplateRow(savedTemplate);
}

export async function listLocalInvoiceTemplates(): Promise<NamedInvoiceTemplate[]> {
  assertLocalInvoiceDatabase();
  const templates = await db.select().from(localInvoiceTemplates).orderBy(localInvoiceTemplates.name);

  return templates.map(parseTemplateRow);
}

export async function getLocalInvoiceTemplate(name: string): Promise<NamedInvoiceTemplate | null> {
  assertLocalInvoiceDatabase();
  const [template] = await db.select().from(localInvoiceTemplates).where(eq(localInvoiceTemplates.name, name)).limit(1);

  return template ? parseTemplateRow(template) : null;
}

export async function deleteLocalInvoiceTemplate(name: string): Promise<boolean> {
  assertLocalInvoiceDatabase();
  const deletedTemplates = await db
    .delete(localInvoiceTemplates)
    .where(eq(localInvoiceTemplates.name, name))
    .returning({ name: localInvoiceTemplates.name });

  return deletedTemplates.length === 1;
}

export async function setLocalInvoiceTemplateSerial(
  name: string,
  nextSerialNumber: string,
): Promise<NamedInvoiceTemplate> {
  assertLocalInvoiceDatabase();
  const validatedSerial = namedInvoiceTemplateSchema.shape.nextSerialNumber.parse(nextSerialNumber);
  const [updatedTemplate] = await db
    .update(localInvoiceTemplates)
    .set({ nextSerialNumber: validatedSerial, updatedAt: new Date() })
    .where(eq(localInvoiceTemplates.name, name))
    .returning();

  if (!updatedTemplate) {
    throw new Error(`Invoice template "${name}" was not found`);
  }

  return parseTemplateRow(updatedTemplate);
}

export async function reserveLocalInvoiceTemplateSerial(name: string): Promise<ReservedInvoiceSerial> {
  assertLocalInvoiceDatabase();

  return db.transaction(async (transaction) => {
    const [template] = await transaction
      .select()
      .from(localInvoiceTemplates)
      .where(eq(localInvoiceTemplates.name, name))
      .for("update")
      .limit(1);

    if (!template) {
      throw new Error(`Invoice template "${name}" was not found`);
    }

    const serialNumber = template.nextSerialNumber;
    const nextSerialNumber = incrementSerialNumber(serialNumber);
    const [updatedTemplate] = await transaction
      .update(localInvoiceTemplates)
      .set({ nextSerialNumber, updatedAt: new Date() })
      .where(eq(localInvoiceTemplates.name, name))
      .returning();

    if (!updatedTemplate) {
      throw new Error(`Failed to reserve a serial number for invoice template "${name}"`);
    }

    return {
      serialNumber,
      template: parseTemplateRow(updatedTemplate),
    };
  });
}
