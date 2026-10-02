import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',testMatch:'browser.spec.ts',use:{baseURL:'http://127.0.0.1:5173',headless:true,channel:'msedge'},workers:1,reporter:'list'});
