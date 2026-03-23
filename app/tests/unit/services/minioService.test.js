// app/tests/unit/services/minioService.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock minio client - les fonctions sont définies dans la factory
vi.mock("../../../config/minio.js", () => ({
  default: {
    putObject: vi.fn(),
    removeObject: vi.fn(),
    presignedGetObject: vi.fn(),
  },
  BUCKETS: {
    PROFILES: "profiles",
    MESSAGES: "messages",
  },
}));

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => "abc123def456",
    })),
  },
}));

// Import après les mocks
import minioService from "../../../services/storage/minioService.js";
import minioClient from "../../../config/minio.js";

describe("minioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset MINIO_PUBLIC_URL for each test
    delete process.env.MINIO_PUBLIC_URL;
  });

  // ─── generateFileName ──────────────────────────────────────────────────────

  describe("generateFileName", () => {
    it("génère un nom de fichier unique sans préfixe", () => {
      const fileName = minioService.generateFileName("photo.jpg");

      expect(fileName).toMatch(/^\d+-abc123def456\.jpg$/);
    });

    it("génère un nom de fichier unique avec préfixe", () => {
      const fileName = minioService.generateFileName("photo.png", "user_123");

      expect(fileName).toMatch(/^user_123\/\d+-abc123def456\.png$/);
    });

    it("utilise jpg par défaut si pas d'extension", () => {
      const fileName = minioService.generateFileName(null);

      expect(fileName).toMatch(/^\d+-abc123def456\.jpg$/);
    });

    it("extrait l'extension correctement", () => {
      const fileName = minioService.generateFileName("document.pdf");

      expect(fileName).toMatch(/\.pdf$/);
    });
  });

  // ─── parseBase64 ───────────────────────────────────────────────────────────

  describe("parseBase64", () => {
    it("parse une image JPEG base64", () => {
      const base64String = "data:image/jpeg;base64,/9j/4AAQ";

      const result = minioService.parseBase64(base64String);

      expect(result.mimeType).toBe("image/jpeg");
      expect(result.extension).toBe("jpeg");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("parse une image PNG base64", () => {
      const base64String = "data:image/png;base64,iVBORw0KGgo";

      const result = minioService.parseBase64(base64String);

      expect(result.mimeType).toBe("image/png");
      expect(result.extension).toBe("png");
    });

    it("parse un PDF base64", () => {
      const base64String = "data:application/pdf;base64,JVBERi0xLjQ";

      const result = minioService.parseBase64(base64String);

      expect(result.mimeType).toBe("application/pdf");
      expect(result.extension).toBe("pdf");
    });

    it("lance une erreur si format invalide", () => {
      const invalidBase64 = "not-a-valid-base64-string";

      expect(() => minioService.parseBase64(invalidBase64)).toThrow(
        "Invalid base64 format"
      );
    });

    it("lance une erreur si préfixe data: manquant", () => {
      const invalidBase64 = "image/jpeg;base64,/9j/4AAQ";

      expect(() => minioService.parseBase64(invalidBase64)).toThrow(
        "Invalid base64 format"
      );
    });
  });

  // ─── uploadBase64 ──────────────────────────────────────────────────────────

  describe("uploadBase64", () => {
    it("upload un fichier base64 vers Minio", async () => {
      const base64String = "data:image/jpeg;base64,/9j/4AAQ";
      minioClient.putObject.mockResolvedValue({});

      const result = await minioService.uploadBase64("profiles", base64String, "user_1");

      expect(minioClient.putObject).toHaveBeenCalledWith(
        "profiles",
        expect.stringMatching(/^user_1\/\d+-abc123def456\.jpeg$/),
        expect.any(Buffer),
        expect.any(Number),
        { "Content-Type": "image/jpeg" }
      );
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("objectName");
      expect(result).toHaveProperty("mimeType", "image/jpeg");
      expect(result).toHaveProperty("size");
    });

    it("upload sans préfixe", async () => {
      const base64String = "data:image/png;base64,iVBORw0KGgo";
      minioClient.putObject.mockResolvedValue({});

      const result = await minioService.uploadBase64("messages", base64String);

      expect(minioClient.putObject).toHaveBeenCalledWith(
        "messages",
        expect.stringMatching(/^\d+-abc123def456\.png$/),
        expect.any(Buffer),
        expect.any(Number),
        { "Content-Type": "image/png" }
      );
    });
  });

  // ─── uploadBuffer ──────────────────────────────────────────────────────────

  describe("uploadBuffer", () => {
    it("upload un buffer vers Minio", async () => {
      const buffer = Buffer.from("test content");
      minioClient.putObject.mockResolvedValue({});

      const result = await minioService.uploadBuffer(
        "profiles",
        buffer,
        "image/webp",
        "user_1"
      );

      expect(minioClient.putObject).toHaveBeenCalledWith(
        "profiles",
        expect.stringMatching(/^user_1\/\d+-abc123def456\.webp$/),
        buffer,
        buffer.length,
        { "Content-Type": "image/webp" }
      );
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("size", buffer.length);
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("supprime un fichier de Minio", async () => {
      minioClient.removeObject.mockResolvedValue({});

      await minioService.delete("profiles", "user_1/photo.jpg");

      expect(minioClient.removeObject).toHaveBeenCalledWith(
        "profiles",
        "user_1/photo.jpg"
      );
    });
  });

  // ─── deleteByUrl ───────────────────────────────────────────────────────────

  describe("deleteByUrl", () => {
    it("supprime un fichier par URL", async () => {
      minioClient.removeObject.mockResolvedValue({});

      await minioService.deleteByUrl("http://localhost:9000/profiles/user_1/photo.jpg");

      expect(minioClient.removeObject).toHaveBeenCalledWith(
        "profiles",
        "user_1/photo.jpg"
      );
    });

    // Note: Le code actuel lance une erreur car il destructure null
    // Ce test documente ce comportement (potentiel bug à corriger)
    it("lance une erreur si URL invalide", async () => {
      await expect(minioService.deleteByUrl("invalid-url")).rejects.toThrow();

      expect(minioClient.removeObject).not.toHaveBeenCalled();
    });
  });

  // ─── getPublicUrl ──────────────────────────────────────────────────────────

  describe("getPublicUrl", () => {
    it("génère l'URL publique par défaut", () => {
      const url = minioService.getPublicUrl("profiles", "user_1/photo.jpg");

      expect(url).toBe("http://localhost:9000/profiles/user_1/photo.jpg");
    });

    it("utilise MINIO_PUBLIC_URL si configuré", () => {
      process.env.MINIO_PUBLIC_URL = "https://cdn.example.com";

      const url = minioService.getPublicUrl("profiles", "user_1/photo.jpg");

      expect(url).toBe("https://cdn.example.com/profiles/user_1/photo.jpg");
    });
  });

  // ─── parseUrl ──────────────────────────────────────────────────────────────

  describe("parseUrl", () => {
    it("parse une URL Minio simple", () => {
      const result = minioService.parseUrl("http://localhost:9000/profiles/photo.jpg");

      expect(result).toEqual({
        bucket: "profiles",
        objectName: "photo.jpg",
      });
    });

    it("parse une URL avec sous-dossiers", () => {
      const result = minioService.parseUrl(
        "http://localhost:9000/profiles/user_1/2024/photo.jpg"
      );

      expect(result).toEqual({
        bucket: "profiles",
        objectName: "user_1/2024/photo.jpg",
      });
    });

    it("retourne null pour URL invalide", () => {
      const result = minioService.parseUrl("not-a-valid-url");

      expect(result).toBeNull();
    });

    it("retourne null pour URL sans path suffisant", () => {
      const result = minioService.parseUrl("http://localhost:9000/");

      expect(result).toBeNull();
    });
  });

  // ─── getSignedUrl ──────────────────────────────────────────────────────────

  describe("getSignedUrl", () => {
    it("génère une URL signée avec expiration par défaut", async () => {
      minioClient.presignedGetObject.mockResolvedValue(
        "http://localhost:9000/profiles/photo.jpg?signature=xxx"
      );

      const result = await minioService.getSignedUrl("profiles", "photo.jpg");

      expect(minioClient.presignedGetObject).toHaveBeenCalledWith(
        "profiles",
        "photo.jpg",
        3600 // 1 heure par défaut
      );
      expect(result).toContain("signature");
    });

    it("génère une URL signée avec expiration personnalisée", async () => {
      minioClient.presignedGetObject.mockResolvedValue("signed-url");

      await minioService.getSignedUrl("profiles", "photo.jpg", 7200);

      expect(minioClient.presignedGetObject).toHaveBeenCalledWith(
        "profiles",
        "photo.jpg",
        7200
      );
    });
  });

  // ─── uploadProfilePhoto ────────────────────────────────────────────────────

  describe("uploadProfilePhoto", () => {
    it("upload une photo de profil", async () => {
      const base64String = "data:image/jpeg;base64,/9j/4AAQ";
      minioClient.putObject.mockResolvedValue({});

      const result = await minioService.uploadProfilePhoto(123, base64String);

      expect(minioClient.putObject).toHaveBeenCalledWith(
        "profiles",
        expect.stringMatching(/^user_123\//),
        expect.any(Buffer),
        expect.any(Number),
        expect.any(Object)
      );
      expect(result).toHaveProperty("url");
    });
  });

  // ─── uploadMessageAttachment ───────────────────────────────────────────────

  describe("uploadMessageAttachment", () => {
    it("upload une pièce jointe de message", async () => {
      const base64String = "data:image/png;base64,iVBORw0KGgo";
      minioClient.putObject.mockResolvedValue({});

      const result = await minioService.uploadMessageAttachment(456, base64String);

      expect(minioClient.putObject).toHaveBeenCalledWith(
        "messages",
        expect.stringMatching(/^conversation_456\//),
        expect.any(Buffer),
        expect.any(Number),
        expect.any(Object)
      );
      expect(result).toHaveProperty("url");
    });
  });
});
