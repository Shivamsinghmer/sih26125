"use server";

import { revalidatePath } from "next/cache";
import type { Hex } from "viem";

import { assetTokenAbi, explainContractError, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";
import { Role, didFromAddress, issueRoleCredential } from "@sih26125/identity";

import { type ActionResult } from "./action-types";
import {
  personaById,
  publicClient,
  readDeployment,
  walletFor,
  type Persona,
} from "./chain";

const DAY = 86_400;
const now = () => Math.floor(Date.now() / 1000);

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
    revalidatePath("/");
    return {
      status: "success",
      message: successMessage,
      hash: receipt.transactionHash,
    };
  } catch (error) {
    const explained = explainContractError(error);
    if (explained.reason !== "unknown") {
      revalidatePath("/");
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
 * Put the chain into the state the demo opens from: three identities registered,
 * a Manager and a User credential issued, and one asset minted.
 */
export async function seedDemo(): Promise<ActionResult> {
  const deployment = requireDeployment();
  const admin = personaById("admin");
  const manager = personaById("manager");
  const user = personaById("user");
  const expiry = BigInt(now() + 30 * DAY);

  return attempt(async () => {
    for (const persona of [admin, manager, user]) {
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
  const admin = personaById("admin");
  const subject = personaById(String(formData.get("persona")));
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
  const admin = personaById("admin");
  const subject = personaById(String(formData.get("persona")));
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
  const admin = personaById("admin");
  const holder = personaById(String(formData.get("persona")));
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
  const from = personaById(String(formData.get("from")));
  const to = personaById(String(formData.get("to")));
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

/** Issue a W3C Verifiable Credential the holder keeps, alongside the on-chain grant. */
export async function issueCredentialAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const deployment = requireDeployment();
  const admin = personaById("admin");
  const subject = personaById(String(formData.get("persona")));
  const role = Number(formData.get("role")) as Role;

  try {
    const jwt = await issueRoleCredential({
      issuerPrivateKey: admin.privateKey,
      issuerAddress: admin.address,
      subjectAddress: subject.address,
      role,
      chainId: deployment.chainId,
      roleRegistryAddress: deployment.contracts.RoleRegistry,
      expiresAt: now() + 30 * DAY,
    });
    return {
      status: "success",
      message: `Verifiable Credential issued to ${subject.name} (${jwt.length} bytes, held off chain).`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not issue credential.",
    };
  }
}

/** Form-action shape for `seedDemo`, for use with `useActionState`. */
export async function seedDemoAction(
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  return seedDemo();
}
