export { Role, ROLE_NAMES, roleName, roleFromName } from "./roles.js";
export {
  didFromAddress,
  addressFromDid,
  chainIdFromDid,
  isSupportedDid,
} from "./did.js";
export { createOfflineEthrResolver } from "./resolver.js";
export {
  ROLE_CREDENTIAL_TYPE,
  issueRoleCredential,
  verifyRoleCredential,
  type OnChainRoleStatus,
  type IssueRoleCredentialInput,
  type VerifiedRoleCredential,
} from "./credential.js";
export {
  signAttestation,
  verifyAttestation,
  type SignAttestationInput,
  type VerifiedAttestation,
} from "./attestation.js";
