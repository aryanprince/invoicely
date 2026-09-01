import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EyeScannerIcon, FileDownloadIcon, ImageSparkleIcon, InboxArrowDownIcon } from "@/assets/icons";
import { EditInvoicePageSchema, type EditInvoiceType } from "@/zod-schemas/invoice/edit-invoice-page";
import { InvoiceDownloadManagerInstance } from "@/global/instances/invoice/invoice-download-manager";
import { ZodCreateInvoiceSchema } from "@/zod-schemas/invoice/create-invoice";
import { saveInvoiceToDatabase } from "@/lib/invoice/save-invoice";
import { editInvoice } from "@/lib/invoice/edit-invoice";
import InvoiceErrorsModal from "./invoice-errors-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useAnalytics } from "@/hooks/use-analytics";
import InvoiceTabSwitch from "./invoice-tab-switch";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { AnalyticsEventGroup } from "@/types";
import ImportInvoice from "./import-invoice";
import { useParams } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useTRPC } from "@/trpc/client";
import { AuthUser } from "@/types/auth";

type InvoiceOptionsProps = "view-pdf" | "download-pdf" | "download-png" | "save-invoice-to-database";
type Params = {
  type?: string;
  id?: string;
};

const InvoiceOptions = ({ form }: { form: UseFormReturn<ZodCreateInvoiceSchema> }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const params = useParams() satisfies Params;
  const user = useUser();
  const analytics = useAnalytics();

  const handleDropDownAction = async (action: InvoiceOptionsProps) => {
    const formValues = form.getValues();
    await InvoiceDownloadManagerInstance.initialize(formValues);

    const { data } = EditInvoicePageSchema.safeParse({
      type: params.type,
      id: params.id,
    });

    // track the action
    analytics.capture("download-invoice-action", {
      elementGroup: "create-invoice-page" satisfies AnalyticsEventGroup,
    });

    switch (action) {
      case "save-invoice-to-database":
        await SaveInvoiceToDatabase({ formValues, user, type: data?.type, id: data?.id });
        break;
      case "view-pdf":
        InvoiceDownloadManagerInstance.previewPdf();
        break;
      case "download-pdf":
        InvoiceDownloadManagerInstance.downloadPdf();
        await SaveInvoiceToDatabase({ formValues, user, type: data?.type, id: data?.id });
        break;
      case "download-png":
        InvoiceDownloadManagerInstance.downloadPng();
        await SaveInvoiceToDatabase({ formValues, user, type: data?.type, id: data?.id });
        break;
      default:
        break;
    }

    // Invalidate Queries
    queryClient.invalidateQueries({ queryKey: ["idb-invoices"] });
    queryClient.invalidateQueries({ queryKey: trpc.invoice.listLocal.queryKey() });
    if (user) queryClient.invalidateQueries({ queryKey: trpc.invoice.list.queryKey() });
  };

  return (
    <div className="flex h-12 shrink-0 flex-row items-center justify-between gap-2 border-b px-2">
      <div className="flex flex-row items-center gap-2">
        <InvoiceErrorsModal />
        <ImportInvoice form={form} />
      </div>
      <div className="flex flex-row items-center gap-2">
        <InvoiceTabSwitch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default">
              <InboxArrowDownIcon />
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDropDownAction("save-invoice-to-database")}>
              <InboxArrowDownIcon />
              <span>Save Invoice</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDropDownAction("view-pdf")}>
              <EyeScannerIcon />
              <span>View PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDropDownAction("download-pdf")}>
              <FileDownloadIcon />
              <span>Download PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDropDownAction("download-png")}>
              <ImageSparkleIcon />
              <span>Download PNG</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default InvoiceOptions;

const SaveInvoiceToDatabase = ({
  formValues,
  user,
  type,
  id,
}: {
  formValues: ZodCreateInvoiceSchema;
  user: AuthUser | undefined;
  type?: EditInvoiceType;
  id?: string;
}) => {
  if (id && type) {
    // Edit the old invoice
    return editInvoice(formValues, user, type, id);
  } else {
    return saveInvoiceToDatabase(formValues, user, type === "cli" ? undefined : type);
  }
};
