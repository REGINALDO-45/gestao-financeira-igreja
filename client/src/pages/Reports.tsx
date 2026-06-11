import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, FileText, Settings2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import logoCruzChama from "../assets/logo-cruz-chama.png";

// ─────────────────────────────────────────────────────────
// Logo image loader — loads and caches the official Cross and Flame
// artwork so it can be embedded (pasted) into the PDF via addImage.
// ─────────────────────────────────────────────────────────
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (src: string): Promise<HTMLImageElement> => {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
};

// Draws an image preserving its aspect ratio, fitted to the given height.
// Returns the resulting width so callers can position adjacent text.
const drawLogoImage = (doc: any, img: HTMLImageElement, x: number, y: number, h: number): number => {
  const w = h * (img.naturalWidth / img.naturalHeight);
  doc.addImage(img, "PNG", x, y, w, h);
  return w;
};

// ─────────────────────────────────────────────────────────
// jsPDF loader — injects CDN once, caches on window.jspdf
// ─────────────────────────────────────────────────────────
const getJsPDF = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Already loaded?
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

// ─────────────────────────────────────────────────────────
// Helper to draw wrapped text and return next Y position
// ─────────────────────────────────────────────────────────
const wrapText = (doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

// ─────────────────────────────────────────────────────────
// Colour palette
// ─────────────────────────────────────────────────────────
const NAVY  = [15, 44, 89]   as [number, number, number];
const RED   = [196, 30, 58]  as [number, number, number];
const GRAY1 = [30, 41, 59]   as [number, number, number];
const GRAY2 = [71, 85, 105]  as [number, number, number];
const GRAY3 = [148, 163, 184] as [number, number, number];
const LIGHT = [248, 250, 252] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const GREEN = [22, 163, 74]  as [number, number, number];
const GOLD  = [242, 169, 0]  as [number, number, number];

// ─────────────────────────────────────────────────────────
// Draw a filled rounded rectangle (simple: use regular rect)
// ─────────────────────────────────────────────────────────
const filledRect = (doc: any, x: number, y: number, w: number, h: number, color: [number,number,number]) => {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, "F");
};

// ─────────────────────────────────────────────────────────
// Draw a bordered card background
// ─────────────────────────────────────────────────────────
const cardBox = (doc: any, x: number, y: number, w: number, h: number, fill: [number,number,number] = LIGHT) => {
  filledRect(doc, x, y, w, h, fill);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "S");
};

// ─────────────────────────────────────────────────────────
// Format number as Brazilian real
// ─────────────────────────────────────────────────────────
const brl = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────
// Section header line (navy bar + white title)
// ─────────────────────────────────────────────────────────
const sectionHeader = (doc: any, x: number, y: number, w: number, title: string) => {
  filledRect(doc, x, y, w, 7.5, NAVY);
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), x + 3, y + 5.2);
  doc.setTextColor(...GRAY1);
};

// ─────────────────────────────────────────────────────────
// Icon badges — circular bg + simple geometric glyph (drawing-primitives only)
// ─────────────────────────────────────────────────────────
const iconBadgeBase = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number]) => {
  doc.setFillColor(...bg);
  doc.circle(cx, cy, r, "F");
};

const iconPerson = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
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

const iconHeart = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const lobeR = r * 0.26;
  const offX = r * 0.27;
  const lobeY = cy - r * 0.16;
  doc.circle(cx - offX, lobeY, lobeR, "F");
  doc.circle(cx + offX, lobeY, lobeR, "F");
  doc.triangle(cx - r * 0.53, lobeY, cx + r * 0.53, lobeY, cx, cy + r * 0.5, "F");
};

const iconHandHeart = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
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

const iconCalendar = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
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

const iconBank = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
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

const iconWallet = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
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

const iconArrowDown = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const sw = r * 0.22;
  doc.rect(cx - sw / 2, cy - r * 0.5, sw, r * 0.65, "F");
  doc.triangle(cx - r * 0.4, cy + r * 0.05, cx + r * 0.4, cy + r * 0.05, cx, cy + r * 0.55, "F");
};

const iconArrowUp = (doc: any, cx: number, cy: number, r: number, bg: [number, number, number], fg: [number, number, number]) => {
  iconBadgeBase(doc, cx, cy, r, bg);
  doc.setFillColor(...fg);
  const sw = r * 0.22;
  doc.rect(cx - sw / 2, cy - r * 0.15, sw, r * 0.65, "F");
  doc.triangle(cx - r * 0.4, cy - r * 0.05, cx + r * 0.4, cy - r * 0.05, cx, cy - r * 0.55, "F");
};

