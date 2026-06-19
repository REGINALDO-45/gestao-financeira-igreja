// jsPDF loader — injects CDN once, caches on window.jspdf
export const getJsPDF = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf?.jsPDF) return resolve((window as any).jspdf.jsPDF);
    if ((window as any).jsPDF) return resolve((window as any).jsPDF);

    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.crossOrigin = "anonymous";
    s.onload = () => {
      const ctor = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
      if (ctor) resolve(ctor);
      else reject(new Error("jsPDF não encontrado após carregamento do script."));
    };
    s.onerror = () => reject(new Error("Falha ao baixar jsPDF. Verifique sua conexão."));
    document.head.appendChild(s);
  });
};

export const wrapText = (doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

// Colour palette
export const NAVY  = [15, 44, 89]   as [number, number, number];
export const RED   = [196, 30, 58]  as [number, number, number];
export const GRAY1 = [30, 41, 59]   as [number, number, number];
export const GRAY2 = [71, 85, 105]  as [number, number, number];
export const GRAY3 = [148, 163, 184] as [number, number, number];
export const LIGHT = [248, 250, 252] as [number, number, number];
export const WHITE = [255, 255, 255] as [number, number, number];
export const GREEN = [22, 163, 74]  as [number, number, number];
export const GOLD  = [242, 169, 0]  as [number, number, number];

export const filledRect = (doc: any, x: number, y: number, w: number, h: number, color: [number,number,number]) => {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, "F");
};

export const cardBox = (doc: any, x: number, y: number, w: number, h: number, fill: [number,number,number] = LIGHT) => {
  filledRect(doc, x, y, w, h, fill);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "S");
};

export const brl = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FLAME = [217, 33, 38]  as [number, number, number];
const INK   = [35, 35, 39]   as [number, number, number];

export const drawLogo = (doc: any, x: number, y: number, size: number = 12) => {
  const w = size;
  const h = size * 1.32;
  doc.setFillColor(...FLAME);
  const baseX = x + w * 0.20;
  const baseY = y + h * 0.93;
  doc.lines(
    [
      [-w * 0.22, -h * 0.16, -w * 0.12, -h * 0.52, w * 0.14, -h * 0.75],
      [w * 0.24, h * 0.17, w * 0.07, h * 0.32, -w * 0.015, h * 0.39],
      [-w * 0.095, h * 0.095, -w * 0.06, h * 0.205, 0, h * 0.32],
    ],
    baseX,
    baseY,
    [1, 1],
    "F",
    true
  );
  doc.setFillColor(...INK);
  const barT    = w * 0.085;
  const crossCX = x + w * 0.64;
  const vTop    = y + h * 0.05;
  const vLen    = h * 0.93;
  doc.rect(crossCX - barT / 2, vTop, barT, vLen, "F");
  const hBarW = w * 0.42;
  doc.rect(crossCX - hBarW / 2, vTop + vLen * 0.20, hBarW, barT, "F");
};

// Loads a remote/local image (logo) and converts it to a data URL usable by jsPDF.addImage
const blobToDataUrl = (blob: Blob): Promise<{ dataUrl: string; format: string } | null> => {
  if (!blob.type.startsWith("image/")) return Promise.resolve(null);
  const format = blob.type.includes("png")
    ? "PNG"
    : blob.type.includes("webp")
    ? "WEBP"
    : "JPEG";
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: reader.result as string, format });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

export const loadImageDataUrl = async (url: string): Promise<{ dataUrl: string; format: string } | null> => {
  // Try direct fetch first (works for same-origin / CORS-enabled URLs)
  try {
    const res = await fetch(url);
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.startsWith("image/")) {
        const result = await blobToDataUrl(await res.blob());
        if (result) return result;
      }
    }
  } catch {
    // CORS or network error — try proxy
  }

  // Fallback: fetch via server-side proxy to avoid CORS
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
};

// Draws the church's configured logo (from churchSettings.logoUrl) when available,
// falling back to the generated vector logo otherwise.
export const drawLogoOrImage = async (
  doc: any,
  x: number,
  y: number,
  size: number,
  logoUrl?: string | null
) => {
  if (logoUrl) {
    const img = await loadImageDataUrl(logoUrl);
    if (img) {
      try {
        const h = size * 1.32;
        let w = h;
        const props = doc.getImageProperties?.(img.dataUrl);
        if (props?.width && props?.height) {
          w = h * (props.width / props.height);
        }
        doc.addImage(img.dataUrl, img.format, x, y, w, h);
        return;
      } catch {
        // fall through to vector logo on any rendering error
      }
    }
  }
  drawLogo(doc, x, y, size);
};

export const sectionHeader = (doc: any, x: number, y: number, w: number, title: string) => {
  filledRect(doc, x, y, w, 7.5, NAVY);
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), x + 3, y + 5.2);
  doc.setTextColor(...GRAY1);
};

export const iconBadgeBase = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number]) => {
  doc.setFillColor(...bg);
  doc.circle(cx, cy, r, "F");
};

