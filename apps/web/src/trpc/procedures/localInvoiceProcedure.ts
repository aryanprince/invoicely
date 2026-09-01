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

export const localInvoiceProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!isLoopbackHostname(ctx.requestHostname) || !isLoopbackDatabase()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "CLI invoice records are only available from a loopback app connected to a loopback database.",
    });
  }

  return next();
});
