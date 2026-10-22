import {defineConfig} from '@playwright/test';
import original from './upgrade.config';
export default defineConfig({...original,testMatch:['usage.browser.spec.ts','browser.spec.ts','upgrade.spec.ts'],workers:3});
