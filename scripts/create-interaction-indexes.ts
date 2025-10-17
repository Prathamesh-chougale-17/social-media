import client from "@/lib/mongo";
import { getDatabase } from "@/lib/mongo";
import { createInteractionIndexes } from "@/lib/db/models/interactions";

async function main() {
  const db = await getDatabase();
  await createInteractionIndexes(db);
  console.log("Done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
