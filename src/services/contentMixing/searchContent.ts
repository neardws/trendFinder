import Parser from "rss-parser";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const parser = new Parser();
const RSSHUB_INSTANCE = process.env.RSSHUB_INSTANCE || "https://rsshub.app";

interface SearchQuery {
  query: string;
  weight: number;
  category: string;
  enabled: boolean;
}

interface SearchConfig {
  keywords: SearchQuery[];
  filters: {
    minLikes: number;
    minRetweets: number;
    minFollowers: number;
    maxAgeHours: number;
  };
  limits: {
    maxResultsPerQuery: number;
    maxTotalResults: number;
  };
}

interface EnhancedStory {
  headline: string;
  link: string;
  date_posted: string;
  imageUrl?: string;
  author?: string;
  pubDate?: string;
  source: "account" | "search";
  searchQuery?: string;
}

/**
 * RSSHub keyword search for discovering AI content
 */
export async function searchAIContent(): Promise<EnhancedStory[]> {
  console.log("🔍 Starting AI content search via RSSHub...");

  const configPath = path.join(process.cwd(), "config", "search-queries.json");

  if (!fs.existsSync(configPath)) {
    console.log("⚠️  Search config not found, skipping search");
    return [];
  }

  const config: SearchConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const enabledQueries = config.keywords.filter((k) => k.enabled);

  console.log(`Found ${enabledQueries.length} enabled search queries`);

  const allStories: EnhancedStory[] = [];
  const maxPerQuery = config.limits.maxResultsPerQuery;

  for (const queryConfig of enabledQueries.slice(0, 5)) {
    // Limit to 5 queries per run
    try {
      console.log(`Searching: "${queryConfig.query}"`);

      // Encode query for URL
      const encodedQuery = encodeURIComponent(queryConfig.query);
      const rsshubUrl = `${RSSHUB_INSTANCE}/twitter/keyword/${encodedQuery}?readable=1`;

      const feed = await parser.parseURL(rsshubUrl);

      if (!feed.items || feed.items.length === 0) {
        console.log(`  No results for: ${queryConfig.query}`);
        continue;
      }

      console.log(`  Found ${feed.items.length} results`);

      // Filter by time (last 6 hours)
      const sixHoursAgo = Date.now() - config.filters.maxAgeHours * 60 * 60 * 1000;
      const recentItems = feed.items
        .filter((item) => {
          const pubDate = item.pubDate ? new Date(item.pubDate).getTime() : 0;
          return pubDate > sixHoursAgo;
        })
        .slice(0, maxPerQuery);

      console.log(`  ${recentItems.length} results from last ${config.filters.maxAgeHours}h`);

      const stories = recentItems.map((item): EnhancedStory => {
        // Extract image
        let imageUrl: string | undefined;
        if (item.content) {
          const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        }

        // Extract author from link
        const authorMatch = item.link?.match(/x\.com\/([^\/]+)/);
        const author = authorMatch ? authorMatch[1] : undefined;

        return {
          headline: item.title || item.contentSnippet || "No title",
          link: item.link || "",
          date_posted: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          imageUrl,
          author,
          pubDate: item.pubDate,
          source: "search",
          searchQuery: queryConfig.query,
        };
      });

      allStories.push(...stories);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`Error searching "${queryConfig.query}":`, error.message);
    }
  }

  console.log(`✅ Search complete: collected ${allStories.length} stories`);
  return allStories.slice(0, config.limits.maxTotalResults);
}
