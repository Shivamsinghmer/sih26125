/**
 * Product mockups — the real surfaces, drawn rather than screenshotted.
 *
 * These are built in the same tokens the actual app uses, so they stay sharp at
 * any size, respond to layout, and cannot go stale the way a PNG does. They
 * depict what the system genuinely shows: the dashboard's real figures, the
 * gate's two possible answers, the audit trail's real event sentences, and the
 * ID card as it actually prints.
 *
 * Deliberately Steep, not the surrounding section's marketing chrome. A product
 * shot that does not look like the product is worse than no product shot.
 */

const frame =
  "rounded-2xl border border-[#e7e7ea] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_44px_-12px_rgba(23,25,28,0.18)] overflow-hidden";

function Chrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#f0f0f2] px-4 py-2.5">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-[#e2e2e6]" />
        <span className="h-2 w-2 rounded-full bg-[#e2e2e6]" />
        <span className="h-2 w-2 rounded-full bg-[#e2e2e6]" />
      </span>
      <span className="ml-1 font-mono text-[10px] tracking-tight text-[#616675]">{label}</span>
    </div>
  );
}

/** The issuing authority's dashboard: what the chain currently holds. */
export function DashboardMockup() {
  const stats = [
    { label: "People", value: "4", hint: "3 credentialled" },
    { label: "Assets", value: "2", hint: "bound to a DID" },
    { label: "Revoked", value: "1", hint: "still in the trail" },
    { label: "Events", value: "39", hint: "replayable" },
  ];

  return (
    <div className={frame}>
      <Chrome label="console — dashboard" />
      <div className="p-5">
        <p className="font-serif text-[19px] leading-tight text-[#17191c]">Dashboard</p>
        <p className="mt-1 text-[11px] text-[#616675]">Read from contract state, not a cache.</p>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-[#f2f2f3] px-3 py-3">
              <p className="text-[10px] text-[#616675]">{s.label}</p>
              <p className="font-serif text-[22px] leading-none text-[#17191c]">{s.value}</p>
              <p className="mt-1.5 text-[9px] leading-tight text-[#616675]">{s.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 border-b border-[#f0f0f2] pb-2 text-[10px] text-[#616675]">
            <span>Asset</span>
            <span>Held by</span>
            <span>Requires</span>
          </div>
          {[
            ["#1", "Priya Menon", "Manager"],
            ["#2", "K. Iyer", "Auditor"],
          ].map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#f7f7f8] py-2.5 text-[11px] text-[#17191c]"
            >
              <span className="tabular-nums text-[#616675]">{row[0]}</span>
              <span>{row[1]}</span>
              <span className="rounded-full bg-[#17191c] px-2 py-0.5 text-[9px] text-white">
                {row[2]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The gate: one question, two possible answers. */
export function GateMockup() {
  return (
    <div className={frame}>
      <Chrome label="gate — check" />
      <div className="p-5">
        <p className="font-serif text-[19px] leading-tight text-[#17191c]">Gate check</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-[#17191c] px-3 py-1.5 text-[10px] text-white">
            Scan with camera
          </span>
          <span className="flex-1 rounded-lg border border-[#e7e7ea] px-2.5 py-1.5 font-mono text-[9px] text-[#6f7482]">
            did:ethr:0x7a69:0x7099…
          </span>
        </div>

        {/* Both outcomes, because the refusal is the one that matters. */}
        <div className="mt-4 rounded-xl border border-[#e7e7ea] p-3.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] text-[#17191c]">Priya Menon</p>
            <span className="rounded-full bg-[#17191c] px-2 py-0.5 text-[9px] text-white">
              Manager · valid
            </span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#616675]">
            Credential valid until 6 Oct 2026. Holds asset #1.
          </p>
        </div>

        <div className="mt-2.5 rounded-xl bg-[#fbe1d1] p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12px] text-[#5d2a1a]">Rahul Nair</p>
            <span className="font-mono text-[8px] text-[#7a4230]">RoleNeverGranted</span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#5d2a1a]">
            No Manager credential. Not permitted to carry asset #1 out.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The auditor's replay, in the system's own sentences. */
export function AuditMockup() {
  const rows = [
    { t: "00:56", c: "AssetToken", d: "Asset #1 minted to Priya Menon", accent: false },
    { t: "00:55", c: "RoleRegistry", d: "Manager credential issued to Priya Menon", accent: false },
    { t: "00:54", c: "AssetToken", d: "Transfer refused — no Manager credential", accent: true },
    { t: "00:52", c: "RoleRegistry", d: "Auditor credential issued to K. Iyer", accent: false },
    { t: "00:51", c: "IdentityRegistry", d: "Identity registered for Rahul Nair", accent: false },
  ];

  return (
    <div className={frame}>
      <Chrome label="audit — replay" />
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[#e7e7ea] px-2.5 py-1.5 text-[10px] text-[#17191c]">
            All contracts ▾
          </span>
          <span className="rounded-lg border border-[#e7e7ea] px-2.5 py-1.5 text-[10px] text-[#17191c]">
            All events ▾
          </span>
          <span className="flex-1 rounded-lg border border-[#e7e7ea] px-2.5 py-1.5 text-[10px] text-[#6f7482]">
            Search the record
          </span>
        </div>
        <p className="mt-2 text-[9px] text-[#6f7482]">39 events recorded · page 1 of 2</p>

        <ol className="mt-3">
          {rows.map((r) => (
            <li
              key={r.t}
              className="grid grid-cols-[38px_86px_1fr] items-baseline gap-2 border-t border-[#f2f2f3] py-2.5"
            >
              <span className="tabular-nums text-[9px] text-[#616675]">{r.t}</span>
              <span className="text-[9px] text-[#616675]">{r.c}</span>
              <span
                className={`text-[11px] leading-snug ${r.accent ? "text-[#5d2a1a]" : "text-[#17191c]"}`}
              >
                {r.d}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** The printed card — the only artefact that leaves the building. */
export function CardMockup() {
  return (
    <div className="rounded-2xl border border-[#e7e7ea] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_44px_-12px_rgba(23,25,28,0.18)]">
      <div className="flex h-[150px] flex-col justify-between rounded-xl border border-[#f0f0f2] px-4 py-3.5">
        <div>
          <p className="text-[8px] font-medium tracking-[0.05em] text-[#17191c]">
            BHARAT ELECTRONICS LIMITED
          </p>
          <p className="text-[7px] text-[#616675]">Asset &amp; Access Credential</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f2f2f3] font-serif text-[16px] text-[#616675]">
            P
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-[#17191c]">Priya Menon</p>
            <p className="truncate text-[8px] text-[#616675]">Divisional Manager, Radar Systems</p>
            <span className="mt-1 inline-block rounded-full bg-[#17191c] px-2 py-0.5 text-[7px] text-white">
              MANAGER
            </span>
          </div>
          {/* The QR is the live part: it points at a credential, not a snapshot. */}
          <div
            className="h-11 w-11 shrink-0 rounded-[3px]"
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,#17191c 0 2px,transparent 2px 4px),repeating-linear-gradient(90deg,#17191c 0 2px,transparent 2px 4px)",
              backgroundSize: "4px 4px",
              opacity: 0.82,
            }}
          />
        </div>

        <p className="text-[7px] text-[#6f7482]">
          Scan to verify — the QR is the source of truth, not this print
        </p>
      </div>
    </div>
  );
}
