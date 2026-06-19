import type { Express } from "express";

export function registerImageProxy(app: Express) {
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string | undefined;
    if (!url) {
      res.status(400).send("Missing url parameter");
      return;
    }

    try {
      new URL(url);
    } catch {
      res.status(400).send("Invalid url");
      return;
    }

    try {
      const response = await fetch(url);
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
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch {
      res.status(502).send("Failed to fetch image");
    }
  });
}
