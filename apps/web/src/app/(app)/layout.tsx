import { redirect } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
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
    /* No sky here. The console is the product register: a working surface read
       across rather than looked at, and every gain in the sky's visibility came
       straight out of the contrast budget of the small grey labels all over it.
       The brand surfaces keep it; this one is paper. */
    <div className="flex min-h-screen flex-col items-start md:flex-row">

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
        footerAction={<SignOutButton />}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Capped: tables and ranked lists stop being scannable past ~1280px,
            and on a wide monitor the eye would otherwise cross a metre of
            whitespace to get from a label to its value. */}
        <main className="w-full max-w-[1280px] min-w-0 flex-1 px-6 pt-12 pb-24 md:px-12">{children}</main>
      </div>
    </div>
  );
}
