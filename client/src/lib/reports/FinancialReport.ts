import {
  getJsPDF,
  drawLogo,
  filledRect,
  cardBox,
  brl,
  iconPerson,
  iconCalendar,
  iconBank,
  iconHeart,
  iconArrowUp,
  iconArrowDown,
  iconWallet,
  NAVY,
  RED,
  GRAY1,
  GRAY2,
  GRAY3,
  WHITE,
  LIGHT,
  GREEN,
  wrapText
} from "./core";

export const buildFinancialReport = async (data: {
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
  prevMonthEntriesTotal: number;
  cotaRegionalTotal: number;
  cotaDistritalTotal: number;
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
    { label: "6. COTAS (s/ Entradas do Mês Anterior)", value: brl(-(data.cotaRegionalTotal + data.cotaDistritalTotal)), bold: true, bg: [255,242,242] as [number,number,number], color: RED },
    { label: "  6.1 Cota Regional (11%)",  value: brl(-data.cotaRegionalTotal),  bold: false, bg: WHITE },
    { label: "  6.2 Cota Distrital (4%)",  value: brl(-data.cotaDistritalTotal), bold: false, bg: LIGHT },
    { label: "7. SALDO APÓS COTAS", value: brl(data.balanceAvailable - data.cotaRegionalTotal - data.cotaDistritalTotal), bold: true, bg: [240,253,244] as [number,number,number], color: GREEN },
  ];

  // Header
  filledRect(doc, ML, Y, leftW, 7, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("DEMONSTRATIVO FINANCEIRO", ML + 3, Y + 5);
  Y += 7;

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

  // Right card — Real pie/donut chart
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
  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Monte Alegre de Minas, ${todayStr}.`, PW - MR, Y, { align: "right" });

  return { doc, filename: `Relatorio_Financeiro_Clerical_${data.refDate.replace(/[\s•/]+/g, "_")}.pdf` };
};
