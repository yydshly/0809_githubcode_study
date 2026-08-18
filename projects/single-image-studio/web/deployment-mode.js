export const DEPLOYMENT_MODES = Object.freeze({
  LOCAL_SERVICE: "local-service",
  PUBLIC_LOCAL_ONLY: "public-local-only",
  PUBLIC_HYBRID: "public-hybrid",
});

export function deploymentMode(documentElement = globalThis.document?.documentElement) {
  const mode = documentElement?.dataset?.deploymentMode;
  return new Set([DEPLOYMENT_MODES.PUBLIC_LOCAL_ONLY, DEPLOYMENT_MODES.PUBLIC_HYBRID]).has(mode)
    ? mode
    : DEPLOYMENT_MODES.LOCAL_SERVICE;
}

export function isPublicLocalOnly(documentElement = globalThis.document?.documentElement) {
  return deploymentMode(documentElement) === DEPLOYMENT_MODES.PUBLIC_LOCAL_ONLY;
}

export function isPublicHybrid(documentElement = globalThis.document?.documentElement) {
  return deploymentMode(documentElement) === DEPLOYMENT_MODES.PUBLIC_HYBRID;
}
