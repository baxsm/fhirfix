import { logger } from "@/lib/logger";

// seed script. the starter mapping registry and pre-broken sample library
// are seeded once those tables exist (phases 2 and 6). phase 1 has no seed
// data, so this is a no-op placeholder wired to the db:seed command.
async function seed() {
  logger.info("db.seed", "no phase-1 seed data yet (registry + samples land in phases 2/6)");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("db.seed", err);
    process.exit(1);
  });
