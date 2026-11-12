// Integration tests: need a running PostgreSQL and TEST_DATABASE_URL (see README).
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const migrate = require('../scripts/migrate');

async function registerUser(email = 'a@example.com', name = 'Alice') {
  const res = await request(app).post('/auth/register').send({ name, email, password: 'password123' });
  return { token: res.body.token, user: res.body.user, res };
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const add = (t, body) => request(app).post('/readings').set(auth(t)).send(body);

beforeAll(migrate);
beforeEach(() => db.query('TRUNCATE readings, users RESTART IDENTITY CASCADE'));
afterAll(() => db.pool.end());

describe('auth', () => {
  test('register stores a bcrypt hash, never the plain password', async () => {
    const { res } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    const { rows } = await db.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toBe('password123');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  test('rejects a duplicate email and a short password', async () => {
    await registerUser();
    expect((await registerUser()).res.status).toBe(409);
    const short = await request(app).post('/auth/register').send({ name: 'B', email: 'b@example.com', password: 'abc' });
    expect(short.status).toBe(400);
  });

  test('login works with the right password and fails with the wrong one', async () => {
    await registerUser();
    const ok = await request(app).post('/auth/login').send({ email: 'A@Example.com', password: 'password123' });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/auth/login').send({ email: 'a@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
  });

  test('readings need a token', async () => {
    expect((await request(app).get('/readings')).status).toBe(401);
  });
});

describe('readings', () => {
  test('creates a reading and lists it', async () => {
    const { token } = await registerUser();
    const res = await add(token, { date: '2025-10-15', slot: 'morning', value: 110 });
    expect(res.status).toBe(201);
    expect(res.body.reading).toMatchObject({ date: '2025-10-15', slot: 'morning', value: 110 });

    const list = await request(app).get('/readings').set(auth(token));
    expect(list.body.total).toBe(1);
    expect(list.body.data[0].date).toBe('2025-10-15'); // plain string, no timezone shift
  });

  test.each([
    [{ date: '2025-10-15', slot: 'morning' }, 'Please enter a glucose value.'],
    [{ date: '2025-10-15', slot: 'morning', value: 30 }, 'Value must be between 40 and 600 mg/dl.'],
    [{ date: '2025-10-15', slot: 'morning', value: 700 }, 'Value must be between 40 and 600 mg/dl.'],
    [{ date: '2025-10-15', slot: 'morning', value: 99.5 }, 'Value must be between 40 and 600 mg/dl.'],
    [{ date: '2999-01-01', slot: 'morning', value: 100 }, 'Date cannot be in the future.'],
  ])('rejects invalid input %#', async (body, message) => {
    const { token } = await registerUser();
    const res = await add(token, body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  test('only one reading per slot per day', async () => {
    const { token } = await registerUser();
    await add(token, { date: '2025-10-15', slot: 'after_lunch', value: 140 });
    const dup = await add(token, { date: '2025-10-15', slot: 'after_lunch', value: 150 });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('You already have an After lunch reading for this date.');
    // the same slot on another day is fine
    expect((await add(token, { date: '2025-10-16', slot: 'after_lunch', value: 150 })).status).toBe(201);
  });

  test('a full day (4 readings) rejects any further reading', async () => {
    const { token } = await registerUser();
    for (const slot of ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      expect((await add(token, { date: '2025-10-15', slot, value: 120 })).status).toBe(201);
    }
    const extra = await add(token, { date: '2025-10-15', slot: 'morning', value: 120 });
    expect(extra.status).toBe(409);
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM readings');
    expect(rows[0].n).toBe(4);
  });

  test('edit: can change the value, and cannot move onto a taken slot', async () => {
    const { token } = await registerUser();
    const a = await add(token, { date: '2025-10-15', slot: 'morning', value: 100 });
    await add(token, { date: '2025-10-15', slot: 'after_lunch', value: 140 });

    const same = await request(app).put(`/readings/${a.body.reading.id}`).set(auth(token))
      .send({ date: '2025-10-15', slot: 'morning', value: 105 });
    expect(same.status).toBe(200);
    expect(same.body.reading.value).toBe(105);

    const clash = await request(app).put(`/readings/${a.body.reading.id}`).set(auth(token))
      .send({ date: '2025-10-15', slot: 'after_lunch', value: 105 });
    expect(clash.status).toBe(409);
  });

  test('delete removes the reading', async () => {
    const { token } = await registerUser();
    const a = await add(token, { date: '2025-10-15', slot: 'morning', value: 100 });
    expect((await request(app).delete(`/readings/${a.body.reading.id}`).set(auth(token))).status).toBe(204);
    expect((await request(app).get('/readings').set(auth(token))).body.total).toBe(0);
  });

  test('users only see and change their own readings', async () => {
    const alice = await registerUser('a@example.com', 'Alice');
    const bob = await registerUser('b@example.com', 'Bob');
    const r = await add(alice.token, { date: '2025-10-15', slot: 'morning', value: 100 });

    expect((await request(app).get('/readings').set(auth(bob.token))).body.total).toBe(0);
    const put = await request(app).put(`/readings/${r.body.reading.id}`).set(auth(bob.token))
      .send({ date: '2025-10-15', slot: 'morning', value: 200 });
    expect(put.status).toBe(404);
    expect((await request(app).delete(`/readings/${r.body.reading.id}`).set(auth(bob.token))).status).toBe(404);
    const report = await request(app).get('/reports/daily?date=2025-10-15').set(auth(bob.token));
    expect(report.body.stats.count).toBe(0);
  });

  test('pagination', async () => {
    const { token } = await registerUser();
    for (let day = 1; day <= 5; day += 1) {
      await add(token, { date: `2025-10-0${day}`, slot: 'morning', value: 100 + day });
    }
    const res = await request(app).get('/readings?page=2&limit=2').set(auth(token));
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 5 });
    expect(res.body.data.map((r) => r.date)).toEqual(['2025-10-03', '2025-10-02']);
  });
});

describe('reports', () => {
  async function seedReports() {
    const { token } = await registerUser();
    const rows = [
      // previous month (September)
      ['2025-09-01', 'morning', 100], ['2025-09-30', 'morning', 140],
      // outside every range
      ['2025-08-31', 'morning', 500],
      // this month up to the 15th
      ['2025-10-01', 'morning', 90], ['2025-10-15', 'morning', 110],
      ['2025-10-15', 'after_lunch', 181], ['2025-10-15', 'after_dinner', 150],
      // after the selected date
      ['2025-10-20', 'morning', 400],
    ];
    for (const [date, slot, value] of rows) await add(token, { date, slot, value });
    return token;
  }

  test('daily: stats and the list of readings with slots', async () => {
    const token = await seedReports();
    const { body } = await request(app).get('/reports/daily?date=2025-10-15').set(auth(token));
    expect(body.stats).toEqual({ count: 3, highest: 181, lowest: 110, average: 147 });
    expect(body.readings.map((r) => r.slot)).toEqual(['morning', 'after_lunch', 'after_dinner']);
  });

  test('month-to-date: 1st of the month up to the selected date only', async () => {
    const token = await seedReports();
    const { body } = await request(app).get('/reports/month-to-date?date=2025-10-15').set(auth(token));
    expect(body.range).toEqual({ from: '2025-10-01', to: '2025-10-15' });
    expect(body.stats).toEqual({ count: 4, highest: 181, lowest: 90, average: 132.8 }); // 531 / 4 = 132.75 -> 132.8
  });

  test('monthly: the whole previous month', async () => {
    const token = await seedReports();
    const { body } = await request(app).get('/reports/monthly?date=2025-10-15').set(auth(token));
    expect(body.range).toEqual({ from: '2025-09-01', to: '2025-09-30' });
    expect(body.stats).toEqual({ count: 2, highest: 140, lowest: 100, average: 120 });
  });

  test('empty range returns count 0 and null stats', async () => {
    const { token } = await registerUser();
    const { body } = await request(app).get('/reports/monthly?date=2025-10-15').set(auth(token));
    expect(body.stats).toEqual({ count: 0, highest: null, lowest: null, average: null });
  });

  test('rejects a missing or invalid date', async () => {
    const { token } = await registerUser();
    expect((await request(app).get('/reports/daily').set(auth(token))).status).toBe(400);
    expect((await request(app).get('/reports/daily?date=bad').set(auth(token))).status).toBe(400);
  });
});
