#!/usr/bin/env bun
/**
 * sih-verify — validate a chain of custody with the network cable pulled.
 *
 *   sih-verify <bundle.json>
 *
 * This binary opens no sockets. Credential signatures verify against DIDs that
 * resolve from their own identifiers, and the custody chain is checked for
 * internal contiguity, so the whole proof travels in the file.
 *
 * It prints what it could verify AND what it could not. A verifier that stays
 * silent about the age of its revocation data is worse than useless in an
 * air-gapped facility, because a stale pass is indistinguishable from a fresh
 * one.
 */
import { readFileSync } from "node:fs";

import {
  describeAge,
  verifyBundle,
  type CustodyBundle,
  type VerificationReport,
} from "@sih26125/custody";

const RESET = "[0m";
const BOLD = "[1m";
const DIM = "[2m";
const GREEN = "[32m";
const RED = "[31m";
const YELLOW = "[33m";

const useColour = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string, text: string) => (useColour ? `${code}${text}${RESET}` : text);

function rule() {
  console.log("─".repeat(68));
}

function render(report: VerificationReport, path: string) {
  console.log("");
  console.log(paint(BOLD, "Chain of custody verification"));
  console.log(paint(DIM, `${path} · no network access used`));
  rule();

  if (report.assetTokenId) {
    console.log(`Asset       #${report.assetTokenId}`);
  }
  if (report.finalHolder) {
    console.log(`Held by     ${report.finalHolder}`);
  }
  console.log("");

  for (const check of report.checks) {
    const mark = check.ok ? paint(GREEN, "✓") : paint(RED, "✗");
    console.log(`${mark} ${check.name}`);
    console.log(`  ${paint(DIM, check.detail)}`);
  }

  console.log("");
  rule();
  if (report.verified) {
    console.log(paint(GREEN, `${BOLD}VERIFIED${RESET}`));
    console.log("Every check above passed using only the contents of this file.");
  } else {
    console.log(paint(RED, `${BOLD}NOT VERIFIED${RESET}`));
    console.log("At least one check failed. Do not treat this record as sound.");
  }

  console.log("");
  console.log(
    paint(YELLOW, "Could not be verified offline") +
      paint(DIM, `  (status data is ${describeAge(report.statusAgeSeconds)} old)`),
  );
  for (const limit of report.couldNotVerify) {
    console.log(`  · ${paint(DIM, limit)}`);
  }
  console.log("");
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: sih-verify <bundle.json>");
    process.exit(2);
  }

  let bundle: CustodyBundle;
  try {
    bundle = JSON.parse(readFileSync(path, "utf8")) as CustodyBundle;
  } catch (error) {
    console.error(
      `Could not read ${path}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exit(2);
  }

  const report = await verifyBundle(bundle);
  render(report, path);

  // Exit code carries the verdict, so this can gate a script.
  process.exit(report.verified ? 0 : 1);
}

void main();
