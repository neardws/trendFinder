import { handleCron } from "./controllers/cron";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    console.log(`Starting process to generate draft...`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Time: ${new Date().toISOString()}`);

    await handleCron();

    console.log(`✅ Process completed successfully!`);
    process.exit(0); // Ensure clean exit for GitHub Actions
  } catch (error) {
    console.error(`❌ Process failed:`, error);
    process.exit(1); // Exit with error code for GitHub Actions
  }
}

// Check if running in CI/CD environment (GitHub Actions, Railway, etc.)
const isCI = process.env.CI || process.env.GITHUB_ACTIONS;

if (isCI) {
  // In CI/CD: Run once and exit
  console.log("🤖 Running in CI/CD mode (one-time execution)");
  main();
} else {
  // Local development: Run immediately, then optionally schedule
  console.log("💻 Running in development mode");
  main();

  // Uncomment to enable local cron scheduling:
  // cron.schedule(`0 17 * * *`, async () => {
  //   console.log(`\n⏰ Cron job triggered at ${new Date().toISOString()}`);
  //   await main();
  // });
  // console.log("⏰ Cron job scheduled for 17:00 daily");
}
