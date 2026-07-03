// Colunas de data (entryDate, expenseDate) são armazenadas como meia-noite UTC
// do dia calendário. Construir os limites de um intervalo em horário local (ex:
// "31/mês 23:59:59") desloca o limite final para a madrugada UTC do dia seguinte,
// vazando um dia do mês/ano seguinte para dentro da consulta. Estas funções
// constroem os limites diretamente em UTC para que o dia calendário nunca mude.

export const utcDayStart = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const utcDayEnd = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
};

export const monthRangeUTC = (year: number, monthIndex: number) => ({
  startDate: new Date(Date.UTC(year, monthIndex, 1)),
  endDate: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59)),
});

export const yearRangeUTC = (year: number) => ({
  startDate: new Date(Date.UTC(year, 0, 1)),
  endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
});
