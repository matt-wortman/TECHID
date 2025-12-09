# AI Agents — Read Me First

Keep sessions fast by following these defaults:

- **DB connection:** use `.env.prisma-dev` (dev DB already running).
- **DB host/port:** `127.0.0.1:51213` (Postgres; related ports 51213–51215).
- **Prisma Studio:** `dotenv -e .env.prisma-dev -- npx prisma studio --port 5556 --browser none`
- **Docker:** do **not** start database containers; a local instance is already running.
- **If the port changes:** update this file and `.env.prisma-dev` so future runs stay in sync.
