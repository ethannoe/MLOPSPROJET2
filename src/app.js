const path = require('node:path');
const express = require('express');
const { TodoStore, ValidationError } = require('./todoStore');

// Fabrique de l'application : le serveur HTTP n'est pas démarré ici,
// ce qui permet aux tests unitaires (supertest) de l'utiliser directement.
function createApp({ store = new TodoStore(), version = 'dev' } = {}) {
  const app = express();
  const startedAt = Date.now();

  app.disable('x-powered-by');
  app.use(express.json());

  // Endpoint de vérification utilisé par Docker, la CI et le déploiement
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version,
      uptime: Math.round((Date.now() - startedAt) / 1000),
    });
  });

  const api = express.Router();

  api.get('/todos', (req, res) => {
    res.json({ items: store.list(), stats: store.stats() });
  });

  api.post('/todos', (req, res) => {
    const todo = store.create(req.body);
    res.status(201).json(todo);
  });

  api.get('/todos/:id', (req, res) => {
    const todo = store.get(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json(todo);
  });

  api.patch('/todos/:id', (req, res) => {
    const todo = store.update(req.params.id, req.body);
    if (!todo) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json(todo);
  });

  api.delete('/todos/:id', (req, res) => {
    if (!store.remove(req.params.id)) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    res.status(204).end();
  });

  api.use((req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  app.use('/api', api);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Gestion centralisée des erreurs
  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}

module.exports = { createApp };
