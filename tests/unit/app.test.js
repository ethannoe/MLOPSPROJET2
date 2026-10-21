const request = require('supertest');
const { createApp } = require('../../src/app');

describe('API HTTP', () => {
  let app;

  beforeEach(() => {
    // Une application neuve (et donc un store vide) par test
    app = createApp({ version: 'test-1.0' });
  });

  describe('GET /health', () => {
    test('répond 200 avec le statut et la version', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok', version: 'test-1.0' });
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('GET /', () => {
    test('sert la page web', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
      expect(res.text).toContain('Mes tâches');
    });
  });

  describe('/api/todos', () => {
    test('liste vide au démarrage', async () => {
      const res = await request(app).get('/api/todos');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [], stats: { total: 0, done: 0, remaining: 0 } });
    });

    test('POST crée une tâche (201)', async () => {
      const res = await request(app).post('/api/todos').send({ title: 'Écrire le README' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 1, title: 'Écrire le README', done: false });

      const list = await request(app).get('/api/todos');
      expect(list.body.items).toHaveLength(1);
    });

    test('POST refuse un titre vide (400)', async () => {
      const res = await request(app).post('/api/todos').send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Le titre est obligatoire');
    });

    test('POST refuse un corps sans titre (400)', async () => {
      const res = await request(app).post('/api/todos');
      expect(res.status).toBe(400);
    });

    test('POST refuse un JSON mal formé (400)', async () => {
      const res = await request(app)
        .post('/api/todos')
        .set('Content-Type', 'application/json')
        .send('{"title": ');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('JSON invalide');
    });

    test('GET /:id retourne la tâche ou 404', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'A' });

      const found = await request(app).get(`/api/todos/${created.body.id}`);
      expect(found.status).toBe(200);
      expect(found.body.title).toBe('A');

      const missing = await request(app).get('/api/todos/999');
      expect(missing.status).toBe(404);
    });

    test('PATCH /:id marque une tâche comme terminée', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'A' });

      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ done: true });

      expect(res.status).toBe(200);
      expect(res.body.done).toBe(true);

      const list = await request(app).get('/api/todos');
      expect(list.body.stats).toEqual({ total: 1, done: 1, remaining: 0 });
    });

    test('PATCH /:id refuse un statut invalide (400) et une tâche inconnue (404)', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'A' });

      const invalid = await request(app).patch(`/api/todos/${created.body.id}`).send({ done: 'yes' });
      expect(invalid.status).toBe(400);

      const missing = await request(app).patch('/api/todos/999').send({ done: true });
      expect(missing.status).toBe(404);
    });

    test('DELETE /:id supprime la tâche (204) puis 404', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'A' });

      const first = await request(app).delete(`/api/todos/${created.body.id}`);
      expect(first.status).toBe(204);

      const second = await request(app).delete(`/api/todos/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });

  test('route API inconnue -> 404 JSON', async () => {
    const res = await request(app).get('/api/inconnue');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route inconnue');
  });
});
