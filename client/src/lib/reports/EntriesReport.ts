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
  iconArrowDown,
  tableRow,
  NAVY,
  RED,
  GRAY1,
  GRAY2,
  GRAY3,
  WHITE,
  LIGHT,
  GOLD
} from "./core";

export const buildEntriesReport = async (
  tithes: { name: string; amount: number }[],
  offerings: { name: string; amount: number }[],
  refDate: string,
  depositDate: string,
  pastorName: string,
  treasurerName: string,
  logoUrl?: string | null,
  cotas?: {
    prevMonthRef: string;
    prevMonthEntriesTotal: number;
    cotaRegional: number;
    cotaDistrital: number;
  }
) => {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── PAGE / MARGIN CONFIG ──
  const PW = 210;                   // page width (mm, A4)
  const PH = 297;                   // page height (mm, A4)
  const ML = 14;                    // margin left
  const MR = 14;                    // margin right
  const MT = 16;                    // top margin used on continuation pages
  const FOOTER_H = 14;              // height of the navy footer band
  const PHFOOTER = PH - FOOTER_H;   // y where the footer band starts (283)
  const CONTENT_BOTTOM = PHFOOTER - 4; // last y any content may reach before the footer (279)
  const W = PW - ML - MR;

  const cur = { y: 16 };

  // Compact navy header repeated on every page after the first, so a reader
  // can immediately tell the page is a continuation of the same report.
  const drawContinuationHeader = () => {
    filledRect(doc, 0, 0, PW, 12, NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text("RELATÓRIO DE ENTRADAS — continuação", ML, 7.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(refDate, PW - MR, 7.5, { align: "right" });
    cur.y = MT;
  };

  // Guarantees there is room for the next block; if not, starts a new page
  // (re-drawing a column header when provided) so no row or section is ever
  // clipped or silently dropped at the bottom of a page.
  const ensureSpace = (neededH: number, redraw?: () => void) => {
    if (cur.y + neededH > CONTENT_BOTTOM) {
      doc.addPage();
      drawContinuationHeader();
      if (redraw) redraw();
    }
  };

  // ── HEADER (page 1 only) ──
  await drawLogoOrImage(doc, ML, cur.y - 2, 16, logoUrl);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Igreja Metodista", ML + 21, cur.y + 2);
  doc.setFontSize(18);
  doc.text("Monte Alegre", ML + 21, cur.y + 9);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Servir a Deus é transformar vidas!", ML + 21, cur.y + 14.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("RELATÓRIO DE ENTRADAS", PW - MR, cur.y + 4, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text("DÍZIMOS E OFERTAS POR DOMINGO", PW - MR, cur.y + 10.5, { align: "right" });
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(PW - MR - 58, cur.y + 12.5, PW - MR, cur.y + 12.5);

  cur.y += 21;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML, cur.y, PW - MR, cur.y);
  cur.y += 5;

  // ── METADATA CARDS (3 separate badge cards) ──
  const metaW = (W - 6) / 3;
  const metaH = 16;
  const metaBadgeR = 6;

  const metaCard = (ox: number, icon: typeof iconPerson, label: string, value: string) => {
    const bx = ML + ox;
    cardBox(doc, bx, cur.y, metaW, metaH, WHITE);
    const badgeCx = bx + 9;
    const badgeCy = cur.y + metaH / 2;
    icon(doc, badgeCx, badgeCy, metaBadgeR, NAVY, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY2);
    doc.text(label.toUpperCase(), badgeCx + metaBadgeR + 4, cur.y + 6.5);

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
    doc.text(displayValue, textX, cur.y + 12);
  };

  metaCard(0, iconPerson, "Pastor", pastorName);
  metaCard(metaW + 3, iconPerson, "Tesoureira", treasurerName);
  metaCard((metaW + 3) * 2, iconCalendar, "Referência", refDate);

  cur.y += metaH + 5;

  // ── INTRO TEXT ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Relatório simplificado das entradas de dízimos e ofertas realizadas no culto de domingo.", ML, cur.y);
  cur.y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY1);
  doc.text("Valores a serem depositados na conta da igreja na segunda-feira.", ML, cur.y);
  cur.y += 10;

  const totalTithes = tithes.reduce((s, e) => s + e.amount, 0);
  const totalOfferings = offerings.reduce((s, e) => s + e.amount, 0);
  const totalAll = totalTithes + totalOfferings;

  // ── TABLE LAYOUT ──
  const colNum = 14;
  const colVal = 36;
  const colName = W - colNum - colVal;
  const ROW_H = 7;
  const SEC_BADGE_R = 5;

  const sectionHeaderWithBadge = (title: string, barColor: [number, number, number], icon: typeof iconPerson) => {
    filledRect(doc, ML, cur.y, W, 7.5, barColor);
    icon(doc, ML + SEC_BADGE_R, cur.y + 3.75, SEC_BADGE_R, barColor, WHITE);
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), ML + SEC_BADGE_R * 2 + 4, cur.y + 5.2);
    doc.setTextColor(...GRAY1);
    cur.y += 8;
  };

  const drawColumnHeader = (nameLabel: string) => {
    filledRect(doc, ML, cur.y, W, 7, [226, 232, 240]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text("#", ML + 3, cur.y + 4.8);
    doc.text(nameLabel, ML + colNum + 2, cur.y + 4.8);
    doc.text("VALOR (R$)", PW - MR - 2, cur.y + 4.8, { align: "right" });
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(ML, cur.y + 7, PW - MR, cur.y + 7);
    cur.y += 7;
  };

  // Draws a section header + column header + every row + totals row.
  // Pagination is checked row-by-row: if a row would be clipped by the
  // footer band, a new page starts and the column header is redrawn so the
  // continued rows stay labeled — no entry is ever skipped or lost.
  const drawEntryTable = (
    sectionTitle: string,
    barColor: [number, number, number],
    sectionIcon: typeof iconPerson,
    nameLabel: string,
    rows: { name: string; amount: number }[],
    total: number,
    totalLabel: string,
    totalBg: [number, number, number],
    totalAccent: [number, number, number]
  ) => {
    ensureSpace(7.5 + 7 + ROW_H);
    sectionHeaderWithBadge(sectionTitle, barColor, sectionIcon);
    drawColumnHeader(nameLabel);

    rows.forEach((e, i) => {
      ensureSpace(ROW_H, () => drawColumnHeader(nameLabel));
      tableRow(doc, ML, cur.y, W, [
        { text: String(i + 1), width: colNum },
        { text: e.name, width: colName },
        { text: e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), width: colVal, align: "right" },
      ], i % 2 === 1, false, undefined, ROW_H);
      cur.y += ROW_H;
    });

    ensureSpace(7);
    filledRect(doc, ML, cur.y, W, 7, totalBg);
    filledRect(doc, ML, cur.y, 1.6, 7, totalAccent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...totalAccent);
    doc.text(totalLabel, ML + colNum + 2, cur.y + 4.8);
    doc.text(total.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), PW - MR - 2, cur.y + 4.8, { align: "right" });
    cur.y += 7;
  };

  drawEntryTable("Dízimos", NAVY, iconHandHeart, "DIZIMISTA", tithes, totalTithes, "TOTAL DÍZIMOS", [239, 246, 255], NAVY);
  cur.y += 5;
  drawEntryTable("Ofertas", RED, iconHeart, "OFERTANTE", offerings, totalOfferings, "TOTAL OFERTAS", [255, 242, 242], RED);
  cur.y += 7;

  // ── GRAND TOTAL CARD ──
  const cardH = 20;
  ensureSpace(cardH);
  filledRect(doc, ML, cur.y, W, cardH, NAVY);
  iconBank(doc, ML + 13, cur.y + cardH / 2, 7, [30, 64, 110], WHITE);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL GERAL A SER DEPOSITADO NA SEGUNDA-FEIRA", ML + 26, cur.y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Data prevista do depósito: ${depositDate}`, ML + 26, cur.y + 14);

  const valBoxW = 56;
  filledRect(doc, PW - MR - valBoxW, cur.y + 2.5, valBoxW, cardH - 5, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(brl(totalAll), PW - MR - 4, cur.y + cardH / 2 + 2, { align: "right" });
  cur.y += cardH + 9;

  // ── COTAS REGIONAL E DISTRITAL ──
  if (cotas && cotas.prevMonthEntriesTotal > 0) {
    const cotasH = 52;
    ensureSpace(cotasH);

    const AMBER: [number, number, number] = [180, 83, 9];
    const AMBER_BG: [number, number, number] = [255, 251, 235];
    const AMBER_LIGHT: [number, number, number] = [254, 243, 199];

    filledRect(doc, ML, cur.y, W, 7.5, AMBER);
    iconArrowDown(doc, ML + 5, cur.y + 3.75, 5, AMBER, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("COTAS — DESCONTOS SOBRE ENTRADAS DO MÊS ANTERIOR", ML + 14, cur.y + 5.2);
    cur.y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY3);
    doc.text(`Base de cálculo: entradas de ${cotas.prevMonthRef} = ${brl(cotas.prevMonthEntriesTotal)}`, ML + 2, cur.y + 4);
    cur.y += 7;

    const cotaRows = [
      { label: "Cota Regional (11%)", value: cotas.cotaRegional },
      { label: "Cota Distrital (4%)", value: cotas.cotaDistrital },
    ];

    cotaRows.forEach((row, i) => {
      const rh = 7;
      filledRect(doc, ML, cur.y, W, rh, i % 2 === 0 ? AMBER_BG : AMBER_LIGHT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY1);
      doc.text(row.label, ML + 4, cur.y + 4.8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...AMBER);
      doc.text(`- ${brl(row.value)}`, PW - MR - 2, cur.y + 4.8, { align: "right" });
      cur.y += rh;
    });

    const totalCotas = cotas.cotaRegional + cotas.cotaDistrital;
    filledRect(doc, ML, cur.y, W, 7, AMBER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("TOTAL COTAS A DESCONTAR", ML + 4, cur.y + 4.8);
    doc.text(`- ${brl(totalCotas)}`, PW - MR - 2, cur.y + 4.8, { align: "right" });
    cur.y += 7;

    const liquidoAposCotas = totalAll - totalCotas;
    filledRect(doc, ML, cur.y, W, 7, [239, 246, 255]);
    filledRect(doc, ML, cur.y, 1.6, 7, NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text("SALDO LÍQUIDO APÓS COTAS", ML + 6, cur.y + 4.8);
    doc.text(brl(liquidoAposCotas), PW - MR - 2, cur.y + 4.8, { align: "right" });
    cur.y += 14;
  }

  // ── MINIMALIST CLOSING ──
  const CLOSING_BLOCK_H = 34;
  ensureSpace(CLOSING_BLOCK_H);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ML + 18, cur.y, PW - MR - 18, cur.y);
  iconCross(doc, PW / 2, cur.y, 5, WHITE, RED);
  cur.y += 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Obrigado pela fidelidade e generosidade!", PW / 2, cur.y, { align: "center" });
  cur.y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY2);
  doc.text("Deus abençoe a vida de cada um que contribui com alegria para a obra do Senhor.", PW / 2, cur.y, { align: "center" });

  // ── FOOTER BAND (drawn on every page so margins stay consistent when printed) ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    filledRect(doc, 0, PHFOOTER, PW, FOOTER_H, NAVY);
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
    doc.text(`Referência: ${refDate}  •  Página ${p}/${totalPages}`, PW - MR, PHFOOTER + 13, { align: "right" });
  }

  return { doc, filename: `Relatorio_Entradas_${refDate.replace(/[\s,/]+/g, "_")}.pdf` };
};
