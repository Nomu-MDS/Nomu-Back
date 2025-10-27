// app/scripts/enableVectorStore.js
import dotenv from "dotenv";

dotenv.config();

const MEILI_HOST = process.env.MEILI_HOST || "http://localhost:7700";
const MEILI_API_KEY = process.env.MEILI_API_KEY;

async function enableVectorStore() {
  if (!MEILI_API_KEY) {
    console.error("❌ Erreur : MEILI_API_KEY manquante dans .env");
    process.exit(1);
  }

  try {
    console.log("🔧 Activation de la feature vector store...");

    const response = await fetch(`${MEILI_HOST}/experimental-features`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_API_KEY}`,
      },
      body: JSON.stringify({
        vectorStore: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur Meilisearch: ${error}`);
    }

    const result = await response.json();
    console.log("✅ Feature vector store activée!");
    console.log("📊 Réponse:", result);
    
    console.log("\n⏳ Attends 2 secondes puis configure l'embedder...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("🔧 Configuration de l'embedder OpenAI...");
    
    // Maintenant configurer l'embedder
    const embedderConfig = {
      "users-openai": {
        source: "openAi",
        apiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
        documentTemplate:
          "Utilisateur {{doc.name}}, role {{doc.role}}, bio: {{doc.bio}}, basé à {{doc.location}}",
      },
    };

    const embedderResponse = await fetch(
      `${MEILI_HOST}/indexes/users/settings/embedders`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MEILI_API_KEY}`,
        },
        body: JSON.stringify(embedderConfig),
      }
    );

    if (!embedderResponse.ok) {
      const error = await embedderResponse.text();
      throw new Error(`Erreur embedder: ${error}`);
    }

    const embedderResult = await embedderResponse.json();
    console.log("✅ Embedder configuré avec succès!");
    console.log("📊 TaskUID:", embedderResult.taskUid);
    
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
}

enableVectorStore();

