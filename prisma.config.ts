import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  // Migrações (DDL) usam a conexão direta -- a pooled (usada em tempo de
  // execução via lib/prisma.ts) nem sempre suporta os comandos que o
  // Migrate precisa rodar.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
