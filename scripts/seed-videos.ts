/**
 * Seed Videos Script
 *
 * Populates the database with videos from Pexels API.
 * Syncs multiple pages to get initial video content.
 *
 * Usage:
 *   npx tsx scripts/seed-videos.ts
 *
 * Environment Variables Required:
 *   - PEXELS_API_KEY: Your Pexels API key
 *   - MONGODB_URI: MongoDB connection string
 */

// Load local .env file early so any modules which validate
// environment variables (like `config/env.ts`) see them.
// This must come before other imports.
import "dotenv/config";

import { pexelsClient } from "../lib/pexels-client";
import { getDatabase } from "../lib/mongo";
import { upsertVideos, transformPexelsVideo } from "../lib/db/queries/videos";
import { createVideoIndexes } from "../lib/db/models/video";

/**
 * Main seed function
 */
async function seedVideos() {
  console.log("🌱 Starting video seed...\n");

  try {
    // Connect to database
    const db = await getDatabase();
    console.log("✅ Connected to MongoDB\n");

    // Create indexes
    console.log("📊 Creating indexes...");
    await createVideoIndexes(db);
    console.log("");

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Sync 10 pages (200 videos at 20 per page)
    const pagesToSync = 10;
    const perPage = 20;

    for (let page = 1; page <= pagesToSync; page++) {
      console.log(`📥 Syncing page ${page}/${pagesToSync}...`);

      try {
        // Fetch videos from Pexels
        const pexelsVideos = await pexelsClient.fetchPopularVideos(
          page,
          perPage,
        );
        console.log(`   Fetched ${pexelsVideos.length} videos from Pexels`);

        // Transform videos
        const transformedVideos = [];
        let transformErrors = 0;

        for (const pexelsVideo of pexelsVideos) {
          const transformed = transformPexelsVideo(pexelsVideo);
          if (transformed) {
            transformedVideos.push(transformed);
          } else {
            transformErrors++;
          }
        }

        // Upsert to database
        const { syncedCount, skippedCount } = await upsertVideos(
          db,
          transformedVideos,
        );

        totalSynced += syncedCount;
        totalSkipped += skippedCount;
        totalErrors += transformErrors;

        console.log(
          `   ✅ Synced: ${syncedCount} | Skipped: ${skippedCount} | Errors: ${transformErrors}\n`,
        );

        // Rate limiting: Wait 1 second between pages
        if (page < pagesToSync) {
          console.log("   ⏳ Waiting 1 second (rate limiting)...\n");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`   ❌ Error syncing page ${page}:`, error);
        console.log("");
      }
    }

    // Summary
    console.log("🎉 Seed complete!\n");
    console.log("📊 Summary:");
    console.log(`   Total synced: ${totalSynced} videos`);
    console.log(
      `   Total skipped: ${totalSkipped} videos (already in database)`,
    );
    console.log(
      `   Total errors: ${totalErrors} videos (transformation failed)`,
    );
    console.log(
      `   Total processed: ${totalSynced + totalSkipped + totalErrors} videos\n`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run seed
seedVideos();
