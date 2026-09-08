import Link from "next/link";

import { PageHeading } from "@/components/PageHeading";
import { HowItFitsTogether, WhatHappensOnHandover } from "@/components/help/Diagrams";
import { getSession } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

/**
 * The instructions.
 *
 * Written for somebody who has been handed a login and told to get on with it,
 * not for somebody who wants to know how the system works. That is why the
 * examples are whole tasks with an outcome — "give someone a clearance" — rather
 * than a tour of each screen: people arrive here with a job in hand, not with
 * curiosity about the navigation.
 *
 * Two rules held throughout. Every step names what you will actually see, so a
 * reader can tell whether it worked. And nothing is promised that the system
 * does not do — the section on refusals says plainly that nobody can override
 * one, because the alternative is somebody spending an afternoon looking for
 * the person who can.
 */

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3.5">
          <span
            aria-hidden="true"
            className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-black text-[13px] tabular text-paper-white"
          >
            {i + 1}
          </span>
          <span className="text-body leading-body">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Example({
  title,
  who,
  href,
  linkLabel,
  intro,
  steps,
  outcome,
}: {
  title: string;
  who: string;
  href?: string;
  linkLabel?: string;
  intro: string;
  steps: string[];
  outcome: string;
}) {
  return (
    <section className="border-t border-mist-gray pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-subheading leading-subheading">{title}</h3>
        {href && linkLabel ? (
          <Link
            href={href}
            className="text-caption leading-caption text-label underline underline-offset-2 hover:text-ink-black"
          >
            {linkLabel} &rarr;
          </Link>
        ) : null}
      </div>

      <p className="mt-1 text-caption leading-caption text-label">{who}</p>
      <p className="mt-3 max-w-[68ch] text-body leading-body">{intro}</p>

      <Steps steps={steps} />

      <p className="mt-4 max-w-[68ch] rounded-2xl bg-mist-gray px-5 py-4 text-body leading-body">
        <span className="text-label">You should then see: </span>
        {outcome}
      </p>
    </section>
  );
}