export const iconPerson = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const headR = r * 0.26;
  doc.circle(cx, cy - r * 0.32, headR, "F");
  const sw = r * 0.85;
  const nw = r * 0.34;
  const topY = cy + r * 0.06;
  const botY = cy + r * 0.62;
  doc.triangle(cx - nw, topY, cx + nw, topY, cx - sw, botY, "F");
  doc.triangle(cx + nw, topY, cx - sw, botY, cx + sw, botY, "F");
};

export const iconHeart = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const lobeR = r * 0.26;
  const offX = r * 0.27;
  const lobeY = cy - r * 0.16;
  doc.circle(cx - offX, lobeY, lobeR, "F");
  doc.circle(cx + offX, lobeY, lobeR, "F");
  doc.triangle(cx - r * 0.53, lobeY, cx + r * 0.53, lobeY, cx, cy + r * 0.5, "F");
};

export const iconHandHeart = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const lobeR = r * 0.18;
  const offX = r * 0.18;
  const lobeY = cy - r * 0.4;
  doc.circle(cx - offX, lobeY, lobeR, "F");
  doc.circle(cx + offX, lobeY, lobeR, "F");
  doc.triangle(cx - r * 0.36, lobeY, cx + r * 0.36, lobeY, cx, cy - r * 0.04, "F");
  const handY = cy + r * 0.32;
  doc.triangle(cx - r * 0.6, handY, cx, handY - r * 0.2, cx, handY + r * 0.2, "F");
  doc.triangle(cx + r * 0.6, handY, cx, handY - r * 0.2, cx, handY + r * 0.2, "F");
};

export const iconCalendar = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const w = r * 1.1;
  const h = r * 0.95;
  const x = cx - w / 2;
  const y = cy - h / 2 + r * 0.08;
  doc.rect(x, y, w, h, "F");
  doc.setFillColor(...bg);
  doc.rect(x + w * 0.12, y + h * 0.28, w * 0.76, h * 0.16, "F");
  doc.setFillColor(...fg);
  doc.rect(x - r * 0.05, y - r * 0.18, r * 0.16, r * 0.26, "F");
  doc.rect(x + w - r * 0.11, y - r * 0.18, r * 0.16, r * 0.26, "F");
};

export const iconBank = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const baseW = r * 1.3;
  const baseY = cy + r * 0.42;
  doc.rect(cx - baseW / 2, baseY, baseW, r * 0.16, "F");
  doc.triangle(cx - baseW / 2, baseY, cx + baseW / 2, baseY, cx, cy - r * 0.5, "F");
  const colW = r * 0.16;
  const colY = cy - r * 0.06;
  const colH = baseY - colY;
  for (let i = -1; i <= 1; i++) {
    doc.rect(cx + i * (baseW * 0.32) - colW / 2, colY, colW, colH, "F");
  }
};

export const iconWallet = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const w = r * 1.2;
  const h = r * 0.8;
  const x = cx - w / 2;
  const y = cy - h / 2;
  doc.rect(x, y, w, h, "F");
  doc.setFillColor(...bg);
  doc.rect(x + w * 0.62, y + h * 0.32, w * 0.3, h * 0.36, "F");
  doc.setFillColor(...fg);
  doc.circle(x + w * 0.78, y + h * 0.5, r * 0.07, "F");
};

export const iconArrowDown = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const sw = r * 0.22;
  doc.rect(cx - sw / 2, cy - r * 0.5, sw, r * 0.65, "F");
  doc.triangle(cx - r * 0.4, cy + r * 0.05, cx + r * 0.4, cy + r * 0.05, cx, cy + r * 0.55, "F");
};

export const iconArrowUp = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const sw = r * 0.22;
  doc.rect(cx - sw / 2, cy - r * 0.15, sw, r * 0.65, "F");
  doc.triangle(cx - r * 0.4, cy - r * 0.05, cx + r * 0.4, cy - r * 0.05, cx, cy - r * 0.55, "F");
};

export const iconCross = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const barT = r * 0.32;
  const barL = r * 1.25;
  doc.rect(cx - barT / 2, cy - barL / 2, barT, barL, "F");
  doc.rect(cx - barL / 2, cy - barL * 0.18 - barT / 2, barL, barT, "F");
};

export const tableRow = (
  doc: any,
  x: number, y: number, w: number,
  cols: { text: string; width: number; align?: "left" | "right" }[],
  isOdd: boolean,
  isBold: boolean = false,
  rowBg?: [number,number,number],
  rowH: number = 6
) => {
  const h = rowH;
  if (rowBg) filledRect(doc, x, y, w, h, rowBg);
  else if (isOdd) filledRect(doc, x, y, w, h, LIGHT);
  else filledRect(doc, x, y, w, h, WHITE);

  doc.setFontSize(9);
  doc.setFont("helvetica", isBold ? "bold" : "normal");
  doc.setTextColor(...GRAY1);

  const baseline = y + h / 2 + 1.5;
  let cx = x + 2;
  for (const col of cols) {
    if (col.align === "right") {
      doc.text(col.text, cx + col.width - 2, baseline, { align: "right" });
    } else {
      doc.text(col.text, cx + 1, baseline);
    }
    cx += col.width;
  }
};
