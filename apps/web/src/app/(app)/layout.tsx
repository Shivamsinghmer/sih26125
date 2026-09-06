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
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        groups={navFor(session.role)}
        who={session.displayName}
        roleLabel={ROLE_LABEL[session.role]}
        chainNote={
          deployment
            ? `chain ${deployment.chainId} · ${shortAddress(deployment.contracts.AssetToken)}`
            : undefined
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-mist-gray px-6 py-4 md:px-10">
          <SignOutButton />
        </header>
        <main className="min-w-0 flex-1 px-6 pb-24 pt-10 md:px-10">{children}</main>
      </div>
    </div>
  );
}
