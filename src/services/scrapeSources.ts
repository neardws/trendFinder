import FirecrawlApp from "@mendable/firecrawl-js";
import dotenv from "dotenv";
import { z } from "zod";
import Parser from "rss-parser";

dotenv.config();

// Initialize Firecrawl
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Initialize RSS Parser
const parser = new Parser();

// Get RSSHub instance URL from environment or use default
const RSSHUB_INSTANCE = process.env.RSSHUB_INSTANCE || "https://rsshub.app";

// 1. Define the schema for our expected JSON
const StorySchema = z.object({
  headline: z.string().describe("Story or post headline"),
  link: z.string().describe("A link to the post or story"),
  date_posted: z.string().describe("The date the story or post was published"),
});

const StoriesSchema = z.object({
  stories: z
    .array(StorySchema)
    .describe("A list of today's AI or LLM-related stories"),
});

// Define the TypeScript type for a story using the schema
type Story = z.infer<typeof StorySchema>;

/**
 * Scrape sources using Firecrawl (for non-Twitter URLs) and the Twitter API.
 * Returns a combined array of story objects.
 */
export async function scrapeSources(
  sources: { identifier: string }[],
): Promise<Story[]> {
  // Explicitly type the stories array so it is Story[]
  const combinedText: { stories: Story[] } = { stories: [] };

  // Configure toggles for scrapers
  const useScrape = true;
  const useRSSHub = true;

  for (const sourceObj of sources) {
    const source = sourceObj.identifier;

    // --- 1) Handle Twitter/X sources via RSSHub ---
    if (source.includes("x.com") || source.includes("twitter.com")) {
      if (useRSSHub) {
        // Extract username from URL
        const usernameMatch = source.match(/(?:x\.com|twitter\.com)\/([^\/]+)/);
        if (!usernameMatch) continue;
        const username = usernameMatch[1];

        // Construct RSSHub RSS feed URL
        // Use query parameters directly: readable=1 for better formatting, includeRts=0 to exclude retweets
        const rsshubUrl = `${RSSHUB_INSTANCE}/twitter/user/${username}?readable=1&includeRts=0`;

        try {
          console.log(`Fetching RSS feed for @${username} from RSSHub...`);
          const feed = await parser.parseURL(rsshubUrl);

          if (!feed.items || feed.items.length === 0) {
            console.log(`No tweets found for username @${username}.`);
          } else {
            console.log(`Found ${feed.items.length} tweets from @${username}`);

            // Filter tweets from last 24 hours
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentItems = feed.items.filter((item) => {
              const pubDate = item.pubDate ? new Date(item.pubDate).getTime() : 0;
              return pubDate > oneDayAgo;
            });

            console.log(`${recentItems.length} tweets from last 24 hours`);

            const stories = recentItems.map(
              (item): Story => ({
                headline: item.title || item.contentSnippet || "No title",
                link: item.link || "",
                date_posted: item.pubDate
                  ? new Date(item.pubDate).toISOString()
                  : new Date().toISOString(),
              }),
            );
            combinedText.stories.push(...stories);
          }
        } catch (error: any) {
          console.error(`Error fetching RSS feed for @${username}:`, error.message);
        }
      }
    }
    // --- 2) Handle all other sources with Firecrawl ---
    else {
      if (useScrape) {
        const currentDate = new Date().toLocaleDateString();
        const promptForFirecrawl = `
Return only today's AI or LLM related story or post headlines and links in JSON format from the page content. 
They must be posted today, ${currentDate}. The format should be:
{
  "stories": [
    {
      "headline": "headline1",
      "link": "link1",
      "date_posted": "YYYY-MM-DD"
    },
    ...
  ]
}
If there are no AI or LLM stories from today, return {"stories": []}.

The source link is ${source}. 
If a story link is not absolute, prepend ${source} to make it absolute. 
Return only pure JSON in the specified format (no extra text, no markdown, no \`\`\`).
        `;
        try {
          const scrapeResult = await app.extract([source], {
            prompt: promptForFirecrawl,
            schema: StoriesSchema,
          });
          if (!scrapeResult.success) {
            throw new Error(`Failed to scrape: ${scrapeResult.error}`);
          }
          // Cast the result to our expected type
          const todayStories = scrapeResult.data as { stories: Story[] };
          if (!todayStories || !todayStories.stories) {
            console.error(
              `Scraped data from ${source} does not have a "stories" key.`,
              todayStories,
            );
            continue;
          }
          console.log(
            `Found ${todayStories.stories.length} stories from ${source}`,
          );
          combinedText.stories.push(...todayStories.stories);
        } catch (error: any) {
          if (error.statusCode === 429) {
            console.error(
              `Rate limit exceeded for ${source}. Skipping this source.`,
            );
          } else {
            console.error(`Error scraping source ${source}:`, error);
          }
        }
      }
    }
  }

  console.log("Combined Stories:", combinedText.stories);
  return combinedText.stories;
}
