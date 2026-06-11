/**
 * Network helpers — LAN IP detection.
 *
 * Used by:
 *   - server/index.js to log the LAN URL on startup
 *   - server/routes/system.js to power the Mobile Setup QR code
 *
 * Skips VPN tunnels, virtual interfaces, and common Docker/internal ranges
 * so we surface the actual home Wi-Fi / Ethernet address — not a Tailscale
 * tunnel or `100.64.x.x` carrier-grade NAT range.
 */

const os = require("os");

// Adapter name prefixes / substrings to skip — VPN tunnels and virtual interfaces.
const SKIP_ADAPTERS = [
  "nordlynx", "wg", "tun", "tap", "tailscale",
  "docker", "veth", "br-", "vmnet", "vboxnet", "virbr", "lo",
];

// IP ranges to skip — known VPN / virtual / link-local ranges.
const SKIP_IP_PREFIXES = [
  "10.5.", "10.2.", "100.64.", "172.17.", "172.18.", "169.254.", "127.",
];

/**
 * Get the best-guess LAN IPv4 address of this machine.
 * Returns "0.0.0.0" if nothing usable is found.
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    const nameLower = name.toLowerCase();
    if (SKIP_ADAPTERS.some((s) => nameLower.startsWith(s))) continue;

    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      if (SKIP_IP_PREFIXES.some((p) => addr.address.startsWith(p))) continue;

      // Priority: Ethernet (1) > Wi-Fi (2) > Other (5)
      let priority = 5;
      if (
        nameLower.startsWith("eth") ||
        nameLower.startsWith("en") ||
        nameLower.includes("ethernet") ||
        nameLower.includes("local area connection")
      ) {
        priority = 1;
      } else if (
        nameLower.startsWith("wl") ||
        nameLower.includes("wi-fi") ||
        nameLower.includes("wifi") ||
        nameLower.includes("wireless")
      ) {
        priority = 2;
      }

      candidates.push({ address: addr.address, priority, name });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  if (candidates.length > 0) return candidates[0].address;
  return "0.0.0.0";
}

/**
 * Build the LAN URL family devices should use to reach Kinward.
 * Returns null if no usable LAN IP was found.
 */
function getLanUrl(port) {
  const ip = getLocalIP();
  if (!ip || ip === "0.0.0.0") return null;
  return `http://${ip}:${port}`;
}

module.exports = { getLocalIP, getLanUrl };
