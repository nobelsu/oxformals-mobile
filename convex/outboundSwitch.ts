/**
 * Set OUTBOUND_DISABLED=1 on a deployment to stop it emailing or pushing
 * anyone (sign-in codes still send). For a dev deployment that holds copies
 * of real accounts, so testing there reaches nobody.
 */
export function outboundDisabled(): boolean {
  const value = process.env.OUTBOUND_DISABLED;
  return value === "1" || value === "true";
}
