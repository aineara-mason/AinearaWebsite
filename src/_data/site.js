const ASCEND_STATUS = "waitlist";          // launch day: "live"
const ASCEND_APP_STORE_URL = "";           // launch day: https://apps.apple.com/…
const testLiveUrl = process.env.AINEARA_TEST_ASCEND_LIVE_URL || "";   // tests only
const status = testLiveUrl ? "live" : ASCEND_STATUS;
export default { name: "Aineara", legalName: "Aineara LLC", url: "https://aineara.com",
  emails: { hello: "hello@aineara.com", support: "support@aineara.com", privacy: "privacy@aineara.com" },
  analyticsToken: "411851aee5a1405bae51700fa7d882e6",
  legal: { privacyUpdated: "October 1, 2026" },   // T13 sets the real publish date
  apps: { ascend: { status, appStoreUrl: testLiveUrl || ASCEND_APP_STORE_URL, live: status === "live" }, sillage: { status: "in-development" } } };
