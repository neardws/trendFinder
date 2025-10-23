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

    // Prepare enhanced system prompt for better analysis
    const systemPrompt = `你是一个专业的 AI 趋势分析师。分析今天的 AI 领域推文和新闻，生成专业的趋势报告。

要求：
1. 按重要性排序（5星最重要，1星一般），每条信息评估其影响力和价值
2. 识别今日的核心趋势（不超过3个简洁要点）
3. 统计热门话题标签和关键词（提取#开头的标签和高频词汇）
4. 找出最活跃的账号
5. 为每条信息生成简洁有力的描述（不超过80字）

输出严格的 JSON 格式：
{
  "summary": "今日核心趋势总结（50字内，概括主要方向）",
  "topTopics": ["#话题1", "#话题2", "#话题3"],
  "accountStats": {
    "mostActive": "@账号名",
    "totalTweets": 数字
  },
  "stories": [
    {
      "title": "标题（精炼到15字内）",
      "description": "描述（80字内，突出亮点和价值）",
      "link": "原链接",
      "imageUrl": "图片链接（如有）",
      "author": "@作者",
      "importance": 1-5,
      "category": "类别：产品发布/技术进展/行业动态/研究成果"
    }
  ]
}

注意：
- 按 importance 从高到低排序 stories
- description 要有吸引力，突出为什么重要
- 识别相同主题的内容，避免重复
- topTopics 必须是真实出现的话题标签`;

    const messages: Array<{ role: "system" | "user"; content: string }> = [
      {
        role: "system",
        content: systemPrompt,
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

    // Extract components from the response
    const summary = parsedResponse.summary || "今日 AI 领域动态";
    const topTopics = parsedResponse.topTopics || [];
    const accountStats = parsedResponse.accountStats || { mostActive: "N/A", totalTweets: 0 };
    const stories = parsedResponse.stories || [];

    if (stories.length === 0) {
      return header + "No trending stories or tweets found at this time.";
    }

    // Build enhanced Markdown report
    let draft_post = `# 🤖 AI 趋势日报 | ${currentDate}\n\n`;

    // Summary section
    draft_post += `> 💡 **今日趋势:** ${summary}\n`;
    draft_post += `> 📊 监控 **41** 账号 | `;
    draft_post += `最活跃 **${accountStats.mostActive}** (${accountStats.totalTweets}条)\n\n`;

    // Hot topics
    if (topTopics.length > 0) {
      draft_post += `🔥 **热门话题:** ${topTopics.join(' ')} \n\n`;
    }

    draft_post += `---\n\n`;

    // Group stories by importance (5-star first)
    const groupedStories: { [key: number]: any[] } = {};
    stories.forEach((story: any) => {
      const importance = story.importance || 3;
      if (!groupedStories[importance]) {
        groupedStories[importance] = [];
      }
      groupedStories[importance].push(story);
    });

    // Output stories from highest to lowest importance
    for (let level = 5; level >= 3; level--) {
      const storiesAtLevel = groupedStories[level] || [];
      if (storiesAtLevel.length === 0) continue;

      // Star rating header
      const stars = '⭐'.repeat(level);
      const levelName = level === 5 ? '最重要' : level === 4 ? '值得关注' : '一般关注';
      draft_post += `## ${stars} ${levelName}\n\n`;

      storiesAtLevel.forEach((story: any, index: number) => {
        // Title
        draft_post += `### ${index + 1}. ${story.title || story.headline}\n\n`;

        // Image (if available)
        if (story.imageUrl) {
          draft_post += `![](${story.imageUrl})\n\n`;
        }

        // Description
        draft_post += `${story.description}\n\n`;

        // Metadata
        if (story.author) {
          draft_post += `👤 ${story.author} `;
        }
        if (story.category) {
          draft_post += `| 📂 ${story.category} `;
        }
        draft_post += `\n\n`;

        // Link
        draft_post += `🔗 [查看详情](${story.link})\n\n`;

        draft_post += `---\n\n`;
      });
    }

    // Footer with timestamp
    draft_post += `\n📅 报告生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`;
    draft_post += `🤖 由 [TrendFinder](https://github.com/neardws/trendFinder) 自动生成`;

    return draft_post;
  } catch (error) {
    console.error("Error generating draft post", error);
    return "Error generating draft post.";
  }
}
