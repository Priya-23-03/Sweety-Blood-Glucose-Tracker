import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDate } from '../dates';
import { rangeHint } from '../validate';

const PAGE_SIZE = 10;

export default function ReadingsList({ version, onEdit, onDelete }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: [], total: 0, loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    api.listReadings(page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        // If the last item on a page was deleted, step back one page.
        if (res.data.length === 0 && page > 1) setPage(page - 1);
        else setState({ data: res.data, total: res.total, loading: false, error: '' });
      })
      .catch((err) => !cancelled && setState((s) => ({ ...s, loading: false, error: err.message })));
    return () => { cancelled = true; };
  }, [page, version]);

  const pages = Math.max(Math.ceil(state.total / PAGE_SIZE), 1);

  return (
    <section className="panel">
      <h2>Your readings</h2>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      {!state.loading && !state.error && state.data.length === 0 && (
        <p className="empty">No readings yet. Add your first one using the form.</p>
      )}

      {state.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Slot</th><th>mg/dl</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {state.data.map((r) => {
                const hint = rangeHint(r.value);
                return (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.slotLabel}</td>
                    <td>
                      <strong>{r.value}</strong> <span className={`chip ${hint.className}`}>{hint.text}</span>
                    </td>
                    <td className="actions">
                      <button onClick={() => onEdit(r)}>Edit</button>
                      <button className="danger" onClick={() => onDelete(r)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Readings pages">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </section>
  );
}
