/**
 * The two pictures on the help page.
 *
 * Drawn rather than described because both explain a *relationship*, and a
 * relationship read as a paragraph has to be held in the head while the next
 * sentence arrives. The first says what the three things are and how they hang
 * together; the second says what the system does at the one moment people most
 * want to predict — pressing the button that hands something over.
 *
 * Inline SVG, no library: two static diagrams do not justify a dependency, and
 * these have to survive a printed page and a projector as well as a screen.
 * Every label is real vocabulary from the app, so the picture and the buttons
 * agree.
 *
 * Colour carries no meaning on its own here. The blocked branch is on the
 * system's reserved blush surface *and* says "Nothing moves", because a reader
 * who cannot separate the two hues must still get the whole point.
 */

const INK = "#17191c";
const LABEL = "#616675";
const MIST = "#f2f2f3";
const BLUSH = "#fbe1d1";
const SIENNA = "#5d2a1a";
const LINE = "#c9ccd4";

/** One arrowhead definition, reused within a diagram via a per-diagram id. */
function ArrowHead({ id, color = LINE }: { id: string; color?: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="8.5"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M0 1.5 9 5 0 8.5z" fill={color} />
      </marker>
    </defs>
  );
}

function Frame({
  children,
  viewBox,
  title,
  desc,
  minWidth,
}: {
  children: React.ReactNode;
  viewBox: string;
  title: string;
  desc: string;
  minWidth: number;
}) {
  return (
    // Wide content scrolls inside its own box rather than pushing the page
    // sideways — a diagram is not worth a horizontally scrolling document.
    <div className="overflow-x-auto rounded-3xl bg-fog-white px-5 py-6">
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={title}
        className="h-auto w-full"
        style={{ minWidth }}
        fontFamily="inherit"
      >
        <title>{title}</title>
        <desc>{desc}</desc>
        {children}
      </svg>
    </div>
  );
}

function Box({
  x,
  y,
  w,
  h,
  fill = MIST,
  stroke,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={16}
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? 1 : undefined}
    />
  );
}

/**
 * What the system keeps track of, and how the three things connect.
 *
 * The order left to right is the order it happens in real life: somebody joins,
 * they are cleared for something, and only then can they hold it.
 */
