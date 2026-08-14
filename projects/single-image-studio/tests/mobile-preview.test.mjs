import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseLanAddress,
  listLanCandidates,
} from "../scripts/mobile-preview.mjs";

const interfaces = {
  "vEthernet (WSL)": [{ address: "172.28.96.1", family: "IPv4", internal: false }],
  Ethernet: [{ address: "192.168.5.90", family: "IPv4", internal: false }],
  WLAN: [{ address: "192.168.5.84", family: "IPv4", internal: false }],
  Loopback: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
  Public: [{ address: "203.0.113.12", family: "IPv4", internal: false }],
};

test("mobile preview ignores virtual and public adapters and prefers Wi-Fi", () => {
  assert.deepEqual(
    listLanCandidates(interfaces).map(({ name, address }) => ({ name, address })),
    [
      { name: "WLAN", address: "192.168.5.84" },
      { name: "Ethernet", address: "192.168.5.90" },
    ],
  );
  assert.equal(chooseLanAddress({}, interfaces), "192.168.5.84");
});

test("a private explicit LAN address is accepted and a public one is rejected", () => {
  assert.equal(
    chooseLanAddress({ SINGLE_IMAGE_STUDIO_LAN_IP: "10.12.0.5" }, interfaces),
    "10.12.0.5",
  );
  assert.throws(
    () => chooseLanAddress({ SINGLE_IMAGE_STUDIO_LAN_IP: "8.8.8.8" }, interfaces),
    /私网 IPv4/,
  );
});

test("mobile preview fails clearly when no private adapter is available", () => {
  assert.throws(
    () => chooseLanAddress({}, {
      Public: [{ address: "203.0.113.12", family: "IPv4", internal: false }],
    }),
    /没有找到可用/,
  );
});
