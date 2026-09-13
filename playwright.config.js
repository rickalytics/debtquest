import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'tests/e2e', fullyParallel:false, workers:1,
 use:{...devices['iPhone 13'], defaultBrowserType:'chromium', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']} : {}, baseURL:'http://127.0.0.1:4173', screenshot:'only-on-failure', trace:'retain-on-failure'},
 webServer:{command:'VITE_DATA_MODE=local npm run dev -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
});
