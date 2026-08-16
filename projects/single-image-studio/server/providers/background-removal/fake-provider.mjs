import { assertBackgroundRemovalProvider } from "./provider.mjs";

export function createFakeBackgroundRemovalProvider({
  id = "fake.background-removal",
  version = "0.1.0",
  removeBackground,
} = {}) {
  if (typeof removeBackground !== "function") {
    throw new TypeError("fake background removal provider requires removeBackground");
  }
  const provider = Object.freeze({
    id,
    version,
    mode: "fake",
    removeBackground,
  });
  assertBackgroundRemovalProvider(provider);
  return provider;
}
