import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function sendDraftToDiscord(draft_post: string) {
  try {
    const response = await axios.post(
      process.env.DISCORD_WEBHOOK_URL || '',
      {
        content: draft_post,
        flags: 4 // SUPPRESS_EMBEDS
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return `Success sending draft to Discord webhook at ${new Date().toISOString()}`;
  } catch (error) {
    console.log('Error sending draft to Discord webhook');
    console.error(error);
    throw error;
  }
}

async function sendDraftToSlack(draft_post: string) {
  try {
    const response = await axios.post(
      process.env.SLACK_WEBHOOK_URL || '',
      {
        text: draft_post,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return `Success sending draft to webhook at ${new Date().toISOString()}`;
  } catch (error) {
    console.log('error sending draft to webhook');
    console.log(error);
  }
}

async function sendDraftToServerChan(draft_post: string) {
  try {
    const sendKey = process.env.SERVERCHAN_SENDKEY;
    if (!sendKey) {
      throw new Error('SERVERCHAN_SENDKEY is not configured');
    }

    // Extract title from draft_post (first line)
    const lines = draft_post.split('\n');
    const title = lines[0] || 'AI Trends Update';
    const content = draft_post;

    const response = await axios.post(
      `https://sctapi.ftqq.com/${sendKey}.send`,
      {
        title: title,
        desp: content,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return `Success sending draft to ServerChan (WeChat) at ${new Date().toISOString()}`;
  } catch (error) {
    console.log('Error sending draft to ServerChan');
    console.error(error);
    throw error;
  }
}

export async function sendDraft(draft_post: string) {
  const notificationDriver = process.env.NOTIFICATION_DRIVER?.toLowerCase() || '';

  // Support multiple drivers separated by comma
  const drivers = notificationDriver.split(',').map(d => d.trim()).filter(d => d);

  if (drivers.length === 0) {
    throw new Error('NOTIFICATION_DRIVER is not configured');
  }

  console.log(`Sending notifications to: ${drivers.join(', ')}`);

  // Send to all configured drivers in parallel
  const results = await Promise.allSettled(
    drivers.map(async (driver) => {
      switch (driver) {
        case 'slack':
          return await sendDraftToSlack(draft_post);
        case 'discord':
          return await sendDraftToDiscord(draft_post);
        case 'wechat':
        case 'serverchan':
          return await sendDraftToServerChan(draft_post);
        default:
          throw new Error(`Unsupported notification driver: ${driver}`);
      }
    })
  );

  // Log results
  const successResults: string[] = [];
  const failedResults: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successResults.push(`${drivers[index]}: ${result.value}`);
    } else {
      failedResults.push(`${drivers[index]}: ${result.reason}`);
    }
  });

  if (successResults.length > 0) {
    console.log('Successful notifications:', successResults.join('\n'));
  }
  if (failedResults.length > 0) {
    console.error('Failed notifications:', failedResults.join('\n'));
  }

  // Return summary
  return `Sent to ${successResults.length}/${drivers.length} platform(s) successfully`;
}