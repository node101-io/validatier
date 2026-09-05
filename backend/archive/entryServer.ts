import { startArchiveServer } from './server';

// `npm run archive-server` — the wrapper. Its own process, its own port
// (ARCHIVE_SERVER_PORT), independent of both the ingester and the
// dashboard backend.

const server = startArchiveServer();

const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
