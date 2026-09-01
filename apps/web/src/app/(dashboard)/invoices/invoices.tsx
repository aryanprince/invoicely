"use client";

import { Alert, AlertButtonGroup, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { columnConfig, columns } from "@/components/table-columns/invoices";
import { getAllInvoices } from "@/lib/indexdb-queries/invoice";
import { DataTable } from "@/components/ui/data-table";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/client-auth";
import { useTRPC } from "@/trpc/client";
import React from "react";

const InvoicesPage = () => {
  const trpc = useTRPC();
  const { data: session } = useSession();

  // Fetching Invoices from the Postgres (Server)
  const trpcData = useQuery({
    ...trpc.invoice.list.queryOptions(),
    enabled: !!session?.user, // Only fetch if user is logged in
  });

  // Fetching records created by the local CLI
  const localRecordData = useQuery(trpc.invoice.listLocal.queryOptions());

  // Fetching Invoices from the LocalDB
  const idbData = useQuery({
    queryKey: ["idb-invoices"],
    queryFn: getAllInvoices,
  });

  const isLoading = trpcData.isLoading || localRecordData.isLoading || idbData.isLoading;

  // Combine every store and avoid rendering the same record more than once.
  const data = Array.from(
    new Map(
      [...(trpcData.data ?? []), ...(localRecordData.data ?? []), ...(idbData.data ?? [])].map((invoice) => [
        invoice.id,
        invoice,
      ]),
    ).values(),
  );

  return (
    <div className="dash-page gap-4 p-4">
      {trpcData.isError && (
        <Alert variant="destructive">
          <AlertTitle>Server Fetch Failed!</AlertTitle>
          <AlertDescription>
            We were unable to fetch your invoices from the server. Please try again later.
          </AlertDescription>
          <AlertButtonGroup>
            <Button onClick={() => trpcData.refetch()} variant="destructive" size="xs">
              Retry
            </Button>
          </AlertButtonGroup>
        </Alert>
      )}
      {localRecordData.isError && (
        <Alert variant="destructive">
          <AlertTitle>Local CLI Fetch Failed!</AlertTitle>
          <AlertDescription>
            We were unable to fetch invoices created by the local CLI. Confirm the app is using the local database.
          </AlertDescription>
          <AlertButtonGroup>
            <Button onClick={() => localRecordData.refetch()} variant="destructive" size="xs">
              Retry
            </Button>
          </AlertButtonGroup>
        </Alert>
      )}
      <DataTable
        isLoading={isLoading}
        data={data}
        columns={columns}
        columnConfig={columnConfig}
        defaultSorting={[{ id: "createdAt", desc: true }]}
      />
    </div>
  );
};

export default InvoicesPage;
