import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDate, formatRange, todayString } from '../dates';
import { rangeHint } from '../validate';

const REPORTS = [
  { kind: 'daily', title: 'Daily' },
  { kind: 'month-to-date', title: 'Month to date' },
  { kind: 'monthly', title: 'Previous month' },
];

function Stats({ stats }) {
  if (stats.count === 0) {
    return <p className="empty">No readings in this period yet.</p>;
  }
  return (
    <dl className="stats">
      <div><dt>Highest</dt><dd>{stats.highest}</dd></div>
      <div><dt>Lowest</dt><dd>{stats.lowest}</dd></div>
      <div><dt>Average</dt><dd>{stats.average.toFixed(1)}</dd></div>
      <div><dt>Readings</dt><dd>{stats.count}</dd></div>
    </dl>
  );
}

function ReportCard({ title, report, error }) {
  return (
    <article className="panel report">
      <header>
        <h3>{title}</h3>
        {report && <p className="range">{formatRange(report.range)}</p>}
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      {report && <Stats stats={report.stats} />}
      {report?.readings?.length > 0 && (
        <ul className="day-list">
          {report.readings.map((r) => {
            const hint = rangeHint(r.value);
            return (
              <li key={r.id}>
                <span>{r.slotLabel}</span>
                <span><strong>{r.value}</strong> mg/dl <span className={`chip ${hint.className}`}>{hint.text}</span></span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export default function Reports({ version }) {
  const today = todayString();
  const [date, setDate] = useState(today);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!date) return undefined;
    let cancelled = false;
    setErrors({});
    REPORTS.forEach(({ kind }) => {
      api.report(kind, date)
        .then((res) => !cancelled && setResults((r) => ({ ...r, [kind]: res })))
        .catch((err) => !cancelled && setErrors((e) => ({ ...e, [kind]: err.message })));
    });
    return () => { cancelled = true; };
  }, [date, version]);

  return (
    <section>
      <div className="reports-head">
        <h2>Reports</h2>
        <label className="inline">
          Report date
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {date && <p className="hint">Showing reports for {formatDate(date)}.</p>}
      <div className="reports">
        {REPORTS.map(({ kind, title }) => (
          <ReportCard key={kind} title={title} report={results[kind]} error={errors[kind]} />
        ))}
      </div>
    </section>
  );
}
