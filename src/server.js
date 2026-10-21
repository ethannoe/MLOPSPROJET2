const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const VERSION = process.env.APP_VERSION || 'dev';

const app = createApp({ version: VERSION });

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Application démarrée sur le port ${PORT} (version ${VERSION})`);
});

// Node tourne en PID 1 dans le conteneur : il faut gérer SIGTERM
// nous-mêmes pour que `docker stop` arrête proprement le serveur.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} reçu, arrêt du serveur...`);
    server.close(() => process.exit(0));
  });
}
