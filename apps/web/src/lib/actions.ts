"use server";

import { revalidatePath } from "next/cache";
import type { Hex } from "viem";

import { assetTokenAbi, explainContractError, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";
import { Role, didFromAddress } from "@sih26125/identity";

import { type ActionResult } from "./action-types";
import {
  addPerson,
  loadPeople,
  personaById,
  publicClient,
  readDeployment,
  walletFor,
  type Persona,
} from "./chain";

const DAY = 86_400;
const now = () => Math.floor(Date.now() / 1000);

/**
 * Refresh the surfaces that render chain state. These used to revalidate "/",
 * which stopped being the console when the landing page took that route — so
 * every mutation was refreshing the one page that shows none of this.
 */
function revalidateConsole() {
  revalidatePath("/console");
  revalidatePath("/audit");
  revalidatePath("/gate");
}

function requireDeployment() {
  const deployment = readDeployment();
  if (!deployment) {
    throw new Error(
      "No deployment found. Run: pnpm --filter @sih26125/contracts deploy:local",
    );
  }
  return deployment;
}

async function send(
  persona: Persona,
  address: Hex,
  abi: unknown,
  functionName: string,
  args: unknown[],
) {
  const hash = await walletFor(persona).writeContract({
    address,
    abi: abi as never,
    functionName,
    args: args as never,
  });
  return publicClient.waitForTransactionReceipt({ hash });
}

/* ------------------------------------------------------------------ results */

/** Wrap a chain write so a revert becomes a rendered explanation, never a crash. */
async function attempt(
  run: () => Promise<{ transactionHash: string }>,
  successMessage: string,
): Promise<ActionResult> {
  try {
    const receipt = await run();
    revalidateConsole();
    return {
      status: "success",
      message: successMessage,
      hash: receipt.transactionHash,
    };
  } catch (error) {
    const explained = explainContractError(error);
    if (explained.reason !== "unknown") {
      revalidateConsole();
      return {
        status: "blocked",
        title: explained.title,
        detail: explained.detail,
        errorName: explained.errorName,
        reason: explained.reason,
      };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Transaction failed.",
    };
  }
}

/* ------------------------------------------------------------------ actions */

/**
 * Put the chain into the state the demo opens from: four identities registered,
 * each with the credential their role implies, and one asset minted.
 */
export async function seedDemo(): Promise<ActionResult> {
  const deployment = requireDeployment();
  const people = await loadPeople();
  const admin = personaById(people, "admin");
  const manager = personaById(people, "manager");
  const user = personaById(people, "user");
  const auditor = personaById(people, "auditor");
  const expiry = BigInt(now() + 30 * DAY);

  return attempt(async () => {
    for (const persona of [admin, manager, user, auditor]) {
      const did = didFromAddress(persona.address, deployment.chainId);
      try {
        await send(
          admin,
          deployment.contracts.IdentityRegistry,
          identityRegistryAbi,
          "register",
          [persona.address, did],
        );
      } catch {
        // Already registered — seeding is deliberately re-runnable.
      }
    }

    await send(admin, deployment.contracts.RoleRegistry, roleRegistryAbi, "grantBusinessRole", [
      admin.address,
      Role.Admin,
      expiry,
    ]);
    await send(admin, deployment.contracts.RoleRegistry, roleRegistryAbi, "grantBusinessRole", [
      manager.address,
      Role.Manager,
      expiry,
    ]);
    await send(admin, deployment.contracts.RoleRegistry, roleRegistryAbi, "grantBusinessRole", [
      user.address,
      Role.User,
      expiry,
    ]);
    // Without this the /audit surface is unreachable: the console reads its
    // role from RoleRegistry, so a role nobody holds is a screen nobody opens.
    await send(admin, deployment.contracts.RoleRegistry, roleRegistryAbi, "grantBusinessRole", [
      auditor.address,
      Role.Auditor,
      expiry,
    ]);

    return send(admin, deployment.contracts.AssetToken, assetTokenAbi, "mint", [
      manager.address,
      Role.Manager,
      `0x${"a3".repeat(32)}`,
    ]);
  }, "Demo seeded — identities registered, credentials issued, asset minted.");
}

export async function grantRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const deployment = requireDeployment();
  const people = await loadPeople();
  const admin = personaById(people, "admin");
  const subject = personaById(people, String(formData.get("persona")));
  const role = Number(formData.get("role")) as Role;
  const days = Number(formData.get("days") ?? 30);

  return attempt(
    () =>
      send(admin, deployment.contracts.RoleRegistry, roleRegistryAbi, "grantBusinessRole", [
        subject.address,
        role,
        BigInt(now() + days * DAY),
      ]),
    `Credential issued to ${subject.name}.`,
  );
}