export function HowItFitsTogether() {
  // Laid out from three numbers rather than by hand, because the first version
  // was: the gaps between the cards were narrower than the words that had to
  // sit in them, and "is allowed to hold" printed straight across a box.
  const CARD_W = 210;
  const GAP = 99; // 3 * 210 + 2 * 99 = 828, the full width inside the margins
  const X = [16, 16 + CARD_W + GAP, 16 + 2 * (CARD_W + GAP)];

  const cards = [
    { head: "A person", lines: ["Ravi Sharma", "Stores Officer", "carries an ID card"] },
    { head: "A clearance", lines: ["Secret", "valid to 12 March", "given by the authority"] },
    { head: "An item", lines: ["Radar unit #1", "needs Secret clearance"] },
  ];

  return (
    <Frame
      viewBox="0 0 860 314"
      minWidth={680}
      title="How a person, a clearance and an item fit together"
      desc="A person is given a clearance, and a clearance is what lets them hold an item. Every one of those changes is written to a shared record that cannot be edited afterwards, and the gate check reads that same record."
    >
      <ArrowHead id="fit-arrow" />

      {/* ---- the three things, left to right in the order they happen ---- */}
      {cards.map((c, i) => (
        <g key={c.head}>
          <Box x={X[i]!} y={40} w={CARD_W} h={104} />
          <text x={X[i]! + 20} y={68} fontSize="17" fill={INK}>
            {c.head}
          </text>
          {c.lines.map((line, j) => (
            <text key={line} x={X[i]! + 20} y={92 + j * 19} fontSize="13" fill={LABEL}>
              {line}
            </text>
          ))}
        </g>
      ))}

      {/* ---- what connects them. The label sits over its own arrow, and both
              are inset from the cards so neither can print across one. ---- */}
      {[
        { from: 0, label: "is given a" },
        { from: 1, label: "which unlocks" },
      ].map(({ from, label }) => {
        const x1 = X[from]! + CARD_W + 10;
        const x2 = X[from + 1]! - 6;
        return (
          <g key={label}>
            <line
              x1={x1}
              y1={92}
              x2={x2}
              y2={92}
              stroke={LINE}
              strokeWidth="1.6"
              markerEnd="url(#fit-arrow)"
            />
            <text
              x={(x1 + x2) / 2}
              y={80}
              fontSize="12.5"
              fill={LABEL}
              textAnchor="middle"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* ---- everything above lands in the same record ---- */}
      {X.map((x) => (
        <line
          key={x}
          x1={x + CARD_W / 2}
          y1={144}
          x2={x + CARD_W / 2}
          y2={188}
          stroke={LINE}
          strokeWidth="1.6"
          strokeDasharray="4 4"
          markerEnd="url(#fit-arrow)"
        />
      ))}

      <Box x={16} y={188} w={828} h={90} fill={INK} />
      <text x={40} y={218} fontSize="17" fill="#ffffff">
        The shared record
      </text>
      <text x={40} y={241} fontSize="13.5" fill="#c9ccd4">
        Every change above is written here, in order. Nothing can be edited or deleted afterwards.
      </text>
      <text x={40} y={262} fontSize="13.5" fill="#c9ccd4">
        The gate check reads this the moment somebody scans a card.
      </text>

      <text x={16} y={302} fontSize="12.5" fill={LABEL}>
        Names and photos stay in the staff records. Only the ID, the clearance and the item reach the
        shared record.
      </text>
    </Frame>
  );
}

/**
 * What happens when someone presses the button that hands an item over.
 *
 * The branch on the left is the one worth drawing. People assume a refusal is
 * the screen being fussy and that somebody senior can wave it through; this
 * says plainly that the refusal happens in the record itself and that no screen
 * or account can overrule it.
 */
export function WhatHappensOnHandover() {
  return (
    <Frame
      viewBox="0 0 860 358"
      minWidth={660}
      title="What happens when you hand an item over"
      desc="You choose an item and a person. The system checks whether that person holds a valid clearance for the item. If they do, the item moves and the handover is recorded. If they do not, nothing moves and you are told which of the three reasons applied: never given, expired, or taken away."
    >
      <ArrowHead id="flow-arrow" />

      <Box x={250} y={14} w={360} h={58} />
      <text x={430} y={40} fontSize="16" fill={INK} textAnchor="middle">
        You choose an item and who it goes to
      </text>
      <text x={430} y={60} fontSize="13" fill={LABEL} textAnchor="middle">
        then press &ldquo;Hand over&rdquo;
      </text>

      <line
        x1={430}
        y1={72}
        x2={430}
        y2={104}
        stroke={LINE}
        strokeWidth="1.6"
        markerEnd="url(#flow-arrow)"
      />

      <Box x={210} y={104} w={440} h={68} fill="#ffffff" stroke={LINE} />
      <text x={430} y={132} fontSize="16" fill={INK} textAnchor="middle">
        Does that person hold a valid clearance
      </text>
      <text x={430} y={154} fontSize="16" fill={INK} textAnchor="middle">
        for this item, right now?
      </text>

      {/* Elbows out to the two outcomes, drawn as polylines so the turn is
          square and the eye follows it without hunting for the end. */}
      <polyline
        points="430,172 430,196 206,196 206,232"
        fill="none"
        stroke={LINE}
        strokeWidth="1.6"
        markerEnd="url(#flow-arrow)"
      />
      <polyline
        points="430,172 430,196 654,196 654,232"
        fill="none"
        stroke={LINE}
        strokeWidth="1.6"
        markerEnd="url(#flow-arrow)"
      />
      <text x={296} y={190} fontSize="13.5" fill={SIENNA}>
        No
      </text>
      <text x={548} y={190} fontSize="13.5" fill={LABEL}>
        Yes
      </text>

      {/* ---- refused ---- */}
      <Box x={16} y={232} w={380} h={104} fill={BLUSH} />
      <text x={40} y={262} fontSize="17" fill={SIENNA}>
        Nothing moves
      </text>
      <text x={40} y={286} fontSize="13.5" fill={SIENNA}>
        The screen tells you which applied: the clearance was
      </text>
      <text x={40} y={306} fontSize="13.5" fill={SIENNA}>
        never given, has expired, or was taken away.
      </text>
      <text x={40} y={326} fontSize="12.5" fill={SIENNA} opacity="0.75">
        No account on the system can override this.
      </text>

      {/* ---- allowed ---- */}
      <Box x={464} y={232} w={380} h={104} />
      <text x={488} y={262} fontSize="17" fill={INK}>
        The item moves
      </text>
      <text x={488} y={286} fontSize="13.5" fill={LABEL}>
        The new holder is shown against the item straight
      </text>
      <text x={488} y={306} fontSize="13.5" fill={LABEL}>
        away, and the handover is added to the record.
      </text>
      <text x={488} y={326} fontSize="12.5" fill={LABEL} opacity="0.85">
        It appears in History with the date and time.
      </text>
    </Frame>
  );
}
