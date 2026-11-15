const baseUrl = process.env.APP_BASE_URL;
const cronSecret = process.env.CRON_SECRET;

if (!baseUrl || !cronSecret) {
  throw new Error("APP_BASE_URL and CRON_SECRET are required for the scheduled tick.");
}

const response = await fetch(new URL("/api/cron/tick", baseUrl), {
  method: "POST",
  headers: { "x-cron-secret": cronSecret },
});

if (!response.ok) {
  console.error(`Dhaaga cron tick failed with HTTP ${response.status}.`);
  process.exitCode = 1;
} else {
  console.info("Dhaaga cron tick completed.");
}
