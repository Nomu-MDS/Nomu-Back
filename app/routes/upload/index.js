import { Router } from "express";
import { authenticateFirebase } from "../../middleware/authMiddleware.js";
import minioService from "../../services/storage/minioService.js";
import { BUCKETS } from "../../config/minio.js";
import { Profile } from "../../models/index.js";

const router = Router();

// Taille maximale des fichiers (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Types MIME autorisés
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Valide un fichier base64
 */
const validateBase64File = (base64String) => {
  if (!base64String) {
    return { valid: false, error: "No file provided" };
  }

  const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: "Invalid base64 format" };
  }

  const mimeType = match[1];
  const base64Data = match[2];

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` };
  }

  // Calculer la taille (base64 = ~4/3 de la taille originale)
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  return { valid: true, mimeType, size: sizeInBytes };
};

/**
 * POST /upload/profile-photo
 * Upload une photo de profil
 */
router.post("/profile-photo", authenticateFirebase, async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const { image } = req.body;

    // Valider le fichier
    const validation = validateBase64File(image);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Récupérer le profil
    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Supprimer l'ancienne photo si elle existe sur Minio
    if (profile.image_url && profile.image_url.includes("minio")) {
      try {
        await minioService.deleteByUrl(profile.image_url);
      } catch (err) {
        console.warn("Could not delete old profile photo:", err.message);
      }
    }

    // Upload la nouvelle photo
    const result = await minioService.uploadProfilePhoto(userId, image);

    // Mettre à jour le profil
    await profile.update({ image_url: result.url });

    res.json({
      message: "Profile photo uploaded successfully",
      image_url: result.url,
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    res.status(500).json({ error: "Failed to upload profile photo" });
  }
});

/**
 * DELETE /upload/profile-photo
 * Supprime la photo de profil
 */
router.delete("/profile-photo", authenticateFirebase, async (req, res) => {
  try {
    const userId = req.user.dbUser.id;

    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.image_url && profile.image_url.includes("minio")) {
      await minioService.deleteByUrl(profile.image_url);
    }

    await profile.update({ image_url: null });

    res.json({ message: "Profile photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    res.status(500).json({ error: "Failed to delete profile photo" });
  }
});

/**
 * POST /upload/message-attachment
 * Upload une pièce jointe pour un message (utilisé par le front si nécessaire)
 */
router.post("/message-attachment", authenticateFirebase, async (req, res) => {
  try {
    const { image, conversation_id } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ error: "conversation_id is required" });
    }

    // Valider le fichier
    const validation = validateBase64File(image);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload le fichier
    const result = await minioService.uploadMessageAttachment(conversation_id, image);

    res.json({
      message: "Attachment uploaded successfully",
      url: result.url,
      size: result.size,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error("Error uploading message attachment:", error);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
});

export default router;
