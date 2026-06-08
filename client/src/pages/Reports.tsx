import { useState } from "react";
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
import { Loader2, FileText, Settings2 } from "lucide-react";
import { toast } from "sonner";

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
// Draw church flame+cross icon inline at (x, y)
// ─────────────────────────────────────────────────────────
const drawLogo = (doc: any, x: number, y: number, size: number = 12) => {
  const s = size / 12;
  // Red flame
  doc.setFillColor(...RED);
  doc.triangle(x + 4*s, y + size, x + 8*s, y + 2*s, x + 12*s, y + size, "F");
  doc.setFillColor(220, 50, 50);
  doc.triangle(x + 6*s, y + size, x + 9*s, y + 4*s, x + 12*s, y + size, "F");
  // Navy cross
  doc.setFillColor(...NAVY);
  // Vertical bar
  doc.rect(x + 5.5*s, y + 1*s, 2.5*s, 11*s, "F");
  // Horizontal bar
  doc.rect(x + 1*s, y + 4*s, 10*s, 2.5*s, "F");
};

// ─────────────────────────────────────────────────────────
// Section header line (navy bar + white title)
// ─────────────────────────────────────────────────────────
const sectionHeader = (doc: any, x: number, y: number, w: number, title: string) => {
  filledRect(doc, x, y, w, 7, NAVY);
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), x + 3, y + 5);
  doc.setTextColor(...GRAY1);
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
  rowBg?: [number,number,number]
) => {
  const h = 6;
  if (rowBg) filledRect(doc, x, y, w, h, rowBg);
  else if (isOdd) filledRect(doc, x, y, w, h, LIGHT);
  else filledRect(doc, x, y, w, h, WHITE);

  doc.setFontSize(8);
  doc.setFont("helvetica", isBold ? "bold" : "normal");
  doc.setTextColor(...GRAY1);

  let cx = x + 2;
  for (const col of cols) {
    if (col.align === "right") {
      doc.text(col.text, cx + col.width - 2, y + 4.2, { align: "right" });
    } else {
      doc.text(col.text, cx + 1, y + 4.2);
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

  const PW = 210; // page width mm
  const ML = 14;  // margin left
  const MR = 14;  // margin right
  const W  = PW - ML - MR;
  let Y = 14;

  // ── HEADER ──
  drawLogo(doc, ML, Y - 2, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Igreja Metodista", ML + 18, Y + 2);
  doc.setFontSize(16);
  doc.text("Monte Alegre", ML + 18, Y + 8);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY2);
  doc.text("Servir a Deus é transformar vidas!", ML + 18, Y + 13);

  // right side title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("RELATÓRIO DE ENTRADAS", PW - MR, Y + 4, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text("DÍZIMOS E OFERTAS POR DOMINGO", PW - MR, Y + 10, { align: "right" });
  // red underline
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(PW - MR - 52, Y + 12, PW - MR, Y + 12);

  Y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, Y, PW - MR, Y);
  Y += 4;

  // ── METADATA CARD ──
  cardBox(doc, ML, Y, W, 14, LIGHT);
  const metaW = W / 3;

  const metaItem = (label: string, value: string, ox: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY2);
    doc.text(label.toUpperCase(), ML + ox + 6, Y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY1);
    doc.text(value, ML + ox + 6, Y + 10);
  };

  metaItem("Pastor", pastorName, 0);
  metaItem("Tesoureira", treasurerName, metaW);
  metaItem("Referência", refDate, metaW * 2);

  // separators
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(ML + metaW, Y + 2, ML + metaW, Y + 12);
  doc.line(ML + metaW * 2, Y + 2, ML + metaW * 2, Y + 12);

  Y += 18;

  // ── INTRO TEXT ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY2);
  doc.text("Relatório simplificado das entradas de dízimos e ofertas realizadas no culto de domingo.", ML, Y);
  Y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY1);
  doc.text("Valores a serem depositados na conta da igreja na segunda-feira.", ML, Y);
  Y += 8;

  const totalTithes   = tithes.reduce((s, e) => s + e.amount, 0);
  const totalOfferings = offerings.reduce((s, e) => s + e.amount, 0);
  const totalAll = totalTithes + totalOfferings;

  // ── TITHES TABLE ──
  const colNum = 12;
  const colVal = 32;
  const colName = W - colNum - colVal;

  sectionHeader(doc, ML, Y, W, "DÍZIMOS");
  Y += 7;

  // column headers
  filledRect(doc, ML, Y, W, 6, [241, 245, 249]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY2);
  doc.text("#", ML + 3, Y + 4.2);
  doc.text("DIZIMISTA", ML + colNum + 2, Y + 4.2);
  doc.text("VALOR (R$)", PW - MR - 2, Y + 4.2, { align: "right" });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(ML, Y + 6, PW - MR, Y + 6);
  Y += 6;

  tithes.forEach((e, i) => {
    tableRow(doc, ML, Y, W, [
      { text: String(i + 1).padStart(2, "0"), width: colNum },
      { text: e.name, width: colName },
      { text: e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    ], i % 2 === 1);
    Y += 6;
  });

  // Totals row — tithes
  filledRect(doc, ML, Y, W, 6, [239, 246, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL DÍZIMOS", ML + colNum + 2, Y + 4.2);
  doc.text(totalTithes.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), PW - MR - 2, Y + 4.2, { align: "right" });
  Y += 10;

  // ── OFFERINGS TABLE ──
  sectionHeader(doc, ML, Y, W, "OFERTAS");
  Y += 7;

  // column headers
  filledRect(doc, ML, Y, W, 6, [241, 245, 249]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY2);
  doc.text("#", ML + 3, Y + 4.2);
  doc.text("OFERTANTE", ML + colNum + 2, Y + 4.2);
  doc.text("VALOR (R$)", PW - MR - 2, Y + 4.2, { align: "right" });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(ML, Y + 6, PW - MR, Y + 6);
  Y += 6;

  offerings.forEach((e, i) => {
    tableRow(doc, ML, Y, W, [
      { text: String(i + 1).padStart(2, "0"), width: colNum },
      { text: e.name, width: colName },
      { text: e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    ], i % 2 === 1);
    Y += 6;
  });

  // Totals row — offerings
  filledRect(doc, ML, Y, W, 6, [255, 242, 242]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text("TOTAL OFERTAS", ML + colNum + 2, Y + 4.2);
  doc.text(totalOfferings.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), PW - MR - 2, Y + 4.2, { align: "right" });
  Y += 12;

  // ── GRAND TOTAL CARD ──
  filledRect(doc, ML, Y, W, 16, NAVY);
  // circle icon
  doc.setFillColor(...WHITE);
  doc.circle(ML + 10, Y + 8, 5, "F");
  doc.setFillColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("$", ML + 8, Y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL GERAL A SER DEPOSITADO NA SEGUNDA-FEIRA", ML + 18, Y + 6);
  doc.setFontSize(7.5);
  doc.text(`(${depositDate})`, ML + 18, Y + 11);

  // value box
  filledRect(doc, PW - MR - 52, Y + 1, 50, 14, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(brl(totalAll), PW - MR - 2, Y + 11, { align: "right" });
  Y += 22;

  // ── VERSE ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY2);
  const verseLine = '"Cada um contribua segundo tiver proposto no coração, não com tristeza ou por necessidade; pois Deus ama ao que dá com alegria."';
  Y = wrapText(doc, verseLine, ML, Y, W, 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("2 Coríntios 9:7", PW / 2, Y + 3, { align: "center" });
  Y += 12;

  // ── FOOTER ──
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(ML, Y, PW - MR, Y);
  Y += 8;
  drawLogo(doc, PW / 2 - 7, Y - 2, 14);
  Y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Obrigado pela fidelidade e generosidade!", PW / 2, Y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY2);
  doc.text("Deus abençoe a vida de cada um.", PW / 2, Y + 5, { align: "center" });

  doc.save(`Relatorio_Entradas_${refDate.replace(/[\s,/]+/g, "_")}.pdf`);
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

  const PW = 210;
  const ML = 14;
  const MR = 14;
  const W  = PW - ML - MR;
  let Y = 14;

  // ── HEADER ──
  drawLogo(doc, ML, Y - 2, 14);
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

  Y += 18;

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

  // ── 4 KPI CARDS ──
  const kpiW = (W - 9) / 4;
  const kpis = [
    { label: "TOTAL DE ENTRADAS", value: brl(data.totalEntries), color: GREEN, sub: "▲ +12,5% vs Mês Ant." },
    { label: "TOTAL DE SAÍDAS",   value: brl(data.totalExpenses), color: [220,38,38] as [number,number,number], sub: "▼ -8,2% vs Mês Ant." },
    { label: "SALDO DO MÊS",      value: brl(data.balance), color: [59,130,246] as [number,number,number], sub: "Superávit" },
    { label: "SALDO DISPONÍVEL",  value: brl(data.balanceAvailable), color: [245,158,11] as [number,number,number], sub: "Caixa + Banco" },
  ];

  kpis.forEach((kpi, i) => {
    const kx = ML + i * (kpiW + 3);
    cardBox(doc, kx, Y, kpiW, 18, WHITE);
    // coloured left strip
    filledRect(doc, kx, Y, 2, 18, kpi.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY2);
    doc.text(kpi.label, kx + 4, Y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + 4, Y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY3);
    doc.text(kpi.sub, kx + 4, Y + 16.5);
  });
  Y += 24;

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

  // Right card — Donut chart (manual SVG circles approximation)
  const chartY = Y - (demoRows.length * 5.5 + 7);
  const chartCX = gapX + rightW / 2;
  const chartCY = chartY + 35;
  const chartR  = 18;

  filledRect(doc, gapX, chartY, rightW, 7, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("RESUMO POR CATEGORIA", gapX + 3, chartY + 5);

  // Draw donut rings
  const total = data.totalEntries || 1;
  const slices = [
    { pct: data.dizimosTotal / total, color: GREEN },
    { pct: data.ofertasTotal / total, color: RED },
    { pct: data.ofertasEspeciaisTotal / total, color: [59,130,246] as [number,number,number] },
    { pct: (data.bazarTotal + data.almocoTotal) / total, color: [245,158,11] as [number,number,number] },
    { pct: data.outrasEntradasTotal / total, color: GRAY3 },
  ];

  // Draw outer ring as coloured arcs using approximate strokes
  let angle = -Math.PI / 2;
  slices.forEach(slice => {
    if (slice.pct <= 0) return;
    const arcLen = slice.pct * 2 * Math.PI;
    const steps = Math.max(2, Math.floor(arcLen * 20));
    doc.setFillColor(...(slice.color as [number,number,number]));
    for (let i = 0; i < steps; i++) {
      const a1 = angle + (i / steps) * arcLen;
      const a2 = angle + ((i + 1) / steps) * arcLen;
      const r1 = chartR - 5;
      const r2 = chartR;
      const pts = [
        [chartCX + r1 * Math.cos(a1), chartCY + r1 * Math.sin(a1)],
        [chartCX + r2 * Math.cos(a1), chartCY + r2 * Math.sin(a1)],
        [chartCX + r2 * Math.cos(a2), chartCY + r2 * Math.sin(a2)],
        [chartCX + r1 * Math.cos(a2), chartCY + r1 * Math.sin(a2)],
      ];
      doc.triangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1], "F");
      doc.triangle(pts[0][0], pts[0][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1], "F");
    }
    angle += arcLen;
  });

  // White centre
  doc.setFillColor(...WHITE);
  doc.circle(chartCX, chartCY, chartR - 5, "F");

  // Legend
  const legendLabels = [
    { label: "Dízimos",         value: brl(data.dizimosTotal),         color: GREEN },
    { label: "Ofertas",         value: brl(data.ofertasTotal),         color: RED },
    { label: "Esp./Campanhas",  value: brl(data.ofertasEspeciaisTotal), color: [59,130,246] as [number,number,number] },
    { label: "Eventos",         value: brl(data.bazarTotal + data.almocoTotal), color: [245,158,11] as [number,number,number] },
    { label: "Outros",          value: brl(data.outrasEntradasTotal),  color: GRAY3 },
  ];

  let lY = chartCY + chartR + 6;
  legendLabels.forEach(l => {
    doc.setFillColor(...(l.color as [number,number,number]));
    doc.circle(gapX + 5, lY - 1, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY1);
    doc.text(l.label, gapX + 9, lY);
    doc.setFont("helvetica", "bold");
    doc.text(l.value, gapX + rightW - 2, lY, { align: "right" });
    lY += 5;
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

  bgHeaders.forEach((hdr, ci) => {
    const bx = ML + ci * (bgW + 3);
    filledRect(doc, bx, Y, bgW, 7, NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...WHITE);
    doc.text(hdr, bx + 2, Y + 5);

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
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(sx, Y, sx + lineW, Y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(sigLabels[i], sx + lineW / 2, Y + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY2);
    doc.text(sigNames[i], sx + lineW / 2, Y + 10, { align: "center" });
  });

  Y += 20;

  // ── FOOTER ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY3);
  doc.text("Monte Alegre de Minas - MG | Servir à igreja é fazer a diferença na vida das pessoas.", ML, Y);
  doc.text(`Monte Alegre de Minas, 31 de Maio de 2024.`, PW - MR, Y, { align: "right" });

  doc.save(`Relatorio_Financeiro_Clerical_${data.refDate.replace(/[\s•/]+/g, "_")}.pdf`);
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

      await buildEntriesReport(tithes, offerings, refDate, depositDate, pastorName, treasurerName);
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
      if (useMockupData) {
        await buildFinancialReport({
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

        await buildFinancialReport({
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

            <Button
              onClick={reportType === "entries" ? generateEntriesReport : generateFinancialReport}
              disabled={isGenerating}
              className="w-full"
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