export async function revokeRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const deployment = requireDeployment();
  const people = await loadPeople();
  const admin = personaById(people, "admin");
  const subject = personaById(people, String(formData.get("persona")));
  const role = Number(formData.get("role")) as Role;

  return attempt(
    () =>
      send(admin, deployment.contracts.RoleRegistry, roleRegistryAbi, "revokeBusinessRole", [
        subject.address,
        role,
      ]),
    `Credential revoked for ${subject.name}.`,
  );
}

export async function mintAssetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const deployment = requireDeployment();
  const people = await loadPeople();
  const admin = personaById(people, "admin");
  const holder = personaById(people, String(formData.get("persona")));
  const role = Number(formData.get("role")) as Role;

  return attempt(
    () =>
      send(admin, deployment.contracts.AssetToken, assetTokenAbi, "mint", [
        holder.address,
        role,
        `0x${"a3".repeat(32)}`,
      ]),
    `Asset minted to ${holder.name}.`,
  );
}

/**
 * The centrepiece. A transfer the recipient is not credentialled for reverts in
 * `AssetToken._update`, and the revert is decoded into a sentence rather than a
 * hex string.
 */
export async function attemptTransferAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const deployment = requireDeployment();
  const people = await loadPeople();
  const from = personaById(people, String(formData.get("from")));
  const to = personaById(people, String(formData.get("to")));
  const tokenId = BigInt(String(formData.get("tokenId")));

  return attempt(
    () =>
      send(from, deployment.contracts.AssetToken, assetTokenAbi, "transferFrom", [
        from.address,
        to.address,
        tokenId,
      ]),
    `Asset #${tokenId} transferred to ${to.name}.`,
  );
}

/** Form-action shape for `seedDemo`, for use with `useActionState`. */
export async function seedDemoAction(
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  return seedDemo();
}

/**
 * Add a person: create their record off chain, then give them a decentralised
 * identity on chain.
 *
 * Note what goes where. Name and title are personal data and stay in Postgres.
 * What reaches the chain is a DID, a public key and a status flag — nothing
 * that identifies a human being. That split is what makes an erasure request
 * answerable later: delete the row, and the on-chain record becomes an orphan
 * that points at nobody.
 *
 * The signing key is derived from an HD index, so onboarding never writes a
 * private key anywhere.
 */
/** Kept well under Postgres's text-column comfort zone for a base64 payload. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

async function readPhoto(formData: FormData): Promise<
  { ok: true; dataUrl: string | null } | { ok: false; message: string }
> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: true, dataUrl: null };

  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "The photo must be an image file." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "Photo is too large — please use one under 2MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  return { ok: true, dataUrl: `data:${file.type};base64,${bytes.toString("base64")}` };
}

export async function addPersonAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const deployment = requireDeployment();
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const role = Number(formData.get("role") ?? 0) as Role;
  const days = Number(formData.get("days") ?? 30);

  if (name.length < 2) {
    return { status: "error", message: "Enter the person's name." };
  }

  const photo = await readPhoto(formData);
  if (!photo.ok) {
    return { status: "error", message: photo.message };
  }

  const people = await loadPeople();
  const admin = personaById(people, "admin");

  let created;
  try {
    created = await addPerson({ name, title: title || "Unassigned", photo: photo.dataUrl });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not create the person record.",
    };
  }

  return attempt(async () => {
    await send(
      admin,
      deployment.contracts.IdentityRegistry,
      identityRegistryAbi,
      "register",
      [created.address, didFromAddress(created.address, deployment.chainId)],
    );

    if (role !== Role.None) {
      return send(
        admin,
        deployment.contracts.RoleRegistry,
        roleRegistryAbi,
        "grantBusinessRole",
        [created.address, role, BigInt(now() + days * DAY)],
      );
    }

    return send(
      admin,
      deployment.contracts.IdentityRegistry,
      identityRegistryAbi,
      "setStatus",
      [created.address, 1],
    );
  }, `${created.name} onboarded — DID registered, ${role === Role.None ? "no role yet" : `${Role[role]} credential issued`}.`);
}
