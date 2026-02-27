import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as http from 'http';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for the React frontend (default Vite port)
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global API prefix – all routes become /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Serve static assets (product images) from src/assets
  app.useStaticAssets(path.join(process.cwd(), 'src', 'assets'), {
    prefix: '/assets',
  });

  const port = Number(process.env.PORT ?? 4000);

  // ─── Force-free the port before binding ──────────────────────────────────
  // Root cause of EADDRINUSE on hot-reload:
  //   nest --watch sends SIGTERM to the old process, waits for it to exit,
  //   then spawns the new one.  BUT if the old process's shutdown runs async
  //   lifecycle hooks (OpenAI connections, etc.) the OS can leave the TCP
  //   socket briefly in CLOSE_WAIT even after the process dies.
  //   `kill-port` finds whatever PID owns :4000 and sends SIGKILL to it,
  //   guaranteeing the port is free before we try to listen.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const killPort = require('kill-port') as (
      port: number,
      protocol?: string,
    ) => Promise<void>;
    await killPort(port, 'tcp');
    // Give the OS ~100 ms to fully release the socket
    await new Promise((r) => setTimeout(r, 100));
  } catch {
    // Nothing was on the port – that's fine, continue
  }

  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);

  // ─── Graceful shutdown on SIGTERM / SIGINT ────────────────────────────────
  // closeAllConnections() (Node ≥ 18.2) destroys every keep-alive socket
  // immediately so the port is released before the new process starts.
  const httpServer = app.getHttpServer() as http.Server;

  const shutdown = (signal: string) => {
    console.log(`\n[shutdown] ${signal} – closing all connections on :${port}`);
    httpServer.closeAllConnections();
    httpServer.close(() => process.exit(0));
    // Hard failsafe: force exit after 500 ms no matter what
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
bootstrap();
