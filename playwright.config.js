import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e-browser",
    timeout: 30000,
    use: {
        baseURL: "http://127.0.0.1:8099",
        headless: true,
        viewport: { width: 1280, height: 800 },
    },
    webServer: {
        // serves the production build from dist/
        command: "env PORT=8099 node scripts/server.js --mode=production",
        url: "http://127.0.0.1:8099/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
