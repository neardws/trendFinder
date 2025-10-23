import { scrapeSources } from "../services/scrapeSources";
import { getCronSources } from "../services/getCronSources";
import { SourceRecommendation } from "../services/sourceManagement/sourceRecommendation";

/**
 * Weekly source update script
 * Discovers new accounts and updates the sources.json configuration
 */
async function updateSources() {
  console.log("🔄 Starting weekly source update...\n");

  try {
    // Step 1: Get current sources and scrape latest content
    console.log("Step 1: Fetching latest content from existing sources...");
    const sources = await getCronSources();
    const stories = await scrapeSources(sources);
    console.log(`✅ Collected ${stories.length} stories\n`);

    // Step 2: Generate recommendations using AI
    console.log("Step 2: Analyzing content for new account recommendations...");
    const recommender = new SourceRecommendation();
    const candidates = await recommender.generateRecommendations(stories);
    console.log(`✅ Found ${candidates.length} candidate accounts\n`);

    // Step 3: Auto-add high-scoring candidates
    console.log("Step 3: Auto-adding high-scoring candidates (score >= 90)...");
    const addedCount = await recommender.autoAddCandidates(candidates);
    console.log(`✅ Auto-added ${addedCount} new sources\n`);

    // Step 4: Generate summary report
    console.log("📊 Update Summary:");
    console.log(`- Total candidates discovered: ${candidates.length}`);
    console.log(`- Auto-added sources: ${addedCount}`);
    console.log(`- Pending review: ${candidates.length - addedCount}`);

    if (candidates.length > 0) {
      console.log("\n📋 Top Recommendations:");
      candidates.slice(0, 5).forEach((c, i) => {
        console.log(`${i + 1}. @${c.username} (Score: ${c.score})`);
        console.log(`   Reason: ${c.reason}`);
        console.log(`   Mentions: ${c.mentionCount}`);
      });
    }

    console.log("\n✅ Source update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during source update:", error);
    process.exit(1);
  }
}

// Run the update
updateSources();
