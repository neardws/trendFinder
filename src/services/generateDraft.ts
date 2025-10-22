import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generate a post draft based on scraped raw stories.
 * If no items are found, a fallback message is returned.
 * Uses DeepSeek API instead of OpenAI.
 */
export async function generateDraft(rawStories: string) {
  console.log(
    `Generating a post draft with raw stories (${rawStories.length} characters)...`,
  );

  try {
    const currentDate = new Date().toLocaleDateString();
    const header = `🚀 AI and LLM Trends on X for ${currentDate}\n\n`;

    // Instantiate the OpenAI-compatible client using DeepSeek API
    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });

    // Prepare messages with explicit literal types
    const messages: Array<{ role: "system" | "user"; content: string }> = [
      {
        role: "system",
        content:
          "You are a helpful assistant that creates a concise, bullet-pointed draft post based on input stories and tweets. " +
          "Return strictly valid JSON that has a key 'interestingTweetsOrStories' containing an array of items. " +
          "Each item should have a 'description' and a 'story_or_tweet_link' key.",
      },
      {
        role: "user",
        content: rawStories,
      },
    ];

    // Call the chat completions API using DeepSeek model
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" },
    });

    const rawJSON = completion.choices[0].message.content;
    if (!rawJSON) {
      console.log("No JSON output returned from DeepSeek.");
      return header + "No output.";
    }
    console.log(rawJSON);

    const parsedResponse = JSON.parse(rawJSON);

    // Check for either key and see if we have any content
    const contentArray =
      parsedResponse.interestingTweetsOrStories || parsedResponse.stories || [];
    if (contentArray.length === 0) {
      return header + "No trending stories or tweets found at this time.";
    }

    // Build the draft post using the content array
    const draft_post =
      header +
      contentArray
        .map(
          (item: any) =>
            `• ${item.description || item.headline}\n  ${
              item.story_or_tweet_link || item.link
            }`,
        )
        .join("\n\n");

    return draft_post;
  } catch (error) {
    console.error("Error generating draft post", error);
    return "Error generating draft post.";
  }
}
