import { redirect } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/auth-actions";
import { ROLE_LABEL } from "@/lib/auth-types";
import { readDeployment, shortAddress } from "@/lib/chain";
import { navFor } from "@/lib/nav";

/**
 * The dashboard shell.
 *
 * A route group, so /console, /gate and /audit keep their URLs while sharing
 * this chrome. The middleware has already refused anyone who should not be
 * here; the redirect below is the second line, for the case where a session
 * expires between the middleware check and the render.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const deployment = readDeployment();

  return (
    /* The shell isolates so the backdrop has a stacking context to sit in.
       The band is the "page" variant: it announces the surface at the top and
       is gone before any table reaches it. A photograph running the full height
       of a console would be costume — docs/PRODUCT.md puts everything behind
       /login in the product register, where design serves the work. */
    <div className="relative isolate flex min-h-screen flex-col items-start md:flex-row">
      <SkyBackdrop variant="page" />

      <Sidebar
        groups={navFor(session.role)}
        who={session.displayName}
        roleLabel={ROLE_LABEL[session.role]}
        /* Was `chain 26125 · 0x9fE4…a6e0`, which told a stores officer nothing
           and told a guard less. What they need from this line is whether the
           thing is on; the identifiers stay in the tooltip for whoever is
           actually diagnosing something. */
        chainNote={deployment ? "Connected to the shared record" : "Not connected"}
        chainDetail={
          deployment
            ? `chain ${deployment.chainId} · ${shortAddress(deployment.contracts.AssetToken)}`
            : undefined
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end px-6 pb-2 pt-4 md:px-10">
          <SignOutButton />
        </header>
        <main className="min-w-0 flex-1 px-6 pb-24 pt-10 md:px-10">{children}</main>
      </div>
    </div>
  );
}
