// Works with 'YYYY-MM-DD' strings only, so the day never shifts with timezones.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function todayString(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** '2026-10-15' -> '15 Oct 2026' */
export function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** { from, to } -> '1 Oct – 15 Oct 2026' (or a single date) */
export function formatRange({ from, to }) {
  if (from === to) return formatDate(from);
  const [fy] = from.split('-');
  const [ty] = to.split('-');
  const start = fy === ty ? formatDate(from).replace(` ${fy}`, '') : formatDate(from);
  return `${start} – ${formatDate(to)}`;
}