// ─────────────────────────────────────────────────────────
// Table row painter
// ─────────────────────────────────────────────────────────
const tableRow = (
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

// ─────────────────────────────────────────────────────────
// REPORT 1 — Relatório de Entradas
// ─────────────────────────────────────────────────────────
const buildEntriesReport = async (
  tithes: { name: string; amount: number }[],
  offerings: { name: string; amount: number }[],
  refDate: string,
  depositDate: string,
  pastorName: string,
  treasurerName: string
) => {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const cruzChamaImg = await loadImage(logoCruzChama);

  const PW = 210; // page width mm
  const PHFOOTER = 283; // y where the colour footer band starts
  const ML = 14;  // margin left
  const MR = 14;  // margin right
  const W  = PW - ML - MR;
  let Y = 16;

  // ── HEADER ──
  const logoH = 21;
  const logoW = drawLogoImage(doc, cruzChamaImg, ML, Y - 2, logoH);
  const textX = ML + logoW + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Igreja Metodista", textX, Y + 2);
  doc.setFontSize(18);
  doc.text("Monte Alegre", textX, Y + 9);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Servir a Deus é transformar vidas!", textX, Y + 14.5);

  // right side title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("RELATÓRIO DE ENTRADAS", PW - MR, Y + 4, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text("DÍZIMOS E OFERTAS POR DOMINGO", PW - MR, Y + 10.5, { align: "right" });
  // red underline
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(PW - MR - 58, Y + 12.5, PW - MR, Y + 12.5);

  Y += 21;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, Y, PW - MR, Y);
  Y += 5;

  // ── METADATA CARDS (3 separate badge cards) ──
  const metaW = (W - 6) / 3;
  const metaH = 16;
  const metaBadgeR = 6;

  const metaCard = (ox: number, icon: typeof iconPerson, label: string, value: string) => {
    const bx = ML + ox;
    cardBox(doc, bx, Y, metaW, metaH, WHITE);
    const badgeCx = bx + 9;
    const badgeCy = Y + metaH / 2;
    icon(doc, badgeCx, badgeCy, metaBadgeR, NAVY, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY2);
    doc.text(label.toUpperCase(), badgeCx + metaBadgeR + 4, Y + 6.5);

    // shrink-to-fit: long names (e.g. "Rev. Marcos Aurélio de Souza") must not
    // spill past the card edge into the next badge
    const textX = badgeCx + metaBadgeR + 4;
    const availW = bx + metaW - textX - 3;
    doc.setFont("helvetica", "bold");
    let valueFontSize = 10;
    doc.setFontSize(valueFontSize);
    while (valueFontSize > 7 && doc.getTextWidth(value) > availW) {
      valueFontSize -= 0.5;
      doc.setFontSize(valueFontSize);
    }
    let displayValue = value;
    while (displayValue.length > 1 && doc.getTextWidth(displayValue + "…") > availW) {
      displayValue = displayValue.slice(0, -1);
    }
    if (displayValue !== value) displayValue += "…";
    doc.setTextColor(...GRAY1);
    doc.text(displayValue, textX, Y + 12);
  };

  metaCard(0, iconPerson, "Pastor", pastorName);
  metaCard(metaW + 3, iconPerson, "Tesoureira", treasurerName);
  metaCard((metaW + 3) * 2, iconCalendar, "Referência", refDate);

  Y += metaH + 5;

  // ── INTRO TEXT ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Relatório simplificado das entradas de dízimos e ofertas realizadas no culto de domingo.", ML, Y);
  Y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY1);
  doc.text("Valores a serem depositados na conta da igreja na segunda-feira.", ML, Y);
  Y += 10;

  const totalTithes   = tithes.reduce((s, e) => s + e.amount, 0);
  const totalOfferings = offerings.reduce((s, e) => s + e.amount, 0);
  const totalAll = totalTithes + totalOfferings;

  // ── TITHES TABLE ──
  const colNum = 14;
  const colVal = 36;
  const colName = W - colNum - colVal;
  const ROW_H = 7;
  const SEC_BADGE_R = 5;

  const sectionHeaderWithBadge = (secY: number, title: string, barColor: [number, number, number], icon: typeof iconPerson) => {
    filledRect(doc, ML, secY, W, 7.5, barColor);
    icon(doc, ML + SEC_BADGE_R, secY + 3.75, SEC_BADGE_R, barColor, WHITE);
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), ML + SEC_BADGE_R * 2 + 4, secY + 5.2);
    doc.setTextColor(...GRAY1);
  };

  sectionHeaderWithBadge(Y, "Dízimos", NAVY, iconHandHeart);
  Y += 8;

  // column headers
  filledRect(doc, ML, Y, W, 7, [226, 232, 240]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("#", ML + 3, Y + 4.8);
  doc.text("DIZIMISTA", ML + colNum + 2, Y + 4.8);
  doc.text("VALOR (R$)", PW - MR - 2, Y + 4.8, { align: "right" });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(ML, Y + 7, PW - MR, Y + 7);
  Y += 7;

  tithes.forEach((e, i) => {
    tableRow(doc, ML, Y, W, [
      { text: String(i + 1), width: colNum },
      { text: e.name, width: colName },
      { text: e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    ], i % 2 === 1, false, undefined, ROW_H);
    Y += ROW_H;
  });

  // Totals row — tithes (navy accent strip on the left)
  filledRect(doc, ML, Y, W, 7, [239, 246, 255]);
  filledRect(doc, ML, Y, 1.6, 7, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL DÍZIMOS", ML + colNum + 2, Y + 4.8);
  doc.text(totalTithes.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), PW - MR - 2, Y + 4.8, { align: "right" });
  Y += 12;

  // ── OFFERINGS TABLE ──
  sectionHeaderWithBadge(Y, "Ofertas", RED, iconHeart);
  Y += 8;

  // column headers
  filledRect(doc, ML, Y, W, 7, [226, 232, 240]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("#", ML + 3, Y + 4.8);
  doc.text("OFERTANTE", ML + colNum + 2, Y + 4.8);
  doc.text("VALOR (R$)", PW - MR - 2, Y + 4.8, { align: "right" });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(ML, Y + 7, PW - MR, Y + 7);
  Y += 7;

  offerings.forEach((e, i) => {
    tableRow(doc, ML, Y, W, [
      { text: String(i + 1), width: colNum },
      { text: e.name, width: colName },
      { text: e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    ], i % 2 === 1, false, undefined, ROW_H);
    Y += ROW_H;
  });

  // Totals row — offerings (red accent strip on the left)
  filledRect(doc, ML, Y, W, 7, [255, 242, 242]);
  filledRect(doc, ML, Y, 1.6, 7, RED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...RED);
  doc.text("TOTAL OFERTAS", ML + colNum + 2, Y + 4.8);
  doc.text(totalOfferings.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), PW - MR - 2, Y + 4.8, { align: "right" });
  Y += 14;

  // ── GRAND TOTAL CARD ──
  const cardH = 20;
  filledRect(doc, ML, Y, W, cardH, NAVY);
  iconBank(doc, ML + 13, Y + cardH / 2, 7, [30, 64, 110], WHITE);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL GERAL A SER DEPOSITADO NA SEGUNDA-FEIRA", ML + 26, Y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Data prevista do depósito: ${depositDate}`, ML + 26, Y + 14);

  // value box
  const valBoxW = 56;
  filledRect(doc, PW - MR - valBoxW, Y + 2.5, valBoxW, cardH - 5, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(brl(totalAll), PW - MR - 4, Y + cardH / 2 + 2, { align: "right" });
  Y += cardH + 9;

  // Minimalist closing (thin rule + cross badge + 2 lines) needs ~34mm above
  // the footer band. Start a fresh page if it wouldn't fit.
  const CLOSING_BLOCK_H = 34;
  if (Y + CLOSING_BLOCK_H > PHFOOTER - 4) {
    doc.addPage();
    // Anchor the block just above the footer band rather than at the page
    // top — a short closing block on an otherwise-empty page looks broken.
    Y = PHFOOTER - CLOSING_BLOCK_H - 6;
  }

  // ── MINIMALIST CLOSING ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML + 18, Y, PW - MR - 18, Y);
  {
    const closingLogoH = 9;
    const closingLogoW = closingLogoH * (cruzChamaImg.naturalWidth / cruzChamaImg.naturalHeight);
    doc.addImage(cruzChamaImg, "PNG", PW / 2 - closingLogoW / 2, Y - closingLogoH / 2, closingLogoW, closingLogoH);
  }
  Y += 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Obrigado pela fidelidade e generosidade!", PW / 2, Y, { align: "center" });
  Y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Deus abençoe a vida de cada um que contribui com alegria para a obra do Senhor.", PW / 2, Y, { align: "center" });

  // ── FOOTER BAND (fills the bottom whitespace with purposeful colour bar) ──
  filledRect(doc, 0, PHFOOTER, PW, 297 - PHFOOTER, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("IGREJA METODISTA MONTE ALEGRE", ML, PHFOOTER + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 226, 235);
  doc.text("Relatório de Entradas — Documento de uso interno e contábil.", ML, PHFOOTER + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(`Pastor: ${pastorName}  |  Tesoureira: ${treasurerName}`, PW - MR, PHFOOTER + 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 226, 235);
  doc.text(`Referência: ${refDate}`, PW - MR, PHFOOTER + 13, { align: "right" });

  return { doc, filename: `Relatorio_Entradas_${refDate.replace(/[\s,/]+/g, "_")}.pdf` };
};

// ─────────────────────────────────────────────────────────
// REPORT 2 — Relatório Financeiro-Clerical
// ─────────────────────────────────────────────────────────
const buildFinancialReport = async (data: {
  refDate: string;
  pastorName: string;
  treasurerName: string;
  totalEntries: number;
  totalExpenses: number;
  balance: number;
  balanceAvailable: number;
  dizimosTotal: number;
  ofertasTotal: number;
  ofertasEspeciaisTotal: number;
  bazarTotal: number;
  almocoTotal: number;
  outrasEntradasTotal: number;
  despesasFixasTotal: number;
  despesasMinisteriaisTotal: number;
  despesasAdminTotal: number;
  investimentosTotal: number;
}) => {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const cruzChamaImg = await loadImage(logoCruzChama);

  const PW = 210;
  const ML = 14;
  const MR = 14;
  const W  = PW - ML - MR;
  let Y = 14;

  // ── HEADER ──
  drawLogoImage(doc, cruzChamaImg, ML, Y - 2, 18.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("IGREJA METODISTA MONTE ALEGRE", ML + 18, Y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY2);
  doc.text("Transformando vidas, edificando o Reino de Deus.", ML + 18, Y + 12);

  // church icon on right side
  doc.setFillColor(...LIGHT);
  doc.rect(PW - MR - 30, Y - 2, 30, 18, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(PW - MR - 30, Y - 2, 30, 18, "S");
  // simple church silhouette in NAVY
  doc.setFillColor(...NAVY);
  const cx = PW - MR - 15;
  const cy = Y + 5;
  doc.triangle(cx - 8, cy + 6, cx, cy - 4, cx + 8, cy + 6, "F");
  doc.rect(cx - 4, cy + 6, 8, 6, "F");
  doc.setFillColor(...WHITE);
  doc.rect(cx - 1, cy + 8, 2, 4, "F");  // door

  Y += 22;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, Y, PW - MR, Y);
  Y += 4;

  // ── METADATA CARD ──
  cardBox(doc, ML, Y, W, 14, LIGHT);
  const mw = W / 3;

  const metaBlock = (label: string, value: string, offsetX: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY2);
    doc.text(label.toUpperCase(), ML + offsetX + 6, Y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY1);
    doc.text(value, ML + offsetX + 6, Y + 10);
  };

  metaBlock("Pastor", data.pastorName, 0);
  metaBlock("Tesoureira", data.treasurerName, mw);

  // Reference blue box
  filledRect(doc, ML + mw * 2 + 2, Y + 1, mw - 4, 12, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text("MÊS DE REFERÊNCIA", ML + mw * 2 + 5, Y + 5.5);
  doc.setFontSize(10);
  doc.text(data.refDate, ML + mw * 2 + 5, Y + 11);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(ML + mw, Y + 2, ML + mw, Y + 12);
  doc.line(ML + mw * 2, Y + 2, ML + mw * 2, Y + 12);

  Y += 22;

  // ── REPORT TITLE ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("RELATÓRIO FINANCEIRO-CLERICAL", ML, Y);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(ML, Y + 1.5, ML + 85, Y + 1.5);
  Y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY2);
  Y = wrapText(doc, "Este relatório apresenta o resumo das entradas, saídas e movimentações financeiras da Igreja Metodista Monte Alegre.", ML, Y, W, 4);
  Y += 6;

  // ── 4 KPI CARDS (with colour icon badges) ──
  const kpiW = (W - 9) / 4;
  const kpiH = 20;
  const kpis = [
    { label: "TOTAL DE ENTRADAS", value: brl(data.totalEntries), color: GREEN, sub: "▲ +12,5% vs Mês Ant.", icon: iconArrowDown },
    { label: "TOTAL DE SAÍDAS",   value: brl(data.totalExpenses), color: [220,38,38] as [number,number,number], sub: "▼ -8,2% vs Mês Ant.", icon: iconArrowUp },
    { label: "SALDO DO MÊS",      value: brl(data.balance), color: [59,130,246] as [number,number,number], sub: "Superávit", icon: iconWallet },
    { label: "SALDO DISPONÍVEL",  value: brl(data.balanceAvailable), color: [245,158,11] as [number,number,number], sub: "Caixa + Banco", icon: iconBank },
  ];

  kpis.forEach((kpi, i) => {
    const kx = ML + i * (kpiW + 3);
    cardBox(doc, kx, Y, kpiW, kpiH, WHITE);
    // coloured left strip
    filledRect(doc, kx, Y, 2, kpiH, kpi.color);
    // icon badge in the top-right corner of the card
    const badgeR = 4.5;
    kpi.icon(doc, kx + kpiW - badgeR - 3, Y + badgeR + 3, badgeR, kpi.color, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY2);
    doc.text(kpi.label, kx + 4, Y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + 4, Y + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY3);
    doc.text(kpi.sub, kx + 4, Y + 18);
  });
  Y += kpiH + 6;

  // ── MAIN GRID: Demonstrativo + Gráfico ──
  const leftW = W * 0.58;
  const rightW = W * 0.38;
  const gapX = ML + leftW + W * 0.04;

  // Left card — Demonstrativo Financeiro
  const demoRows = [
    { label: "1. Saldo Anterior (Mês Ant.)", value: "R$ 15.240,50", bold: true, bg: LIGHT },
    { label: "2. ENTRADAS", value: brl(data.totalEntries), bold: true, bg: [240,253,244] as [number,number,number], color: GREEN },
    { label: "  2.1 Dízimos",            value: brl(data.dizimosTotal), bold: false, bg: WHITE },
    { label: "  2.2 Ofertas",            value: brl(data.ofertasTotal), bold: false, bg: LIGHT },
    { label: "  2.3 Ofertas Especiais",  value: brl(data.ofertasEspeciaisTotal), bold: false, bg: WHITE },
    { label: "  2.4 Bazar",              value: brl(data.bazarTotal), bold: false, bg: LIGHT },
    { label: "  2.5 Almoço Beneficente", value: brl(data.almocoTotal), bold: false, bg: WHITE },
    { label: "  2.6 Outras Entradas",    value: brl(data.outrasEntradasTotal), bold: false, bg: LIGHT },
    { label: "3. SAÍDAS", value: brl(data.totalExpenses), bold: true, bg: [255,242,242] as [number,number,number], color: RED },
    { label: "  3.1 Despesas Fixas",        value: brl(data.despesasFixasTotal), bold: false, bg: WHITE },
    { label: "  3.2 Desp. Ministeriais",    value: brl(data.despesasMinisteriaisTotal), bold: false, bg: LIGHT },
    { label: "  3.3 Desp. Administrativas", value: brl(data.despesasAdminTotal), bold: false, bg: WHITE },
    { label: "  3.4 Investimentos",         value: brl(data.investimentosTotal), bold: false, bg: LIGHT },
    { label: "4. SALDO DO MÊS",     value: brl(data.balance),          bold: true, bg: [239,246,255] as [number,number,number], color: [30,58,138] as [number,number,number] },
    { label: "5. SALDO DISPONÍVEL", value: brl(data.balanceAvailable), bold: true, bg: [255,251,235] as [number,number,number], color: [120,53,15] as [number,number,number] },
  ];

  // Header
  filledRect(doc, ML, Y, leftW, 7, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("DEMONSTRATIVO FINANCEIRO", ML + 3, Y + 5);
  Y += 7;

  const valColW = 40;
  demoRows.forEach((row) => {
    const rh = 5.5;
    filledRect(doc, ML, Y, leftW, rh, row.bg as [number,number,number]);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...((row.color as [number,number,number]) || GRAY1));
    doc.text(row.label, ML + 2, Y + 4);
    doc.text(row.value, ML + leftW - 2, Y + 4, { align: "right" });
    Y += rh;
  });

  // Right card — Real pie/donut chart drawn via fan-triangulation (many thin
  // triangles from the centre to consecutive points along each slice's arc),
  // which renders smooth and solid — far cleaner than ring/bar approximations.
  const chartY = Y - (demoRows.length * 5.5 + 7);

  filledRect(doc, gapX, chartY, rightW, 7, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("RESUMO POR CATEGORIA", gapX + 3, chartY + 5);

  const categories = [
    { label: "Dízimos",        value: data.dizimosTotal,                           color: GREEN },
    { label: "Ofertas",        value: data.ofertasTotal,                           color: RED },
    { label: "Esp./Campanhas", value: data.ofertasEspeciaisTotal,                  color: [59,130,246] as [number,number,number] },
    { label: "Eventos",        value: data.bazarTotal + data.almocoTotal,          color: [245,158,11] as [number,number,number] },
    { label: "Outros",         value: data.outrasEntradasTotal,                    color: GRAY3 },
  ];
  const totalCat = categories.reduce((s, c) => s + c.value, 0) || 1;

  const donutR = 14;
  const innerR = 7;
  const donutCx = gapX + rightW / 2;
  const donutCy = chartY + 7 + donutR + 5;

  type Slice = { pct: number; midAngleRad: number; color: [number, number, number] };
  const slices: Slice[] = [];
  let startDeg = -90;
  const STEP = 3;

  categories.forEach((c) => {
    const sweepDeg = (c.value / totalCat) * 360;
    const endDeg = startDeg + sweepDeg;
    doc.setFillColor(...c.color);
    let a = startDeg;
    while (a < endDeg) {
      const a2 = Math.min(a + STEP, endDeg);
      const r1 = (a * Math.PI) / 180;
      const r2 = (a2 * Math.PI) / 180;
      const x1 = donutCx + donutR * Math.cos(r1);
      const y1 = donutCy + donutR * Math.sin(r1);
      const x2 = donutCx + donutR * Math.cos(r2);
      const y2 = donutCy + donutR * Math.sin(r2);
      doc.triangle(donutCx, donutCy, x1, y1, x2, y2, "F");
      a = a2;
    }
    slices.push({
      pct: (c.value / totalCat) * 100,
      midAngleRad: ((startDeg + endDeg) / 2) * (Math.PI / 180),
      color: c.color,
    });
    startDeg = endDeg;
  });

  // punch the donut hole (white) to turn the pie into a donut
  doc.setFillColor(...WHITE);
  doc.circle(donutCx, donutCy, innerR, "F");

  // percentage labels at each slice's mid-radius
  slices.forEach((s) => {
    if (s.pct < 4) return;
    const labelR = (donutR + innerR) / 2;
    const lx = donutCx + labelR * Math.cos(s.midAngleRad);
    const ly = donutCy + labelR * Math.sin(s.midAngleRad);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...WHITE);
    doc.text(`${s.pct.toFixed(0)}%`, lx, ly + 1, { align: "center" });
  });

  // centre label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL", donutCx, donutCy - 1, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY2);
  doc.text("Entradas", donutCx, donutCy + 3.5, { align: "center" });

  // legend below the donut
  let legendY = donutCy + donutR + 8;
  categories.forEach((c) => {
    filledRect(doc, gapX + 3, legendY - 2.6, 3, 3, c.color);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY1);
    doc.text(c.label, gapX + 8, legendY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY2);
    doc.text(brl(c.value), gapX + rightW - 3, legendY, { align: "right" });
    legendY += 5.5;
  });

  Y += 12;

  // ── BOTTOM GRID (3 cols) ──
  const bgW = (W - 6) / 3;
  const bgHeaders = ["MOVIMENTAÇÃO CLERICAL", "DÍZIMOS E OFERTAS", "PRÓXIMOS COMPROMISSOS"];
  const bgData = [
    [
      ["Batismos", "02"],
      ["Profissões de Fé", "01"],
      ["Transf. Recebidas", "00"],
      ["Transf. Enviadas", "01"],
      ["Casamentos", "01"],
      ["Atend. Pastorais", "18"],
    ],
    [
      ["Dizimistas Ativos", "128"],
      ["Ofertantes Regulares", "96"],
      ["Novos Dizimistas", "03"],
      ["Novos Ofertantes", "04"],
    ],
    [
      ["05/06", "Pgto. Conta de Luz"],
      ["10/06", "Reunião do Conselho"],
      ["15/06", "Almoço Beneficente"],
      ["20/06", "Culto de Missões"],
      ["30/06", "Encerramento do Mês"],
    ],
  ];

  const bgIcons = [iconPerson, iconHeart, iconCalendar];
  const cardBadgeR = 4;

  bgHeaders.forEach((hdr, ci) => {
    const bx = ML + ci * (bgW + 3);
    filledRect(doc, bx, Y, bgW, 7, NAVY);
    bgIcons[ci](doc, bx + cardBadgeR + 1, Y + 3.5, cardBadgeR, NAVY, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...WHITE);
    doc.text(hdr, bx + cardBadgeR * 2 + 4, Y + 5);

    let ry = Y + 7;
    bgData[ci].forEach((row, ri) => {
      const rh = 5.5;
      filledRect(doc, bx, ry, bgW, rh, ri % 2 === 0 ? WHITE : LIGHT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY1);
      doc.text(row[0], bx + 2, ry + 3.8);
      if (ci === 2) {
        // date | description layout
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text(row[1], bx + 14, ry + 3.8);
      } else {
        doc.setFont("helvetica", "bold");
        doc.text(row[1], bx + bgW - 2, ry + 3.8, { align: "right" });
      }
      ry += rh;
    });
  });

  const tallestCol = Math.max(...bgData.map(d => d.length));
  Y += 7 + tallestCol * 5.5 + 14;

  // ── SIGNATURES ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, Y, PW - MR, Y);
  Y += 12;

  const sigPositions = [ML + 20, PW / 2 + 10];
  const sigLabels = ["Pastor", "Tesoureira"];
  const sigNames  = [data.pastorName, data.treasurerName];

  sigPositions.forEach((sx, i) => {
    const lineW = 60;
    // signature rendered in italic to emulate a handwritten name above the line
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(sigNames[i], sx + lineW / 2, Y - 2, { align: "center" });

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(sx, Y, sx + lineW, Y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY2);
    doc.text(sigLabels[i], sx + lineW / 2, Y + 5, { align: "center" });
  });

  Y += 20;

  // ── FOOTER ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY3);
  doc.text("Monte Alegre de Minas - MG | Servir à igreja é fazer a diferença na vida das pessoas.", ML, Y);
  doc.text(`Monte Alegre de Minas, 31 de Maio de 2024.`, PW - MR, Y, { align: "right" });

  return { doc, filename: `Relatorio_Financeiro_Clerical_${data.refDate.replace(/[\s•/]+/g, "_")}.pdf` };
};

// ─────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────
const MOCKUP_TITHES = [
  { name: "João Silva", amount: 200.00 },
  { name: "Maria Oliveira", amount: 150.00 },
  { name: "José Santos", amount: 100.00 },
  { name: "Ana Paula", amount: 200.00 },
  { name: "Pedro Lima", amount: 150.00 },
  { name: "Lucas Ferreira", amount: 100.00 },
  { name: "Fernanda Costa", amount: 150.00 },
  { name: "Marcos Antônio", amount: 100.00 },
  { name: "Carla Souza", amount: 100.00 },
  { name: "Paulo Henrique", amount: 150.00 },
];

const MOCKUP_OFFERINGS = [
  { name: "Maria Oliveira", amount: 50.00 },
  { name: "João Silva", amount: 30.00 },
  { name: "José Santos", amount: 50.00 },
  { name: "Visitante", amount: 20.00 },
  { name: "Ana Paula", amount: 50.00 },
  { name: "Lucas Ferreira", amount: 30.00 },
  { name: "Carla Souza", amount: 50.00 },
];

// ─────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────
export default function Reports() {
  const [reportType, setReportType] = useState("entries");
  const [startDate, setStartDate] = useState("2024-05-26");
  const [endDate, setEndDate] = useState("2024-05-26");
  const [useMockupData, setUseMockupData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<{ doc: any; url: string; filename: string } | null>(null);

  // Revoke the blob URL when the preview closes/changes to avoid leaking memory
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const showPreview = (result: { doc: any; filename: string }) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { doc: result.doc, url: result.doc.output("bloburl"), filename: result.filename };
    });
  };

  const { data: settings } = trpc.churchSettings.get.useQuery();
  const { data: entries } = trpc.entries.listByDateRange.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  const { data: expenses } = trpc.expenses.listByDateRange.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const pastorName    = settings?.pastorName    ?? "Pr. Reginaldo Medeiros";
  const treasurerName = settings?.treasurerName ?? "Ageovany";

  // ── Generate Entries Report ──
  const generateEntriesReport = async () => {
    setIsGenerating(true);
    try {
      let tithes   = MOCKUP_TITHES;
      let offerings = MOCKUP_OFFERINGS;
      let refDate  = "Domingo, 26 de Maio de 2024";
      let depositDate = "27/05/2024";

      if (!useMockupData) {
        if (!entries) throw new Error("Nenhum dado encontrado para o período selecionado");
        tithes    = entries.filter(e => e.category === "dizimo").map(e => ({ name: e.description || "Dizimista", amount: parseFloat(e.amount) }));
        offerings = entries.filter(e => e.category === "oferta").map(e => ({ name: e.description || "Ofertante", amount: parseFloat(e.amount) }));
        const d = new Date(startDate + "T12:00:00");
        const wd = d.toLocaleDateString("pt-BR", { weekday: "long" });
        const mo = d.toLocaleDateString("pt-BR", { month: "long" });
        refDate = `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${d.getDate()} de ${mo.charAt(0).toUpperCase() + mo.slice(1)} de ${d.getFullYear()}`;
        const nd = new Date(d); nd.setDate(d.getDate() + 1);
        depositDate = nd.toLocaleDateString("pt-BR");
      }

      const result = await buildEntriesReport(tithes, offerings, refDate, depositDate, pastorName, treasurerName);
      showPreview(result);
      toast.success("Relatório de Entradas gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Generate Financial Report ──
  const generateFinancialReport = async () => {
    setIsGenerating(true);
    try {
      let result;
      if (useMockupData) {
        result = await buildFinancialReport({
          refDate: "Maio 2024",
          pastorName,
          treasurerName,
          totalEntries: 23700.00,
          totalExpenses: 19470.00,
          balance: 4230.00,
          balanceAvailable: 19470.50,
          dizimosTotal: 10665.00,
          ofertasTotal: 5925.00,
          ofertasEspeciaisTotal: 2370.00,
          bazarTotal: 2370.00,
          almocoTotal: 2200.00,
          outrasEntradasTotal: 4740.00,
          despesasFixasTotal: 8990.00,
          despesasMinisteriaisTotal: 5060.00,
          despesasAdminTotal: 2920.00,
          investimentosTotal: 2500.00,
        });
      } else {
        if (!entries || !expenses) throw new Error("Nenhum dado encontrado para o período selecionado");
        const totalEntries  = entries.reduce((s, e) => s + parseFloat(e.amount), 0);
        const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
        const d = new Date(startDate + "T12:00:00");
        const mo = d.toLocaleDateString("pt-BR", { month: "long" });

        result = await buildFinancialReport({
          refDate: `${mo.charAt(0).toUpperCase() + mo.slice(1)} ${d.getFullYear()}`,
          pastorName,
          treasurerName,
          totalEntries,
          totalExpenses,
          balance: totalEntries - totalExpenses,
          balanceAvailable: 15240.50 + (totalEntries - totalExpenses),
          dizimosTotal: entries.filter(e => e.category === "dizimo").reduce((s, e) => s + parseFloat(e.amount), 0),
          ofertasTotal: entries.filter(e => e.category === "oferta").reduce((s, e) => s + parseFloat(e.amount), 0),
          ofertasEspeciaisTotal: entries.filter(e => ["oferta_especial","campanha","missoes","construcao"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
          bazarTotal: entries.filter(e => e.category === "bazar").reduce((s, e) => s + parseFloat(e.amount), 0),
          almocoTotal: entries.filter(e => ["almoco_beneficente","cantina"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
          outrasEntradasTotal: entries.filter(e => ["doacao","outras_receitas"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
          despesasFixasTotal: expenses.filter(e => ["agua","energia","internet","aluguel"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
          despesasMinisteriaisTotal: expenses.filter(e => ["evangelismo","missoes"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
          despesasAdminTotal: expenses.filter(e => ["material_limpeza","manutencao","outras_despesas"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
          investimentosTotal: expenses.filter(e => ["construcao","equipamentos"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        });
      }
      showPreview(result);
      toast.success("Relatório Financeiro-Clerical gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-2">Gere relatórios financeiros institucionais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Geração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <Switch
                id="mockup-toggle"
                checked={useMockupData}
                onCheckedChange={setUseMockupData}
              />
              <div className="space-y-0.5">
                <Label htmlFor="mockup-toggle" className="font-semibold text-sm flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Modo de Demonstração (Dados Fictícios das Imagens)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Gera o relatório com o layout e dados exatamente iguais aos fornecidos nas imagens do modelo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={useMockupData}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={useMockupData}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="reportType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entries">Entradas Dominical</SelectItem>
                    <SelectItem value="financial">Financeiro-Clerical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Pré-visualização do Relatório</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={reportType === "entries" ? generateEntriesReport : generateFinancialReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={!preview}
                onClick={() => {
                  if (!preview) return;
                  const win = window.open(preview.url, "_blank");
                  win?.addEventListener("load", () => win.print());
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                disabled={!preview}
                onClick={() => preview && preview.doc.save(preview.filename)}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {preview ? (
              <iframe
                key={preview.url}
                src={preview.url}
                title="Pré-visualização do PDF"
                className="w-full h-[75vh] rounded-md border bg-muted"
              />
            ) : (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground">
                <FileText className="h-10 w-10 opacity-40" />
                <p className="text-sm text-center px-4">
                  Clique em "Gerar PDF" para visualizar o relatório aqui, no mesmo layout que será impresso.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
