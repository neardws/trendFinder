import { scrapeSources } from "../services/scrapeSources";
import { getCronSources } from "../services/getCronSources";
import { generateDraft } from "../services/generateDraft";
import { sendDraft } from "../services/sendDraft";
import { searchAIContent } from "../services/contentMixing/searchContent";
import { QualityFilter } from "../services/contentMixing/qualityFilter";
import { ContentMixer } from "../services/contentMixing/contentMixer";
import { AccountDiscovery } from "../services/contentMixing/accountDiscovery";
import { HistoryStorage } from "../services/storage/historyStorage";
import { EntityStorage } from "../services/storage/entityStorage";
import { InfluenceStorage } from "../services/storage/influenceStorage";
import { initDatabase } from "../services/storage/initDatabase";
import { ExportService, HTMLReportData } from "../services/export/exportService";
import fs from "fs";
import path from "path";

export const handleCron = async (): Promise<void> => {
  // Initialize database
  initDatabase();
  const historyStorage = new HistoryStorage();
  const entityStorage = new EntityStorage();
  const influenceStorage = new InfluenceStorage();

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
    console.log("   - Entity Recognition: Identifying key entities");
    console.log("   - Influence Scoring: Ranking account influence");
    console.log("   - Historical Data: Saving to database for future trend analysis");
    const rawStoriesString = JSON.stringify(mixed);
    const { draftPost, topics, avgQualityScore, entities, influenceReport } = await generateDraft(rawStoriesString);

    // Step 8: Save historical data
    console.log("\n💾 Step 7: Saving historical data...");
    const reportId = historyStorage.saveDailyReport(mixed, topics, avgQualityScore);
    console.log(`   Saved report ID: ${reportId}`);

    // Save entities if available
    if (entities && entities.entities && entities.entities.length > 0) {
      entityStorage.saveEntities(entities.entities);
      if (entities.relationships && entities.relationships.length > 0) {
        entityStorage.saveEntityRelationships(entities.relationships);
      }
      console.log(`   Saved ${entities.entities.length} entities and ${entities.relationships?.length || 0} relationships`);
    }

    // Save influence scores if available
    if (influenceReport && influenceReport.topAccounts && influenceReport.topAccounts.length > 0) {
      influenceStorage.saveInfluenceScores(influenceReport.topAccounts);
      console.log(`   Saved influence scores for ${influenceReport.topAccounts.length} accounts`);
    }

    // Step 9: Export reports (if enabled)
    try {
      const settingsPath = path.join(process.cwd(), "config", "report-settings.json");
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

      if (settings.exportSettings?.enableAutoExport) {
        console.log("\n📦 Step 8: Exporting reports to multiple formats...");
        const exportService = new ExportService();

        // Prepare report data for export
        const reportData: HTMLReportData = {
          title: `AI 趋势专题报告 | ${new Date().toLocaleDateString("zh-CN")}`,
          date: new Date().toLocaleDateString("zh-CN"),
          overview: {
            totalStories: mixed.length,
            totalTopics: topics.length,
            avgQualityScore: Math.round(avgQualityScore),
            topAccounts: influenceReport?.topAccounts?.length || 0,
          },
          topics: topics.map((topic: any, index: number) => ({
            emoji: ["🚀", "🧪", "💼", "📱", "🌐", "🎯", "⚡", "🔮"][index % 8],
            name: topic.name,
            summary: topic.summary,
            keywords: topic.keywords,
            stories: topic.stories.map((story: any) => ({
              headline: story.headline,
              author: story.author,
              date: story.date_posted,
              link: story.link,
              source: story.source === "account" ? "账号追踪" : "关键词搜索",
            })),
          })),
          entities: entities?.entities?.slice(0, 20).map((e: any) => ({
            name: e.name,
            type: e.type,
            context: e.context,
          })),
          influence: influenceReport?.topAccounts?.slice(0, 20).map((acc: any) => ({
            rank: acc.rank,
            account: acc.account,
            score: acc.overallScore,
            trend: acc.trend,
          })),
        };

        // Export to all configured formats
        const formats = settings.exportSettings?.formats || ["markdown"];
        const outputDir = settings.exportSettings?.outputDirectory || "exports";
        const results = [];

        for (const format of formats) {
          try {
            const result = await exportService.export(reportData, { format, outputDir });
            results.push(result);
            console.log(`   ✅ ${format.toUpperCase()}: ${result.filePath}`);
          } catch (error) {
            console.warn(`   ⚠️  ${format.toUpperCase()} export failed:`, (error as Error).message);
          }
        }

        console.log(`   Exported ${results.length}/${formats.length} formats successfully`);
      }
    } catch (error) {
      console.warn("Export step skipped:", (error as Error).message);
    }

    // Step 10: Send notifications
    console.log("\n📤 Step 9: Sending notifications...");
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
    console.log(`   - Report ID saved: ${reportId}`);
    if (entities && entities.entities) {
      console.log(`   - Entities identified: ${entities.entities.length}`);
    }
    if (influenceReport && influenceReport.topAccounts) {
      console.log(`   - Accounts scored: ${influenceReport.topAccounts.length}`);
      console.log(`   - KOLs identified: ${influenceReport.kols?.length || 0}`);
      console.log(`   - Rising stars: ${influenceReport.risingStars?.length || 0}`);
    }
  } catch (error) {
    console.error("❌ Error in handleCron:", error);
  } finally {
    // Close database connections
    historyStorage.close();
    entityStorage.close();
    influenceStorage.close();
  }
};
