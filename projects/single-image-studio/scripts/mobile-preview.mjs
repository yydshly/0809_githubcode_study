import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  isPrivateIpv4,
  startConfiguredServer,
} from "../server/server.mjs";

const VIRTUAL_INTERFACE = /vmware|vmnet|virtual|^vEthernet|wsl|docker|hyper-v|loopback|tunnel|mihomo|tailscale|zerotier/i;
const WIFI_INTERFACE = /wlan|wi[ -]?fi|wireless/i;
const WIRED_INTERFACE = /ethernet|以太网/i;

function addressScore(name) {
  if (VIRTUAL_INTERFACE.test(name)) return -100;
  if (WIFI_INTERFACE.test(name)) return 30;
  if (WIRED_INTERFACE.test(name)) return 20;
  return 10;
}

export function listLanCandidates(interfaces = networkInterfaces()) {
  return Object.entries(interfaces)
    .flatMap(([name, addresses = []]) => addresses.map((address) => ({ name, ...address })))
    .filter((address) => (
      address.family === "IPv4"
      && address.internal !== true
      && isPrivateIpv4(address.address)
      && addressScore(address.name) >= 0
    ))
    .sort((left, right) => addressScore(right.name) - addressScore(left.name));
}

export function chooseLanAddress(env = process.env, interfaces = networkInterfaces()) {
  const override = String(env.SINGLE_IMAGE_STUDIO_LAN_IP ?? "").trim();
  if (override) {
    if (!isPrivateIpv4(override)) {
      throw new Error("SINGLE_IMAGE_STUDIO_LAN_IP 必须是明确的私网 IPv4 地址");
    }
    return override;
  }

  const [candidate] = listLanCandidates(interfaces);
  if (!candidate) {
    throw new Error("没有找到可用的 Wi-Fi / 私网 IPv4；请先连接同一 Wi-Fi");
  }
  return candidate.address;
}

export function startMobilePreview(env = process.env, interfaces = networkInterfaces()) {
  const bindHost = chooseLanAddress(env, interfaces);
  return startConfiguredServer({
    ...env,
    OPENAI_API_KEY: "",
    SINGLE_IMAGE_STUDIO_ALLOW_LAN: "1",
    SINGLE_IMAGE_STUDIO_BIND_HOST: bindHost,
  });
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(modulePath)) {
  try {
    const { config, listening } = startMobilePreview();
    await listening;
    console.log("");
    console.log("手机请连接同一 Wi-Fi，然后打开：");
    console.log(`http://${config.bindHost}:${config.port}/`);
    console.log("仅限可信私人 Wi-Fi 与非敏感测试图片；按 Ctrl+C 关闭临时链接。");
  } catch (error) {
    console.error(`手机预览无法启动：${error.message}`);
    process.exitCode = 1;
  }
}
