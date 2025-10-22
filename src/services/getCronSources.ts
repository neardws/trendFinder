import dotenv from "dotenv";

dotenv.config();

export async function getCronSources(): Promise<{ identifier: string }[]> {
  try {
    console.log("Fetching sources...");

    // Define sources - only Twitter/X sources (no web scraping)
    const sources: { identifier: string }[] = [
      // Twitter/X sources now use RSSHub (no API key required)
      { identifier: "https://x.com/skirano" },
      // AI Research & Academia
      { identifier: "https://x.com/AndrewYNg" },
      { identifier: "https://x.com/ylecun" },
      { identifier: "https://x.com/drfeifei" },
      { identifier: "https://x.com/fchollet" },
      { identifier: "https://x.com/GaryMarcus" },
      // AI Media & Journalists
      { identifier: "https://x.com/_KarenHao" },
      { identifier: "https://x.com/jackclarkSF" },
      { identifier: "https://x.com/BernardMarr" },
      // AI Entrepreneurs & Investors
      { identifier: "https://x.com/sama" },
      { identifier: "https://x.com/elonmusk" },
      { identifier: "https://x.com/Benioff" },
      // AI Tools & Applications
      { identifier: "https://x.com/kdnuggets" },
      { identifier: "https://x.com/Deeplearningai_" },
      { identifier: "https://x.com/AIalignment" },
      // Chinese AI Community
      { identifier: "https://x.com/bnu_chenshuo" },
      { identifier: "https://x.com/gefei55" },
      { identifier: "https://x.com/wshuyi" },
      { identifier: "https://x.com/felixding" },
      // Additional AI Researchers & Experts (from Excel sources)
      { identifier: "https://x.com/geoffreyhinton" }, // Deep Learning Pioneer
      { identifier: "https://x.com/karpathy" }, // Former OpenAI, Tesla AI
      { identifier: "https://x.com/demishassabis" }, // DeepMind CEO
      { identifier: "https://x.com/RichardSSutton" }, // Reinforcement Learning Pioneer
      { identifier: "https://x.com/emollick" }, // AI in Education
      { identifier: "https://x.com/mmitchell_ai" }, // AI Ethics Researcher
      { identifier: "https://x.com/timnitGebru" }, // AI Ethics Researcher
      { identifier: "https://x.com/jovialjoy" },
      // AI Investors & VCs
      { identifier: "https://x.com/eladgil" },
      { identifier: "https://x.com/sarahguo" },
      { identifier: "https://x.com/Conviction" },
      // AI Companies & Organizations
      { identifier: "https://x.com/OpenAI" },
      { identifier: "https://x.com/NVIDIA" },
      { identifier: "https://x.com/LinkedIn" },
      { identifier: "https://x.com/Neo4j" },
      { identifier: "https://x.com/Crynux" },
      // Other AI Practitioners
      { identifier: "https://x.com/advait_peri" },
      { identifier: "https://x.com/depindaddy" },
    ];

    // Return the full objects instead of mapping to strings
    return sources;
  } catch (error) {
    console.error(error);
    return [];
  }
}
