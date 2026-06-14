import {
  getJsPDF,
  drawLogoOrImage,
  filledRect,
  cardBox,
  brl,
  iconPerson,
  iconCalendar,
  iconBank,
  iconHeart,
  iconHandHeart,
  iconCross,
  tableRow,
  NAVY,
  RED,
  GRAY1,
  GRAY2,
  WHITE,
  LIGHT
} from "./core";

export const buildEntriesReport = async (
  tithes: { name: string; amount: number }[],
  offerings: { name: string; amount: number }[],
  refDate: string,
  depositDate: string,
  pastorName: string,
  treasurerName: string,
  logoUrl?: string | null
) => {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = 210; // page width mm
  const PHFOOTER = 283; // y where the colour footer band starts
  const ML = 14;  // margin left
  const MR = 14;  // margin right
  const W  = PW - ML - MR;
  let Y = 16;

  // ── HEADER ──
  await drawLogoOrImage(doc, ML, Y - 2, 16, logoUrl);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Igreja Metodista", ML + 21, Y + 2);
  doc.setFontSize(18);
  doc.text("Monte Alegre", ML + 21, Y + 9);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Servir a Deus é transformar vidas!", ML + 21, Y + 14.5);

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

  // Totals row — tithes
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

  // Totals row — offerings
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

  const CLOSING_BLOCK_H = 34;
  if (Y + CLOSING_BLOCK_H > PHFOOTER - 4) {
    doc.addPage();
    Y = PHFOOTER - CLOSING_BLOCK_H - 6;
  }

  // ── MINIMALIST CLOSING ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML + 18, Y, PW - MR - 18, Y);
  iconCross(doc, PW / 2, Y, 5, WHITE, RED);
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

  // ── FOOTER BAND ──
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
