"use server";

import { revalidatePath } from "next/cache";
import { parseEventLogs, type Hex } from "viem";

import { assetTokenAbi, explainContractError, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";
import { Role, didFromAddress } from "@sih26125/identity";

import { MAX_PHOTO_BYTES, type ActionResult } from "./action-types";
import { metadataHashFor, recordEquipment } from "./equipment";
import {
  accountFor,
  addPerson,
  loadPeople,
  nextAddressIndex,
  personaById,
  publicClient,
  removePerson,
  readDeployment,
  walletFor,
  type Persona,
} from "./chain";

/** The item the demo opens on, and the one the landing page names. */
const SEED_EQUIPMENT = { name: "Signal Analyser", serial: "SN-8823" };

const DAY = 86_400;
const now = () => Math.floor(Date.now() / 1000);

/** How far to look for a free HD index before giving up. */
const INDEX_SCAN_LIMIT = 64;

/**
 * The first HD index that is free on *both* sides.
 *
 * The staff table can be reset to the demo state; the chain cannot. Allocating
 * from the table alone therefore handed out an index whose address was still
 * registered on chain, and onboarding died on `AlreadyRegistered`. The chain is
 * the authority on what is taken, so ask it.
 *
 * In practice this returns on the first probe. It only walks when the two have
 * drifted, which is exactly the case it exists for.
 */
async function freeAddressIndex(identityRegistry: `0x${string}`): Promise<number> {
  const start = await nextAddressIndex();

  for (let index = start; index < start + INDEX_SCAN_LIMIT; index += 1) {
    const { address } = accountFor({ addressIndex: index });
    const identity = (await publicClient.readContract({
      address: identityRegistry,
      abi: identityRegistryAbi,
      functionName: "get",
      args: [address],
    })) as { status: number };

    // Status.Unregistered === 0. Anything else means the address is spoken for.
    if (identity.status === 0) return index;
  }

  throw new Error(
    `No unregistered account found in ${INDEX_SCAN_LIMIT} indices from ${start}. ` +
      "Redeploy the contracts, or reset the demo state.",
  );
}

/**
 * Refresh the surfaces that render chain state. These used to revalidate "/",
 * which stopped being the console when the landing page took that route — so
 * every mutation was refreshing the one page that shows none of this.
 */
function revalidateConsole() {
  // "layout" so every nested route under /console is refreshed too. Revalidating
  // the bare path only covers that one page, which meant seeding from
  // /console/people left the badges on that very page stale.
  revalidatePath("/console", "layout");
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
    // The raw error is for the operator running this, not the person using it.
    // viem's message carries the contract address, the ABI args, a docs link
    // and its own version string; that reached the screen once and it is
    // exactly what PROJECT.md forbids. It goes to the server log, and the UI
    // gets a sentence that says what happened and what state things are in.
    console.error("[action] unrecognised failure", error);
    return {
      status: "error",
      message:
        "The shared record refused this, and nothing was changed. " +
        "The details are in the server log.",
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

    // The seeded item is named, because the landing page advertises a Signal
    // Analyser and a console that opens on "Item #1" makes the demo look like
    // two different products.
    const receipt = await send(
      admin,
      deployment.contracts.AssetToken,
      assetTokenAbi,
      "mint",
      [manager.address, Role.Manager, metadataHashFor(SEED_EQUIPMENT)],
    );

    const [minted] = parseEventLogs({
      abi: assetTokenAbi as never,
      eventName: "AssetMinted",
      logs: receipt.logs,
    }) as unknown as { args?: { tokenId?: bigint } }[];

    const tokenId = minted?.args?.tokenId;
    if (tokenId !== undefined) {
      await recordEquipment({
        tokenId: Number(tokenId),
        ...SEED_EQUIPMENT,
        metadataHash: metadataHashFor(SEED_EQUIPMENT),
      });
    }

    return receipt;
  }, "Example data loaded — four people added, their clearances given, and one item of equipment put on the system.");
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
    `Clearance given to ${subject.name}.`,
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
    `Clearance taken away from ${subject.name}.`,
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

  const name = String(formData.get("name") ?? "").trim();
  const serial = String(formData.get("serial") ?? "").trim();

  if (!name) {
    return { status: "error", message: "Give the equipment a name." };
  }
  if (!serial) {
    return { status: "error", message: "Give the equipment a serial number." };
  }

  // The token carries the digest of this description, so an edit after the fact
  // no longer matches the token and anyone can see that it does not — including
  // the offline verifier, which has the hash inside the bundle. This used to be
  // a fixed placeholder.
  const metadataHash = metadataHashFor({ name, serial });

  let mintedTokenId: number | null = null;

  const result = await attempt(async () => {
    const receipt = await send(
      admin,
      deployment.contracts.AssetToken,
      assetTokenAbi,
      "mint",
      [holder.address, role, metadataHash],
    );

    // The token id does not exist until the mint is mined, so it is read back
    // off the event rather than guessed from a counter.
    const [minted] = parseEventLogs({
      abi: assetTokenAbi as never,
      eventName: "AssetMinted",
      logs: receipt.logs,
    }) as unknown as { args?: { tokenId?: bigint } }[];

    const tokenId = minted?.args?.tokenId;
    if (tokenId !== undefined) mintedTokenId = Number(tokenId);

    return receipt;
  }, `${name} added and given to ${holder.name}.`);

  if (result.status === "success" && mintedTokenId !== null) {
    try {
      await recordEquipment({ tokenId: mintedTokenId, name, serial, metadataHash });
      revalidateConsole();
    } catch (error) {
      // A mint cannot be undone, so this degrades rather than pretends: the
      // token exists and the asset lists will show it as "Item #N" until the
      // description is recorded. Saying so beats silently losing the name.
      console.error("[mint] could not record the equipment description", error);
      return {
        status: "error",
        message:
          `The equipment was added to the shared record as item #${mintedTokenId}, ` +
          "but its name and serial number could not be saved. It will show as " +
          "unnamed until that is fixed.",
      };
    }
  }

  return result;
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
    `Item #${tokenId} handed to ${to.name}.`,
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
async function readPhoto(formData: FormData): Promise<
  { ok: true; dataUrl: string | null } | { ok: false; message: string }
> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: true, dataUrl: null };

  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "The photo must be an image file." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      message: "That photo is too large. Please use one under 2MB.",
    };
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
    const addressIndex = await freeAddressIndex(deployment.contracts.IdentityRegistry);
    created = await addPerson({
      name,
      title: title || "Unassigned",
      photo: photo.dataUrl,
      addressIndex,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not create the person record.",
    };
  }

  // The staff record had to be written first, because the chain needs the
  // address it allocates. So if the chain then refuses, take it back out:
  // otherwise the console reports "nothing has changed" while a person sits in
  // the staff table with no identity on the shared record.
  const result = await attempt(async () => {
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

  if (result.status !== "success") {
    try {
      await removePerson(created.id);
    } catch (cleanupError) {
      // Say so rather than swallowing it: an orphaned row is exactly the state
      // the rollback exists to prevent, and the operator needs to know.
      console.error("[onboard] could not roll back the staff record", cleanupError);
    }
    revalidateConsole();
  }

  return result;
}