export default async function HelpPage() {
  const session = await getSession();
  const role = session?.role ?? "guard";

  return (
    <>
      <PageHeading title="How to use this">
        A short guide to the everyday jobs. You do not need to know anything
        about how it works underneath — but if you want to, the first two
        sections explain it in plain terms.
      </PageHeading>

      {/* ---------------------------------------------------------- the idea */}
      <section>
        <h2 className="text-subheading leading-subheading">What this system is for</h2>
        <div className="mt-3 flex max-w-[68ch] flex-col gap-3 text-body leading-body">
          <p>
            It keeps track of who is allowed to hold which equipment, and it
            keeps a record of every handover. That is the whole job.
          </p>
          <p>
            The part that makes it different from a spreadsheet is this: the
            permission is not a note somebody can edit. If a person is not
            cleared for an item, the system will not let the item be given to
            them &mdash; not by you, not by anyone, whatever their job title.
          </p>
          <p>
            And nothing that has already happened can be changed later. The
            record only ever has things added to it, which is why the{" "}
            <Link
              href="/audit"
              className="underline underline-offset-2 hover:opacity-70"
            >
              History
            </Link>{" "}
            page can be trusted when there is a question about where something
            went.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-subheading leading-subheading">The three things it tracks</h2>
        <p className="mt-2 max-w-[68ch] text-body leading-body text-label">
          People, what they are cleared for, and the equipment itself. They
          connect in one direction, in the order things happen.
        </p>
        <div className="mt-5">
          <HowItFitsTogether />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-subheading leading-subheading">
          What happens when you hand something over
        </h2>
        <p className="mt-2 max-w-[68ch] text-body leading-body text-label">
          This is the one moment worth understanding before you use the system,
          because it is the one that sometimes says no.
        </p>
        <div className="mt-5">
          <WhatHappensOnHandover />
        </div>

        <div className="mt-6 max-w-[68ch] rounded-3xl bg-blush-peach px-6 py-5 text-sienna-brown">
          <p className="text-body-lg leading-body-lg">
            If a handover is refused, that is the system working, not breaking.
          </p>
          <p className="mt-2 text-body leading-body">
            There is no override, and no one to ring who has one. The way
            forward is to give the person the clearance they are missing &mdash;
            or, if they should not have it, to record the handover to somebody
            who is cleared.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- the tasks */}
      <section className="mt-14">
        <h2 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
          Everyday jobs
        </h2>
        <p className="mt-2 max-w-[68ch] text-body leading-body text-label">
          {role === "admin"
            ? "Each of these is a whole task, start to finish. The screens they use are in the menu on the left."
            : "Your sign-in covers the jobs marked for your role. The rest are here so you know what happens on the other side of a request."}
        </p>

        <div className="mt-8 flex flex-col gap-10">
          <Example
            title="Add somebody new"
            who="Issuing authority"
            href="/console/people#onboard"
            linkLabel="Go to People"
            intro="Do this when a person joins, or the first time they need to hold anything. It creates their record and gives them an ID on the system."
            steps={[
              "Open People from the menu, then scroll to “Add someone”.",
              "Upload a photo. This is only used for printing their ID card — the gate does not look it up.",
              "Type their name and their job title.",
              "Choose the clearance they should start with, and how long it should last. Pick “No clearance yet” if that is decided later.",
              "Press “Add person”.",
            ]}
            outcome="Their card appears in the list above, with the clearance shown as a black tag. From there you can print their ID card."
          />

          <Example
            title="Give someone a clearance"
            who="Issuing authority"
            href="/console/credentials#issue"
            linkLabel="Go to Clearances"
            intro="A clearance is what lets a person hold a particular kind of equipment. It always has an end date, so nothing is permanent by accident."
            steps={[
              "Open Clearances from the menu.",
              "Under “Give a clearance”, pick the person.",
              "Pick the level — Admin, Manager, Auditor or User.",
              "Choose how long it lasts: 30 days, 90 days or a year.",
              "Press “Give clearance”.",
            ]}
            outcome="A confirmation line under the form. The new clearance shows against that person on the People page straight away, and handovers that needed it will now go through."
          />

          <Example
            title="Take a clearance away"
            who="Issuing authority"
            href="/console/credentials#revoke"
            linkLabel="Go to Clearances"
            intro="Use this when someone changes role or leaves. It takes effect immediately — there is no waiting period and nothing to sync."
            steps={[
              "Open Clearances from the menu.",
              "Under “Take one away”, pick the person and the clearance level.",
              "Press “Take clearance away”.",
            ]}
            outcome="The clearance is shown against that person as “taken away”. From that second, a gate check on their card reports them as not cleared, and no item needing it can be handed to them."
          />

          <Example
            title="Add a piece of equipment"
            who="Issuing authority"
            href="/console/assets#register"
            linkLabel="Go to Equipment"
            intro="This puts an item on the system for the first time and decides who its first holder is. It also sets the clearance anybody will need to hold it in future."
            steps={[
              "Open Equipment from the menu, then scroll to “Add equipment”.",
              "Pick who will hold it first.",
              "Pick the clearance level the item requires. Choose carefully — this is what every future handover is checked against.",
              "Press “Add equipment”.",
            ]}
            outcome="The item appears in the table with its number, who holds it, and what it requires."
          />

          <Example
            title="Hand an item to someone else"
            who="Issuing authority"
            href="/console/transfers"
            linkLabel="Go to Hand over an item"
            intro="The everyday job. Everything else on the system exists so that this one is safe to do."
            steps={[
              "Open “Hand over an item” from the menu.",
              "Pick the item. The list shows what each one requires.",
              "Check who currently holds it, and pick who it is going to. Each name shows that person’s clearance next to it.",
              "Press “Hand over”.",
            ]}
            outcome="Either a confirmation that the item has moved, or a peach-coloured panel explaining why it did not. Both are normal outcomes — see the diagram above."
          />

          <Example
            title="Check somebody at the gate"
            who="Gate security"
            href="/gate"
            linkLabel="Go to Gate check"
            intro="Two checks happen at a gate and only one of them is this screen. Look at the person and compare them to the photo on their card yourself — the screen cannot do that part."
            steps={[
              "Open Gate check.",
              "Hold the QR code on their card up to the camera, or pick their name from the list if you have no scanner.",
              "Read the result. It tells you whether their clearance is valid at this moment.",
              "If it says not cleared, do not let the equipment through. Send them to the issuing authority.",
            ]}
            outcome="A clear yes or no, with the reason. The answer is looked up fresh each time, so a clearance taken away a minute ago already shows here."
          />

          <Example
            title="Find out what happened to an item"
            who="Internal audit, and the issuing authority"
            href="/audit"
            linkLabel="Go to History"
            intro="Every ID created, every clearance given or taken away, and every handover, in the order it happened. Nothing on this page can be edited, including by you."
            steps={[
              "Open History from the menu.",
              "Type what you are looking for in the search box — a person’s name, or an item number like #1.",
              "Narrow it further with the filters above the list if you need to.",
              "Read down the list. Each line carries the date, the time and what changed.",
            ]}
            outcome="The matching events, newest first, with a count of how many matched out of the total."
          />
        </div>
      </section>

      {/* ----------------------------------------------------- if it says no */}
      <section className="mt-14">
        <h2 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
          When the system says no
        </h2>
        <p className="mt-2 max-w-[68ch] text-body leading-body text-label">
          There are only three reasons a handover is refused, and the screen
          always names which one.
        </p>

        <dl className="mt-6 flex max-w-[74ch] flex-col gap-5">
          {[
            {
              t: "The clearance was never given",
              d: "That person has never held this level of clearance. Give it to them on the Clearances page, then try the handover again.",
            },
            {
              t: "The clearance has expired",
              d: "They had it, and its end date has passed. Give it again with a new end date — expiry is not a fault, it is the system asking somebody to confirm the person still needs it.",
            },
            {
              t: "The clearance was taken away",
              d: "Somebody withdrew it deliberately. Find out why before giving it back — this one is usually a decision, not an oversight.",
            },
          ].map((r) => (
            <div key={r.t}>
              <dt className="text-body-lg leading-body-lg">{r.t}</dt>
              <dd className="mt-1 text-body leading-body text-label">{r.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------- vocabulary */}
      <section className="mt-14">
        <h2 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
          Words you will see
        </h2>

        <dl className="mt-6 flex max-w-[74ch] flex-col gap-4">
          {[
            ["Clearance", "Permission to hold a particular kind of equipment, with an end date. Given and taken away by the issuing authority."],
            ["Item", "One piece of equipment, with its own number. Held by exactly one person at a time."],
            ["Handover", "Moving an item from the person holding it to somebody else."],
            ["The shared record", "Where every change is written. It is held on several machines at once, in different departments, so no single person can quietly alter it."],
            ["ID card", "The printed card a person carries. The QR code on it is what a gate post scans."],
            ["Issuing authority", "The role that can add people, give and withdraw clearances, and add equipment."],
            ["Gate security", "The role at a gate post. Can run checks; cannot change anything."],
            ["Internal audit", "The role that can read the whole History and nothing else. Deliberately cannot change anything, including clearances."],
          ].map(([term, meaning]) => (
            <div key={term} className="grid gap-1 md:grid-cols-[190px_1fr] md:gap-6">
              <dt className="text-body leading-body">{term}</dt>
              <dd className="text-body leading-body text-label">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 border-t border-mist-gray pt-8">
        <h2 className="text-subheading leading-subheading">Still stuck?</h2>
        <p className="mt-2 max-w-[68ch] text-body leading-body text-label">
          If a screen will not do what you expect, it is worth checking the{" "}
          <Link href="/audit" className="underline underline-offset-2 hover:opacity-70">
            History
          </Link>{" "}
          first &mdash; it shows what the system actually recorded, which is
          usually the answer. If a clearance looks right there and a handover is
          still refused, check that it has not expired and that it is the level
          the item requires, not a different one.
        </p>
      </section>
    </>
  );
}
