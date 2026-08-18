export const DEPLOYMENT_MODES = Object.freeze({
  LOCAL_SERVICE: "local-service",
  PUBLIC_LOCAL_ONLY: "public-local-only",
});

export function deploymentMode(documentElement = globalThis.document?.documentElement) {
  return documentElement?.dataset?.deploymentMode === DEPLOYMENT_MODES.PUBLIC_LOCAL_ONLY
    ? DEPLOYMENT_MODES.PUBLIC_LOCAL_ONLY
    : DEPLOYMENT_MODES.LOCAL_SERVICE;
}

export function isPublicLocalOnly(documentElement = globalThis.document?.documentElement) {
  return deploymentMode(documentElement) === DEPLOYMENT_MODES.PUBLIC_LOCAL_ONLY;
}
