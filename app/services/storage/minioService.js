import minioClient, { BUCKETS } from "../../config/minio.js";
import crypto from "crypto";

/**
 * Service de stockage Minio pour gérer les fichiers
 */
class MinioService {
  /**
   * Génère un nom de fichier unique
   */
  generateFileName(originalName, prefix = "") {
    const ext = originalName ? originalName.split(".").pop() : "jpg";
    const uniqueId = crypto.randomBytes(16).toString("hex");
    const timestamp = Date.now();
    return prefix ? `${prefix}/${timestamp}-${uniqueId}.${ext}` : `${timestamp}-${uniqueId}.${ext}`;
  }

  /**
   * Extrait les infos d'un fichier base64
   * @param {string} base64String - Format: data:image/jpeg;base64,/9j/4AAQ...
   * @returns {{ mimeType: string, extension: string, buffer: Buffer }}
   */
  parseBase64(base64String) {
    const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid base64 format");
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Extraire l'extension du mime type
    const extension = mimeType.split("/")[1] || "bin";

    return { mimeType, extension, buffer };
  }

  /**
   * Upload un fichier base64 vers Minio
   * @param {string} bucket - Le bucket cible (profiles, messages)
   * @param {string} base64String - Le fichier en base64
   * @param {string} prefix - Préfixe pour organiser les fichiers (ex: "user_123")
   * @returns {Promise<{ url: string, objectName: string }>}
   */
  async uploadBase64(bucket, base64String, prefix = "") {
    const { mimeType, extension, buffer } = this.parseBase64(base64String);

    const objectName = this.generateFileName(`file.${extension}`, prefix);

    await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
      "Content-Type": mimeType,
    });

    const url = this.getPublicUrl(bucket, objectName);

    return { url, objectName, mimeType, size: buffer.length };
  }

  /**
   * Upload un buffer directement vers Minio
   * @param {string} bucket - Le bucket cible
   * @param {Buffer} buffer - Le buffer du fichier
   * @param {string} mimeType - Le type MIME
   * @param {string} prefix - Préfixe optionnel
   * @returns {Promise<{ url: string, objectName: string }>}
   */
  async uploadBuffer(bucket, buffer, mimeType, prefix = "") {
    const extension = mimeType.split("/")[1] || "bin";
    const objectName = this.generateFileName(`file.${extension}`, prefix);

    await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
      "Content-Type": mimeType,
    });

    const url = this.getPublicUrl(bucket, objectName);

    return { url, objectName, mimeType, size: buffer.length };
  }

  /**
   * Supprime un fichier de Minio
   * @param {string} bucket - Le bucket
   * @param {string} objectName - Le nom de l'objet
   */
  async delete(bucket, objectName) {
    await minioClient.removeObject(bucket, objectName);
  }

  /**
   * Supprime un fichier à partir de son URL publique
   * @param {string} url - L'URL publique du fichier
   */
  async deleteByUrl(url) {
    const { bucket, objectName } = this.parseUrl(url);
    if (bucket && objectName) {
      await this.delete(bucket, objectName);
    }
  }

  /**
   * Génère l'URL publique d'un fichier
   * @param {string} bucket - Le bucket
   * @param {string} objectName - Le nom de l'objet
   * @returns {string}
   */
  getPublicUrl(bucket, objectName) {
    const endpoint = process.env.MINIO_PUBLIC_URL || `http://localhost:9000`;
    return `${endpoint}/${bucket}/${objectName}`;
  }

  /**
   * Parse une URL Minio pour extraire bucket et objectName
   * @param {string} url - L'URL à parser
   * @returns {{ bucket: string, objectName: string } | null}
   */
  parseUrl(url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const bucket = parts[0];
        const objectName = parts.slice(1).join("/");
        return { bucket, objectName };
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Génère une URL signée temporaire (pour fichiers privés)
   * @param {string} bucket - Le bucket
   * @param {string} objectName - Le nom de l'objet
   * @param {number} expirySeconds - Durée de validité (défaut: 1 heure)
   * @returns {Promise<string>}
   */
  async getSignedUrl(bucket, objectName, expirySeconds = 3600) {
    return await minioClient.presignedGetObject(bucket, objectName, expirySeconds);
  }

  /**
   * Upload une photo de profil
   * @param {number} userId - L'ID de l'utilisateur
   * @param {string} base64String - L'image en base64
   * @returns {Promise<{ url: string, objectName: string }>}
   */
  async uploadProfilePhoto(userId, base64String) {
    return await this.uploadBase64(BUCKETS.PROFILES, base64String, `user_${userId}`);
  }

  /**
   * Upload une pièce jointe de message
   * @param {number} conversationId - L'ID de la conversation
   * @param {string} base64String - Le fichier en base64
   * @returns {Promise<{ url: string, objectName: string }>}
   */
  async uploadMessageAttachment(conversationId, base64String) {
    return await this.uploadBase64(BUCKETS.MESSAGES, base64String, `conversation_${conversationId}`);
  }
}

export default new MinioService();
