import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./app/tests/setup.js"],
    // Variables d'environnement par défaut pour les tests.
    // En CI, les variables du workflow (test.yml) prennent le dessus.
    // En local : créer un fichier .env.test à la racine pour surcharger ces valeurs
    // (ex: si ton postgres local a des credentials différents).
    env: {
      NODE_ENV: "test",
      // PostgreSQL — correspond au service container du workflow CI
      DB_NAME: "nomu_test",
      DB_USER: "test_user",
      DB_PASSWORD: "test_password",
      DB_HOST: "localhost",
      DB_PORT: "5432",
      // Meilisearch — non démarré en CI, les tests utilisent is_searchable:false
      MEILI_HOST: "http://localhost:7700",
      MEILI_API_KEY: "test_key",
      MEILI_INDEX_PROFILES: "profiles_test",
      // Secrets
      SESSION_SECRET: "test_session_secret",
      JWT_SECRET: "test_jwt_secret",
    },
  },
});
