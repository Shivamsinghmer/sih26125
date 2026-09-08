/**
 * The refusal, in the contract's own source.
 *
 * PRODUCT.md's first design principle is "show the mechanism, don't assert it".
 * The mechanism is twenty lines of Solidity, so this section shows those twenty
 * lines rather than describing them. The text is `AssetToken._update` verbatim
 * from `packages/contracts/contracts/AssetToken.sol`; the only edit is a soft
 * wrap on two lines too long for the column, and those carry no line number in
 * the gutter the way a code viewer's continuation rows don't.
 *
 * No syntax palette. Steep is achromatic apart from one warm pair, and a six-hue
 * editor theme would be the loudest thing on the page. The only colour is the
 * peach on the three `revert` lines — the page's one accent, spent where the
 * argument is.
 */

interface Line {
  /** Real source line number. Absent on a soft-wrapped continuation row. */
  n?: number;
  text: string;
  /** The three refusals. */
  mark?: boolean;
}

const LINES: Line[] = [
  { n: 68, text: "function _update(address to, uint256 tokenId, address auth)" },
  { text: "        internal override returns (address from) {" },
  { n: 69, text: "    from = super._update(to, tokenId, auth);" },
  { n: 70, text: "" },
  { n: 71, text: "    bool isMint = from == address(0);" },
  { n: 72, text: "    bool isBurn = to == address(0);" },
  { n: 73, text: "" },
  { n: 74, text: "    if (!isMint && !isBurn) {" },
  { n: 75, text: "        RoleRegistry.Role requiredRole = assets[tokenId].requiredRole;" },
  { n: 76, text: "        (bool valid, RoleRegistry.InvalidReason reason, uint64 expiry) =" },
  { text: "            roleRegistry.checkRole(to, requiredRole);" },
  { n: 77, text: "        if (!valid) {" },
  { n: 78, text: "            if (reason == RoleRegistry.InvalidReason.Revoked) {" },
  { n: 79, text: "                revert TransferBlockedRoleRevoked(to, requiredRole);", mark: true },
  { n: 80, text: "            } else if (reason == RoleRegistry.InvalidReason.Expired) {" },
  { n: 81, text: "                revert TransferBlockedRoleExpired(to, requiredRole, expiry);", mark: true },
  { n: 82, text: "            } else {" },
  { n: 83, text: "                revert TransferBlockedRoleNeverGranted(to, requiredRole);", mark: true },
  { n: 84, text: "            }" },
  { n: 85, text: "        }" },
  { n: 86, text: "    }" },
  { n: 87, text: "}" },
];

export function ContractExcerpt() {
  return (
    <figure className="excerpt">
      <div className="excerpt__frame">
        <header className="excerpt__chrome">
          <span className="excerpt__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="excerpt__path">contracts/AssetToken.sol</span>
          <span className="excerpt__range">lines 68–87</span>
        </header>

        <pre className="excerpt__code">
          <code>
            {LINES.map((line, i) => (
              <span
                key={i}
                className="excerpt__line"
                data-mark={line.mark ? "true" : undefined}
              >
                <span className="excerpt__n" aria-hidden="true">
                  {line.n ?? ""}
                </span>
                <span className="excerpt__text">{line.text || " "}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>

      <figcaption className="excerpt__cap">
        Three refusals, three named errors — so a client can say <em>why</em> a
        transfer failed without guessing. This is the hook every ERC-721 transfer
        is forced through, which is why no interface can route around it.
      </figcaption>

      <style>{`
        .excerpt { margin: 0; min-width: 0; }

        /* The system's floating-artifact surface, per docs/DESIGN.md: white,
           hairline, one soft shadow. Same shell the product mockups use, so a
           reader reads them as the same class of object — evidence, not
           decoration. */
        .excerpt__frame {
          border: 1px solid #e7e7ea;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 18px 44px -12px rgba(23, 25, 28, 0.18);
          overflow: hidden;
        }

        .excerpt__chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-bottom: 1px solid #f0f0f2;
          font-size: 10.5px;
          letter-spacing: -0.01em;
          color: #6f7482;
        }
        .excerpt__dots { display: flex; gap: 6px; }
        .excerpt__dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e2e2e6;
        }
        .excerpt__path {
          margin-left: 2px;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        }
        /* Pushed to the far edge: the provenance, not a label for the file. */
        .excerpt__range { margin-left: auto; }

        .excerpt__code {
          margin: 0;
          padding: 14px 0;
          /* The measure is set by the source, not by the column. Long lines
             scroll inside the artifact rather than forcing the page sideways. */
          overflow-x: auto;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
          font-size: 11.5px;
          line-height: 1.85;
          color: #3f444f;
          -webkit-overflow-scrolling: touch;
        }
        .excerpt__code code { display: block; min-width: max-content; }

        .excerpt__line { display: flex; padding: 0 18px 0 0; }

        .excerpt__n {
          flex: none;
          width: 46px;
          padding-right: 16px;
          text-align: right;
          font-variant-numeric: tabular-nums;
          color: #6f7482;
          user-select: none;
        }
        .excerpt__text { white-space: pre; }

        /* The one accent on the page, on the three lines that are the product.
           Sienna on blush is the system's documented pair; it is used here for
           the same reason it is used at the gate — this is a refusal. */
        .excerpt__line[data-mark="true"] { background: #fbe1d1; }
        .excerpt__line[data-mark="true"] .excerpt__text { color: #5d2a1a; }
        /* The sienna stepped toward the peach until it clears 4.5:1 against
           it — same hue, legible gutter. */
        .excerpt__line[data-mark="true"] .excerpt__n { color: #8a5c44; }

        .excerpt__cap {
          margin-top: 16px;
          max-width: 52ch;
          font-size: 13.5px;
          line-height: 1.6;
          text-wrap: pretty;
          color: #616675;
        }
        .excerpt__cap em { font-style: italic; color: #17191c; }

        @media (max-width: 900px) {
          .excerpt__frame { position: relative; }
          .excerpt__frame::after {
            content: "";
            position: absolute;
            inset: 37px 0 0 auto;
            width: 30px;
            background: linear-gradient(to right, rgba(255, 255, 255, 0), #fff);
            pointer-events: none;
          }
        }

        @media (max-width: 620px) {
          .excerpt__code { font-size: 10.5px; }
          .excerpt__n { width: 38px; padding-right: 12px; }
        }
      `}</style>
    </figure>
  );
}
