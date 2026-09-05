import { ES256KSigner } from "did-jwt";
import {
  createVerifiableCredentialJwt,
  verifyCredential,
  type JwtCredentialPayload,
} from "did-jwt-vc";
import type { Resolvable } from "did-resolver";

import { addressFromDid, didFromAddress } from "./did.js";
import { createOfflineEthrResolver } from "./resolver.js";
import { Role, roleName } from "./roles.js";

/** JSON-LD type marker for the credentials this system issues. */
export const ROLE_CREDENTIAL_TYPE = "BelRoleCredential";

/**
 * Credential status pointing at the on-chain RoleRegistry.
 *
 * The credential itself is held by the subject; only its *status* is anchored on
 * chain. Verification is therefore two independent steps — check the signature
 * (offline, here) and check the status (on chain, by the caller). Keeping them
 * separate is what lets the offline verifier state precisely what it could and
 * could not confirm, and how old its status snapshot is.
 */
export interface OnChainRoleStatus {
  type: "OnChainRoleRegistry2026";
  /** Address of the deployed RoleRegistry contract. */
  registry: string;
  /** Account whose grant is being asserted. */
  account: string;
  /** Numeric role id, matching RoleRegistry.Role in Solidity. */
  roleId: Role;
}

export interface IssueRoleCredentialInput {
  /** 0x-prefixed secp256k1 private key of the issuing authority. */
  issuerPrivateKey: string;
  /** Address controlled by `issuerPrivateKey`. */
  issuerAddress: string;
  /** Address of the employee or vendor receiving the role. */
  subjectAddress: string;
  role: Role;
  /** Chain the identities live on — 31337 for Hardhat, or the Besu chain id. */
  chainId: number;
  /** Address of the deployed RoleRegistry, recorded as the credential's status anchor. */
  roleRegistryAddress: string;
  /** Unix seconds. Must match the expiry written to RoleRegistry on chain. */
  expiresAt: number;
  /** Unix seconds; defaults to now. */
  issuedAt?: number;
}

export interface VerifiedRoleCredential {
  jwt: string;
  issuerDid: string;
  subjectDid: string;
  subjectAddress: string;
  role: Role;
  roleName: string;
  issuedAt: number;
  expiresAt: number;
  status: OnChainRoleStatus;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error("Private key must be valid hex");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Issue a W3C Verifiable Credential asserting that `subjectAddress` holds `role`
 * until `expiresAt`, signed by the issuing authority.
 *
 * Signed with ES256K-R (recoverable) so a verifier can recover the signing address
 * and match it against the DID's `blockchainAccountId` without ever fetching a
 * public key.
 */
export async function issueRoleCredential(
  input: IssueRoleCredentialInput,
): Promise<string> {
  if (input.role === Role.None) {
    throw new Error("Cannot issue a credential for Role.None");
  }

  const issuedAt = input.issuedAt ?? Math.floor(Date.now() / 1000);
  if (input.expiresAt <= issuedAt) {
    throw new Error(
      `Credential expiry (${input.expiresAt}) must be after issuance (${issuedAt})`,
    );
  }

  const issuerDid = didFromAddress(input.issuerAddress, input.chainId);
  const subjectDid = didFromAddress(input.subjectAddress, input.chainId);

  const status: OnChainRoleStatus = {
    type: "OnChainRoleRegistry2026",
    registry: input.roleRegistryAddress.toLowerCase(),
    account: input.subjectAddress.toLowerCase(),
    roleId: input.role,
  };

  const payload: JwtCredentialPayload = {
    sub: subjectDid,
    nbf: issuedAt,
    exp: input.expiresAt,
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", ROLE_CREDENTIAL_TYPE],
      credentialSubject: {
        role: roleName(input.role),
        roleId: input.role,
      },
      credentialStatus: {
        // `id` is required by the VC data model; ours addresses a contract slot
        // rather than a URL, since there is no status endpoint to fetch.
        id: `${status.registry}#${status.account}#${status.roleId}`,
        ...status,
      },
    },
  };

  return createVerifiableCredentialJwt(payload, {
    did: issuerDid,
    signer: ES256KSigner(hexToBytes(input.issuerPrivateKey), true),
    alg: "ES256K-R",
  });
}

/**
 * Verify a role credential's signature, structure and validity window.
 *
 * This does NOT consult the chain — a credential that verifies here may still have
 * been revoked. Callers must additionally check `result.status` against the
 * RoleRegistry. That split is intentional; see `OnChainRoleStatus`.
 */
export async function verifyRoleCredential(
  jwt: string,
  options: { resolver?: Resolvable } = {},
): Promise<VerifiedRoleCredential> {
  const resolver = options.resolver ?? createOfflineEthrResolver();
  const verified = await verifyCredential(jwt, resolver);

  const vc = verified.verifiableCredential;
  const types = vc.type ?? [];
  if (!types.includes(ROLE_CREDENTIAL_TYPE)) {
    throw new Error(
      `Not a ${ROLE_CREDENTIAL_TYPE}: credential types are [${types.join(", ")}]`,
    );
  }

  const subjectDid = verified.payload.sub;
  if (typeof subjectDid !== "string") {
    throw new Error("Credential has no subject DID");
  }

  const subject = vc.credentialSubject as { roleId?: unknown };
  const roleId = Number(subject.roleId);
  if (!Number.isInteger(roleId) || roleId <= Role.None || roleId > Role.Admin) {
    throw new Error(`Credential carries an invalid roleId: ${String(subject.roleId)}`);
  }

  const rawStatus = vc.credentialStatus as unknown as Partial<OnChainRoleStatus> | undefined;
  if (!rawStatus || rawStatus.type !== "OnChainRoleRegistry2026") {
    throw new Error("Credential is missing an on-chain RoleRegistry status anchor");
  }
  if (!rawStatus.registry || !rawStatus.account) {
    throw new Error("Credential status anchor is incomplete");
  }
  if (rawStatus.roleId !== roleId) {
    throw new Error(
      `Credential status roleId (${String(rawStatus.roleId)}) disagrees with subject roleId (${roleId})`,
    );
  }

  const expiresAt = Number(verified.payload.exp);
  const issuedAt = Number(verified.payload.nbf);
  if (!Number.isFinite(expiresAt)) {
    throw new Error("Credential has no expiry; refusing to treat it as valid");
  }

  return {
    jwt,
    issuerDid: verified.issuer,
    subjectDid,
    subjectAddress: addressFromDid(subjectDid),
    role: roleId as Role,
    roleName: roleName(roleId as Role),
    issuedAt,
    expiresAt,
    status: {
      type: "OnChainRoleRegistry2026",
      registry: rawStatus.registry,
      account: rawStatus.account,
      roleId: roleId as Role,
    },
  };
}
