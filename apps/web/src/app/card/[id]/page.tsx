import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { PrintButton } from "@/components/PrintButton";
import { didFromAddress } from "@sih26125/identity";
import { loadPeople, readDeployment, shortAddress } from "@/lib/chain";
import { loadPersona } from "@/lib/state";

export const dynamic = "force-dynamic";

/**
 * The printable ID card.
 *
 * Deliberately thin. The card carries exactly what the gate-check flow needs —
 * a photo for a human to compare against the person's face, and a QR encoding
 * the DID for a scanner to check on-chain status — and nothing else. No role
 * name is guaranteed correct the moment this is laminated: the QR is what stays
 * true, because it points at a live credential rather than printing today's
 * snapshot of one.
 */
export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deployment = readDeployment();

  if (!deployment) {
    return (
      <main className="mx-auto max-w-[640px] px-6 py-16">
        <p className="text-body leading-body">
          The shared record cannot be reached, so a card cannot be printed
          right now. Ask whoever looks after the system.
        </p>
      </main>
    );
  }

  const people = await loadPeople();
  const persona = people.find((p) => p.id === id);
  if (!persona) notFound();

  const state = await loadPersona(persona, deployment);
  const did = didFromAddress(persona.address, deployment.chainId);
  const qrDataUrl = await QRCode.toDataURL(did, { margin: 1, width: 240 });

  const validRole = state.holdings.find((h) => h.validity === "valid");

  return (
    <main className="mx-auto max-w-[900px] px-6 py-16 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/" className="text-body leading-body text-label hover:text-ink-black">
          ← Back
        </Link>
        <PrintButton />
      </div>

      {!state.registered ? (
        <div className="mt-10 rounded-3xl bg-blush-peach px-8 py-7 text-sienna-brown print:hidden">
          <p className="text-body-lg leading-body-lg">
            {persona.name} does not have a digital ID yet, so there is nothing
            to print. Add them on the People page first.
          </p>
        </div>
      ) : (
        <div className="mt-10 flex justify-center print:mt-0">
          <div className="id-card">
            <div className="id-card__top">
              <p className="id-card__org">BHARAT ELECTRONICS LIMITED</p>
              <p className="id-card__system">Asset &amp; Access Credential</p>
            </div>

            <div className="id-card__body">
              <div className="id-card__photo">
                {persona.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={persona.photo} alt="" />
                ) : (
                  <span>{persona.name.charAt(0)}</span>
                )}
              </div>

              <div className="id-card__details">
                <p className="id-card__name">{persona.name}</p>
                <p className="id-card__title">{persona.title}</p>
                <p className="id-card__role">
                  {validRole ? validRole.label.toUpperCase() : "NO CLEARANCE"}
                </p>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="id-card__qr" src={qrDataUrl} alt="Scan this to check the clearance" />
            </div>

            <div className="id-card__bottom">
              <span className="id-card__addr">{shortAddress(persona.address)}</span>
              <span>Scan the code — it is the check, not this printed line</span>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-8 max-w-[70ch] text-center print:hidden">
        <p className="text-caption leading-caption text-subtle">
          The clearance printed here is a convenience, not a guarantee — it can
          be taken away the moment after this is laminated. Scanning the code
          always gives the position right now, and that is the answer that
          counts. Never accept the printed line over the scan.
        </p>
        <p className="mt-4 text-caption leading-caption text-label">
          The code contains exactly this, and nothing else — no name, no photo,
          nothing that identifies anybody:
        </p>
        <p className="mono-addr mt-1 break-all text-label">{did}</p>
      </div>

      <style>{`
        .id-card {
          width: 337px;   /* 85.6mm at 96dpi(ish) x 2 for print legibility on screen */
          height: 212px;  /* CR80 ratio */
          background: var(--surface-canvas);
          border-radius: 14px;
          border: 1px solid var(--surface-card-mist);
          box-shadow: var(--shadow-subtle-2);
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sohne);
          color: var(--color-ink-black);
        }
        .id-card__top { line-height: 1.25; }
        .id-card__org {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.04em;
        }
        .id-card__system {
          font-size: 9px;
          color: var(--color-slate-gray);
        }
        .id-card__body {
          display: grid;
          grid-template-columns: 56px 1fr 64px;
          gap: 12px;
          align-items: center;
        }
        .id-card__photo {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          background: var(--color-mist-gray);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: var(--font-signifier);
          font-size: 22px;
          color: var(--color-slate-gray);
        }
        .id-card__photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .id-card__details { min-width: 0; }
        .id-card__name {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .id-card__title {
          font-size: 10px;
          color: var(--color-slate-gray);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .id-card__role {
          margin-top: 8px;
          display: inline-block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.03em;
          background: var(--color-ink-black);
          color: var(--color-paper-white);
          border-radius: 999px;
          padding: 3px 10px;
        }
        .id-card__qr {
          width: 64px;
          height: 64px;
        }
        .id-card__bottom {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 8px;
          color: var(--color-smoke-gray);
          gap: 8px;
        }
        .id-card__addr {
          font-family: ui-monospace, monospace;
          white-space: nowrap;
        }

        @media print {
          @page { size: 85.6mm 54mm; margin: 0; }
          body { background: #fff; }
          .id-card {
            width: 85.6mm;
            height: 54mm;
            box-shadow: none;
            border: none;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
