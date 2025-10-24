import { scrapeSources } from "../services/scrapeSources";
import { getCronSources } from "../services/getCronSources";
import { generateDraft } from "../services/generateDraft";
import { sendDraft } from "../services/sendDraft";
import { searchAIContent } from "../services/contentMixing/searchContent";
import { QualityFilter } from "../services/contentMixing/qualityFilter";
import { ContentMixer } from "../services/contentMixing/contentMixer";
import { AccountDiscovery } from "../services/contentMixing/accountDiscovery";

export const handleCron = async (): Promise<void> => {
  try {
    console.log("=".repeat(60));
    console.log("🚀 Starting TrendFinder with Hybrid Data Sources");
    console.log("=".repeat(60));

    // Step 1: Scrape from tracked accounts
    console.log("\n📡 Step 1: Scraping tracked accounts...");
    const cronSources = await getCronSources();
    const accountStories = await scrapeSources(cronSources);
    console.log(`   Collected ${accountStories.length} stories from accounts`);

    // Step 2: Search for AI content via keywords
    console.log("\n🔍 Step 2: Searching AI content via keywords...");
    const searchStories = await searchAIContent();
    console.log(`   Collected ${searchStories.length} stories from search`);

    // Step 3: Combine all stories
    const allStories = [...accountStories, ...searchStories];
    console.log(`\n📊 Total stories collected: ${allStories.length}`);

    // Step 4: Quality filtering with AI
    console.log("\n🎯 Step 3: AI quality filtering and scoring...");
    const qualityFilter = new QualityFilter();
    const scoredStories = await qualityFilter.filterAndScore(allStories);
    console.log(`   ${scoredStories.length} stories passed quality threshold`);

    // Step 5: Mix content with dynamic ratio
    console.log("\n🎨 Step 4: Mixing content with dynamic ratio...");
    const contentMixer = new ContentMixer();
    const { mixed, stats } = await contentMixer.mix(scoredStories);
    console.log(`   Final mix: ${stats.accountStories} accounts + ${stats.searchStories} search`);
    console.log(`   Dynamic ratio: ${stats.accountRatio}% accounts, ${stats.searchRatio}% search`);
    console.log(`   Quality scores: Accounts ${stats.averageQuality.accounts}, Search ${stats.averageQuality.search}`);

    // Step 6: Discover new accounts from search results
    console.log("\n🔎 Step 5: Discovering new accounts from search...");
    const accountDiscovery = new AccountDiscovery();
    const searchOnlyStories = scoredStories.filter((s) => s.source === "search");
    const discovery = await accountDiscovery.discoverAccounts(searchOnlyStories);
    console.log(`   ${discovery.newAccounts} accounts auto-added, ${discovery.newCandidates} candidates for review`);

    // Step 7: Generate enhanced report (with topic clustering + deep analysis)
    console.log("\n✍️  Step 6: Generating Enhanced AI Trend Report...");
    console.log("   - Topic Clustering: AI-powered grouping");
    console.log("   - Deep Analysis: Technical insights + Impact assessment");
    console.log("   - Visualizations: Charts + Word cloud");
    const rawStoriesString = JSON.stringify(mixed);
    const draftPost = await generateDraft(rawStoriesString);

    // Step 8: Send notifications
    console.log("\n📤 Step 7: Sending notifications...");
    const result = await sendDraft(draftPost!);
    console.log(result);

    console.log("\n" + "=".repeat(60));
    console.log("✅ TrendFinder completed successfully!");
    console.log("=".repeat(60));
    console.log("\n📈 Summary:");
    console.log(`   - Total stories: ${allStories.length}`);
    console.log(`   - After quality filter: ${scoredStories.length}`);
    console.log(`   - Final report: ${mixed.length} stories`);
    console.log(`   - Mix ratio: ${stats.accountRatio}% accounts, ${stats.searchRatio}% search`);
    console.log(`   - Duplicates removed: ${stats.duplicatesRemoved}`);
    console.log(`   - New accounts discovered: ${discovery.newAccounts}`);
    console.log(`   - Candidates for review: ${discovery.newCandidates}`);
  } catch (error) {
    console.error("❌ Error in handleCron:", error);
  }
};
