import type { Express } from "express";
import dns from "dns";
import net from "net";

const lookup = dns.promises.lookup;

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1" || // loopback
      lower.startsWith("fe80:") || // link-local
      lower.startsWith("fc") || // unique local
      lower.startsWith("fd") || // unique local
      lower === "::" ||
      lower.startsWith("::ffff:127.") || // IPv4-mapped loopback
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:169.254.")
    );
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // unknown format, block

  const [a, b] = parts;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8 (private)
    a === 127 || // 127.0.0.0/8 (loopback)
    (a === 169 && b === 254) || // 169.254.0.0/16 (link-local / cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (private)
    (a === 192 && b === 168) || // 192.168.0.0/16 (private)
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 (shared/CGNAT)
    a >= 224 // multicast/reserved
  );
}

async function isUrlSafe(parsed: URL): Promise<boolean> {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.hostname === "localhost") return false;

  try {
    const { address } = await lookup(parsed.hostname);
    return !isPrivateOrReservedIp(address);
  } catch {
    return false; // DNS resolution failure — treat as unsafe
  }
}

export function registerImageProxy(app: Express) {
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string | undefined;
    if (!url) {
      res.status(400).send("Missing url parameter");
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      res.status(400).send("Invalid url");
      return;
    }

    if (!(await isUrlSafe(parsed))) {
      res.status(400).send("URL not allowed");
      return;
    }

    try {
      const response = await fetch(parsed.toString(), { redirect: "error" });
      if (!response.ok) {
        res.status(response.status).send("Upstream error");
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        res.status(400).send("URL does not point to an image");
        return;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 5 * 1024 * 1024) {
        res.status(413).send("Image too large");
        return;
      }

      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch {
      res.status(502).send("Failed to fetch image");
    }
  });
}
