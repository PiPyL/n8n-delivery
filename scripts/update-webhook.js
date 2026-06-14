const fs = require("fs");
const path = require("path");

function updateWebhook() {
  const tunnelUrl = process.argv[2];
  if (!tunnelUrl) {
    console.error("Error: Missing tunnel URL argument.");
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local not found.");
    process.exit(1);
  }

  let content = fs.readFileSync(envPath, "utf8");
  if (content.includes("WEBHOOK_URL=")) {
    content = content.replace(/^WEBHOOK_URL=.*/m, `WEBHOOK_URL=${tunnelUrl}`);
  } else {
    content += `\nWEBHOOK_URL=${tunnelUrl}\n`;
  }

  fs.writeFileSync(envPath, content, "utf8");
  console.log(`Successfully updated WEBHOOK_URL to ${tunnelUrl} in .env.local`);
}

updateWebhook();
