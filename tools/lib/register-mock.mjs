// Used as `node --import ./tools/lib/register-mock.mjs ...` so the game runs in Node without a browser.
import { register } from 'node:module';

register('./mock-loader.mjs', import.meta.url);
