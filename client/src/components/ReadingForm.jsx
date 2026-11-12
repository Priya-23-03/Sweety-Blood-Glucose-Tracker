import { useState } from 'react';
import { SLOTS } from '../constants';
import { todayString } from '../dates';
import { validateReading } from '../validate';

/**
 * Add or edit a reading.
 * `onSubmit({ date, slot, value })` must return a promise; if it throws, the
 * error message (e.g. from the server) is shown above the button.
 */
export default function ReadingForm({ initial, onSubmit, onCancel, today = todayString() }) {
  const editing = Boolean(initial);
  const [form, setForm] = useState({
    date: initial?.date ?? today,
    slot: initial?.slot ?? 'morning',
    value: initial?.value ?? '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const found = validateReading(form, today);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await onSubmit({ date: form.date, slot: form.slot, value: Number(form.value) });
      if (!editing) setForm({ ...form, value: '' });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel" noValidate aria-label={editing ? 'Edit reading' : 'Add reading'}>
      <h2>{editing ? 'Edit reading' : 'Add a reading'}</h2>

      <label>
        Date
        <input type="date" value={form.date} max={today} onChange={set('date')} aria-invalid={Boolean(errors.date)} />
        {errors.date && <span role="alert" className="error">{errors.date}</span>}
      </label>

      <label>
        Time slot
        <select value={form.slot} onChange={set('slot')}>
          {SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {errors.slot && <span role="alert" className="error">{errors.slot}</span>}
      </label>

      <label>
        Glucose (mg/dl)
        <input
          type="text"
          inputMode="numeric"
          value={form.value}
          onChange={set('value')}
          aria-invalid={Boolean(errors.value)}
          placeholder="e.g. 110"
        />
        {errors.value && <span role="alert" className="error">{errors.value}</span>}
      </label>

      {serverError && <p role="alert" className="error">{serverError}</p>}

      <div className="row">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Add reading'}
        </button>
        {editing && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
