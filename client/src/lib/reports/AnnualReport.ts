import {
  getJsPDF,
  drawLogoOrImage,
  filledRect,
  cardBox,
  brl,
  tableRow,
  iconArrowUp,
  iconArrowDown,
  NAVY,
  RED,
  GRAY1,
  GRAY2,
  GRAY3,
  WHITE,
  LIGHT,
  GREEN,
} from "./core";

export const buildAnnualReport = async (data: {
  year: number;
  pastorName: string;
  treasurerName: string;
  logoUrl?: string | null;
  monthlyData: {
    name: string;
    entriesRealized: number;
    entriesGoal: number;
    expensesRealized: number;
    expensesGoal: number;
  }[];
}) => {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = 210;
  const PH = 297;
  const ML = 14;
  const MR = 14;
  const MT = 16;
  const FOOTER_H = 12;
  const PHFOOTER = PH - FOOTER_H;
  const CONTENT_BOTTOM = PHFOOTER - 4;
  const W = PW - ML - MR;

  const cur = { y: 16 };

  const drawContinuationHeader = () => {
    filledRect(doc, 0, 0, PW, 12, NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(`ORÇAMENTO ANUAL ${data.year} — continuação`, ML, 7.5);
    cur.y = MT;
  };

  const ensureSpace = (neededH: number, redraw?: () => void) => {
    if (cur.y + neededH > CONTENT_BOTTOM) {
      doc.addPage();
      drawContinuationHeader();
      if (redraw) redraw();
    }
  };

  // ── HEADER ──
  await drawLogoOrImage(doc, ML, cur.y - 2, 16, data.logoUrl);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Igreja Metodista", ML + 21, cur.y + 2);
  doc.setFontSize(18);
  doc.text("Monte Alegre", ML + 21, cur.y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("RELATÓRIO ANUAL", PW - MR, cur.y + 4, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text(`ORÇADO x REALIZADO — ${data.year}`, PW - MR, cur.y + 10.5, { align: "right" });

  cur.y += 21;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, cur.y, PW - MR, cur.y);
  cur.y += 6;

  const totalEntriesRealized = data.monthlyData.reduce((s, m) => s + m.entriesRealized, 0);
  const totalEntriesGoal = data.monthlyData.reduce((s, m) => s + m.entriesGoal, 0);
  const totalExpensesRealized = data.monthlyData.reduce((s, m) => s + m.expensesRealized, 0);
  const totalExpensesGoal = data.monthlyData.reduce((s, m) => s + m.expensesGoal, 0);
  const entriesPct = totalEntriesGoal > 0 ? (totalEntriesRealized / totalEntriesGoal) * 100 : 0;
  const expensesPct = totalExpensesGoal > 0 ? (totalExpensesRealized / totalExpensesGoal) * 100 : 0;

  // ── KPI CARDS ──
  const kpiW = (W - 9) / 4;
  const kpiH = 20;
  const kpis = [
    { label: "ENTRADAS REALIZADAS", value: brl(totalEntriesRealized), color: GREEN, icon: iconArrowDown },
    { label: "META DE ENTRADAS", value: brl(totalEntriesGoal), color: [59, 130, 246] as [number, number, number], icon: iconArrowDown },
    { label: "DESPESAS REALIZADAS", value: brl(totalExpensesRealized), color: RED, icon: iconArrowUp },
    { label: "META DE DESPESAS", value: brl(totalExpensesGoal), color: [245, 158, 11] as [number, number, number], icon: iconArrowUp },
  ];
  kpis.forEach((kpi, i) => {
    const kx = ML + i * (kpiW + 3);
    cardBox(doc, kx, cur.y, kpiW, kpiH, WHITE);
    filledRect(doc, kx, cur.y, 2, kpiH, kpi.color);
    const badgeR = 4.5;
    kpi.icon(doc, kx + kpiW - badgeR - 3, cur.y + badgeR + 3, badgeR, kpi.color, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY2);
    doc.text(kpi.label, kx + 4, cur.y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + 4, cur.y + 13);
  });
  cur.y += kpiH + 4;

  // ── PERCENTAGE SUMMARY ──
  const pctBoxH = 10;
  const pctBoxW = (W - 4) / 2;
  const drawPctBox = (x: number, label: string, pct: number, isExpense: boolean) => {
    const good = isExpense ? pct <= 100 : pct >= 100;
    const color = good ? GREEN : RED;
    cardBox(doc, x, cur.y, pctBoxW, pctBoxH, LIGHT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY1);
    doc.text(label, x + 3, cur.y + 6.5);
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(`${pct.toFixed(1).replace(".", ",")}%`, x + pctBoxW - 3, cur.y + 6.8, { align: "right" });
  };
  drawPctBox(ML, "% DA META DE ENTRADAS ATINGIDA", entriesPct, false);
  drawPctBox(ML + pctBoxW + 4, "% DA META DE DESPESAS UTILIZADA", expensesPct, true);
  cur.y += pctBoxH + 8;

  // ── MONTHLY TABLE ──
  const colMonth = 26;
  const colVal = (W - colMonth) / 6;
  const ROW_H = 6.5;

  const drawColumnHeader = () => {
    filledRect(doc, ML, cur.y, W, 7, NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...WHITE);
    doc.text("MÊS", ML + 2, cur.y + 4.8);
    doc.text("ENT. REALIZ.", ML + colMonth + colVal - 2, cur.y + 4.8, { align: "right" });
    doc.text("META ENT.", ML + colMonth + colVal * 2 - 2, cur.y + 4.8, { align: "right" });
    doc.text("% ENT.", ML + colMonth + colVal * 3 - 2, cur.y + 4.8, { align: "right" });
    doc.text("DESP. REALIZ.", ML + colMonth + colVal * 4 - 2, cur.y + 4.8, { align: "right" });
    doc.text("META DESP.", ML + colMonth + colVal * 5 - 2, cur.y + 4.8, { align: "right" });
    doc.text("% DESP.", ML + colMonth + colVal * 6 - 2, cur.y + 4.8, { align: "right" });
    cur.y += 7;
  };

  drawColumnHeader();

  data.monthlyData.forEach((m, i) => {
    ensureSpace(ROW_H, drawColumnHeader);
    const entriesPctM = m.entriesGoal > 0 ? (m.entriesRealized / m.entriesGoal) * 100 : 0;
    const expensesPctM = m.expensesGoal > 0 ? (m.expensesRealized / m.expensesGoal) * 100 : 0;
    tableRow(doc, ML, cur.y, W, [
      { text: m.name, width: colMonth },
      { text: m.entriesRealized.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
      { text: m.entriesGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
      { text: `${entriesPctM.toFixed(0)}%`, width: colVal, align: "right" },
      { text: m.expensesRealized.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
      { text: m.expensesGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
      { text: `${expensesPctM.toFixed(0)}%`, width: colVal, align: "right" },
    ], i % 2 === 1, false, undefined, ROW_H);
    cur.y += ROW_H;
  });

  ensureSpace(8);
  filledRect(doc, ML, cur.y, W, 8, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  tableRow(doc, ML, cur.y, W, [
    { text: "TOTAL", width: colMonth },
    { text: totalEntriesRealized.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    { text: totalEntriesGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    { text: `${entriesPct.toFixed(0)}%`, width: colVal, align: "right" },
    { text: totalExpensesRealized.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    { text: totalExpensesGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
    { text: `${expensesPct.toFixed(0)}%`, width: colVal, align: "right" },
  ], false, true, NAVY as [number, number, number], 8);
  doc.setTextColor(...WHITE);
  cur.y += 14;

  // ── SIGNATURES ──
  ensureSpace(30);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, cur.y, PW - MR, cur.y);
  cur.y += 16;

  const sigPositions = [ML + 20, PW / 2 + 10];
  const sigLabels = ["Pastor", "Tesoureira"];
  const sigNames = [data.pastorName, data.treasurerName];
  sigPositions.forEach((sx, i) => {
    const lineW = 60;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(sigNames[i], sx + lineW / 2, cur.y - 2, { align: "center" });
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(sx, cur.y, sx + lineW, cur.y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY2);
    doc.text(sigLabels[i], sx + lineW / 2, cur.y + 5, { align: "center" });
  });

  // ── FOOTER (every page) ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    filledRect(doc, 0, PHFOOTER, PW, FOOTER_H, NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("IGREJA METODISTA MONTE ALEGRE", ML, PHFOOTER + 7.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(220, 226, 235);
    doc.text(`Relatório Anual ${data.year} — Documento de uso interno e contábil.`, ML, PHFOOTER + 10.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Página ${p}/${totalPages}`, PW - MR, PHFOOTER + 9, { align: "right" });
  }

  return { doc, filename: `Relatorio_Anual_${data.year}.pdf` };
};
