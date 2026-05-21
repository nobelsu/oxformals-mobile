export const WEEK_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export type MonthCell = { key: string | null; day: number | null };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(y: number, month0: number, day: number): string {
  return `${y}-${pad2(month0 + 1)}-${pad2(day)}`;
}

export function keyFromDate(d: Date): string {
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 12, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) {
    return null;
  }
  return d;
}

function mondayIndexOfFirst(year: number, month0: number): number {
  const dow = new Date(year, month0, 1).getDay();
  return (dow + 6) % 7;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function monthTitle(year: number, month0: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month0, 1));
}

export function buildMonthCells(viewYear: number, viewMonth: number): MonthCell[] {
  const lead = mondayIndexOfFirst(viewYear, viewMonth);
  const n = daysInMonth(viewYear, viewMonth);
  const total = lead + n;
  const rows = Math.ceil(total / 7);
  const padTotal = rows * 7;
  const items: MonthCell[] = [];
  for (let i = 0; i < padTotal; i++) {
    const dayNum = i - lead + 1;
    if (i < lead || dayNum > n) {
      items.push({ key: null, day: null });
    } else {
      items.push({
        key: toDateKey(viewYear, viewMonth, dayNum),
        day: dayNum,
      });
    }
  }
  return items;
}

export function chunkWeeks(cells: MonthCell[]): MonthCell[][] {
  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
