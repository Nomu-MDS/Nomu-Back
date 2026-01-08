// app/scripts/setupAIEmbedder.js
import dotenv from "dotenv";

dotenv.config();

const MEILI_HOST = process.env.MEILI_HOST || "http://localhost:7700";
const MEILI_API_KEY = process.env.MEILI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function setupEmbedder() {
  if (!OPENAI_API_KEY) {
    console.error("❌ Erreur : OPENAI_API_KEY manquante dans .env");
    console.log("👉 Ajoute cette ligne dans ton .env :");
    console.log("   OPENAI_API_KEY=sk-votre-cle-openai");
    process.exit(1);
  }

  if (!MEILI_API_KEY) {
    console.error("❌ Erreur : MEILI_API_KEY manquante dans .env");
    process.exit(1);
  }

  const embedderConfig = {
    "profiles-openai": {
      source: "openAi",
      apiKey: OPENAI_API_KEY,
      model: "text-embedding-3-small",
      documentTemplate:
        "{{doc.name}}, {{doc.location}}. {{doc.biography}}. Intérêts: {{doc.interests}}. {{doc.country}}, {{doc.city}}",
    },
  };

  try {
    console.log("🔧 Configuration de l'embedder OpenAI pour les profils...");

    const response = await fetch(
      `${MEILI_HOST}/indexes/profiles/settings/embedders`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MEILI_API_KEY}`,
        },
        body: JSON.stringify(embedderConfig),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur Meilisearch: ${error}`);
    }

    const result = await response.json();
    console.log("✅ Embedder configuré avec succès!");
    console.log("📊 TaskUID:", result.taskUid);
    console.log(
      "\n⏳ Attends quelques secondes que Meilisearch traite la tâche..."
    );
    console.log("👉 Vérifie l'état avec :");
    console.log(
      `   curl ${MEILI_HOST}/tasks/${result.taskUid} -H "Authorization: Bearer ${MEILI_API_KEY}"`
    );
  } catch (err) {
    console.error("❌ Erreur lors de la configuration:", err.message);
    process.exit(1);
  }
}

setupEmbedder();
