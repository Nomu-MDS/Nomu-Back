// app/tests/setup.js
// Chargé par vitest avant tout test (setupFiles dans vitest.config.js).
// Charge le .env.test si présent (variables locales du développeur),
// sinon les variables du vitest.config.js s'appliquent.
import dotenv from "dotenv";
dotenv.config({ path: ".env.test", override: false });
