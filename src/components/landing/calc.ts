export type CalcInput = {
  initial: number;
  add: number;
  period: "month" | "year";
  years: number;
  rate: number;
  reinvest: boolean;
};

export type CalcPoint = { year: number; invested: number; capital: number; withdrawn: number };

export type CalcResult = {
  capital: number;
  invested: number;
  income: number;
  withdrawn: number;
  total: number;
  passive: number;
  points: CalcPoint[];
};

export function calculate({ initial, add, period, years, rate, reinvest }: CalcInput): CalcResult {
  const r = rate / 100 / 12;
  let capital = initial;
  let invested = initial;
  let withdrawn = 0;
  const points: CalcPoint[] = [{ year: 0, invested, capital, withdrawn: 0 }];
  for (let m = 1; m <= years * 12; m++) {
    const income = capital * r;
    if (reinvest) capital += income;
    else withdrawn += income;
    const contribute = period === "month" || m % 12 === 0;
    if (contribute && add > 0) {
      capital += add;
      invested += add;
    }
    if (m % 12 === 0) points.push({ year: m / 12, invested, capital, withdrawn });
  }
  const income = reinvest ? capital - invested : withdrawn;
  return {
    capital,
    invested,
    income,
    withdrawn,
    total: capital + withdrawn,
    passive: (capital * rate) / 100 / 12,
    points,
  };
}

export const rub = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`;

export const rubShort = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд`;
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (a >= 1e3) return `${(v / 1e3).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} тыс`;
  return `${Math.round(v)}`;
};
