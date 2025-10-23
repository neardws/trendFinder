import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

interface SourceMetadata {
  username: string;
  url: string;
  category: string;
  status: string;
  qualityScore: number;
}

interface SourceConfig {
  sources: SourceMetadata[];
}

export async function getCronSources(): Promise<{ identifier: string }[]> {
  try {
    console.log("Fetching sources from config file...");

    // Load sources from JSON config
    const configPath = path.join(process.cwd(), "config", "sources.json");

    if (!fs.existsSync(configPath)) {
      console.error("Config file not found, using fallback sources");
      return getFallbackSources();
    }

    const config: SourceConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Filter active sources only
    const activeSources = config.sources
      .filter((source) => source.status === "active")
      .map((source) => ({ identifier: source.url }));

    console.log(`Loaded ${activeSources.length} active sources from config`);
    return activeSources;
  } catch (error) {
    console.error("Error loading sources from config:", error);
    return getFallbackSources();
  }
}

// Fallback sources in case config file fails
function getFallbackSources(): { identifier: string }[] {
  return [
    { identifier: "https://x.com/AndrewYNg" },
    { identifier: "https://x.com/ylecun" },
    { identifier: "https://x.com/sama" },
    { identifier: "https://x.com/OpenAI" },
  ];
}
