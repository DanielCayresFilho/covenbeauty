// Servidor de produção: serve os estáticos do client e delega o resto ao SSR.
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import ssr from "./dist/server/server.js";

const app = new Hono();

// Estáticos do build (assets com hash + arquivos de public/: marca.png,
// logo-sem-fundo.png, juliana.png, favicon.ico...). Se o arquivo não existir,
// o serveStatic chama next() e caímos no SSR.
app.use("/*", serveStatic({ root: "./dist/client" }));

// Todo o resto → renderização no servidor (TanStack Start).
app.all("*", (c) => ssr.fetch(c.req.raw));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`🌙 Coven Beauty frontend em http://0.0.0.0:${info.port}`);
});
