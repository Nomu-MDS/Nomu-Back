# Guide d'intégration Frontend - Upload de fichiers (Minio)

## Vue d'ensemble

L'API supporte deux méthodes d'upload de fichiers :
1. **Base64 JSON** - Fichier encodé en base64 dans le body JSON
2. **Multipart/form-data (Multer)** - Upload classique via FormData

Les fichiers sont stockés sur **Minio** (S3-compatible) et accessibles publiquement.

## Configuration

### Types de fichiers autorisés
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

### Taille maximale
- **50 MB** par fichier

---

## Endpoints

### 1. Photo de profil

#### Upload (Base64)
```
POST /upload/profile-photo
Content-Type: application/json
Authorization: Bearer <token>

{
  "image": "data:image/png;base64,iVBORw0KGgo..."
}
```

#### Upload (Multer/FormData)
```
POST /upload/profile-photo/file
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  - image: <File>
```

#### Suppression
```
DELETE /upload/profile-photo
Authorization: Bearer <token>
```

### 2. Pièce jointe de message

#### Upload (Base64)
```
POST /upload/message-attachment
Content-Type: application/json
Authorization: Bearer <token>

{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "conversation_id": 1
}
```

#### Upload (Multer/FormData)
```
POST /upload/message-attachment/file
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  - image: <File>
  - conversation_id: 1
```

---

## Réponses

### Succès - Photo de profil
```json
{
  "message": "Profile photo uploaded successfully",
  "image_url": "http://localhost:9000/profiles/user_22/1234567890-abc123.png"
}
```

### Succès - Pièce jointe
```json
{
  "message": "Attachment uploaded successfully",
  "url": "http://localhost:9000/messages/conversation_1/1234567890-abc123.png",
  "size": 12345,
  "mimeType": "image/png"
}
```

### Erreurs
```json
{ "error": "No file provided" }
{ "error": "File type not allowed. Allowed: image/jpeg, image/png, image/gif, image/webp" }
{ "error": "File too large. Maximum size: 10MB" }
{ "error": "Profile not found" }
{ "error": "conversation_id is required" }
```

---

## Exemples d'implémentation React

### Service d'upload

```typescript
// services/uploadService.ts
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface UploadResponse {
  message: string;
  image_url?: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

// Upload avec FormData (recommandé)
export const uploadProfilePhoto = async (
  token: string,
  file: File
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/upload/profile-photo/file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

// Upload avec Base64 (alternative)
export const uploadProfilePhotoBase64 = async (
  token: string,
  base64Image: string
): Promise<UploadResponse> => {
  const response = await fetch(`${API_URL}/upload/profile-photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

// Supprimer la photo de profil
export const deleteProfilePhoto = async (token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/upload/profile-photo`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Delete failed');
  }
};

// Upload pièce jointe message
export const uploadMessageAttachment = async (
  token: string,
  file: File,
  conversationId: number
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('conversation_id', conversationId.toString());

  const response = await fetch(`${API_URL}/upload/message-attachment/file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};
```

### Composant Upload Photo de Profil

```tsx
// components/ProfilePhotoUpload.tsx
import React, { useState, useRef } from 'react';
import { uploadProfilePhoto, deleteProfilePhoto } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';

interface ProfilePhotoUploadProps {
  currentImageUrl?: string | null;
  onUploadSuccess: (imageUrl: string) => void;
  onDeleteSuccess: () => void;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentImageUrl,
  onUploadSuccess,
  onDeleteSuccess,
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validation côté client
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier est trop volumineux. Maximum 10 MB.');
      return;
    }

    // Prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadProfilePhoto(token, file);
      onUploadSuccess(result.image_url!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
      setPreview(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !currentImageUrl) return;

    setIsUploading(true);
    setError(null);

    try {
      await deleteProfilePhoto(token);
      setPreview(null);
      onDeleteSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="profile-photo-upload">
      <div className="photo-container">
        {preview ? (
          <img src={preview} alt="Photo de profil" className="profile-photo" />
        ) : (
          <div className="photo-placeholder">
            <span>Aucune photo</span>
          </div>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Upload en cours...' : 'Changer la photo'}
        </button>

        {currentImageUrl && (
          <button
            onClick={handleDelete}
            disabled={isUploading}
            className="delete-btn"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
```

### Composant Upload Pièce Jointe Message

```tsx
// components/MessageAttachment.tsx
import React, { useState, useRef } from 'react';
import { uploadMessageAttachment } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';

interface MessageAttachmentProps {
  conversationId: number;
  onUploadSuccess: (url: string) => void;
}

const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  conversationId,
  onUploadSuccess,
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Seules les images sont autorisées');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 10 MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadMessageAttachment(token, file, conversationId);
      onUploadSuccess(result.url!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="message-attachment">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Joindre une image"
      >
        {isUploading ? '...' : '📎'}
      </button>

      {error && <span className="error">{error}</span>}
    </div>
  );
};

export default MessageAttachment;
```

### Hook personnalisé useUpload

```typescript
// hooks/useUpload.ts
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseUploadOptions {
  maxSize?: number; // en bytes
  allowedTypes?: string[];
}

interface UseUploadReturn {
  upload: (file: File, endpoint: string, extraData?: Record<string, string>) => Promise<any>;
  isUploading: boolean;
  error: string | null;
  progress: number;
  reset: () => void;
}

const defaultOptions: UseUploadOptions = {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

export const useUpload = (options: UseUploadOptions = {}): UseUploadReturn => {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const config = { ...defaultOptions, ...options };

  const upload = useCallback(async (
    file: File,
    endpoint: string,
    extraData?: Record<string, string>
  ) => {
    if (!token) {
      throw new Error('Non authentifié');
    }

    // Validation
    if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
      const err = 'Type de fichier non autorisé';
      setError(err);
      throw new Error(err);
    }

    if (config.maxSize && file.size > config.maxSize) {
      const err = `Fichier trop volumineux (max ${config.maxSize / 1024 / 1024} MB)`;
      setError(err);
      throw new Error(err);
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      if (extraData) {
        Object.entries(extraData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      setProgress(100);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload échoué');
      }

      return response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [token, config.allowedTypes, config.maxSize]);

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
  }, []);

  return { upload, isUploading, error, progress, reset };
};
```

---

## Utilisation avec WebSocket (Messages)

Pour les messages via WebSocket, vous devez d'abord uploader l'image via HTTP, puis envoyer l'URL dans le message :

```typescript
// 1. Upload l'image via HTTP et récupérer l'URL
const uploadAndSendMessage = async (
  socket: Socket,
  token: string,
  conversationId: number,
  content: string,
  file?: File
) => {
  let attachmentUrl: string | undefined;

  // Si un fichier est fourni, l'uploader d'abord via HTTP
  if (file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('conversation_id', conversationId.toString());

    const response = await fetch('http://localhost:3001/upload/message-attachment/file', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    attachmentUrl = result.url; // URL Minio
  }

  // 2. Envoyer le message via WebSocket avec l'URL (pas le base64)
  socket.emit('send_message', {
    conversation_id: conversationId,
    content,
    attachment: attachmentUrl, // URL Minio, pas base64
  });
};
```

### Flux recommandé

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Front-end     │     │    API HTTP     │     │     Minio       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  POST /upload/...     │                       │
         │  (FormData + file)    │                       │
         │──────────────────────>│                       │
         │                       │   Upload file         │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │   URL Minio           │
         │                       │<──────────────────────│
         │   { url: "http://..." }                       │
         │<──────────────────────│                       │
         │                       │                       │
         │                       │                       │
┌────────┴────────┐     ┌────────┴────────┐              │
│   Front-end     │     │   WebSocket     │              │
└────────┬────────┘     └────────┬────────┘              │
         │                       │                       │
         │  emit('send_message', │                       │
         │  { attachment: URL }) │                       │
         │──────────────────────>│                       │
         │                       │   Save to DB          │
         │                       │   (URL only)          │
         │                       │                       │
         │  emit('new_message')  │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

### Avantages de cette approche

1. **Performance** - Pas de base64 (~33% overhead) transitant via WebSocket
2. **Fiabilité** - Upload HTTP avec retry possible, séparé du message
3. **UX** - Possibilité d'afficher une preview pendant l'upload
4. **Scalabilité** - WebSocket reste léger (juste du texte + URLs)

---

## URLs des fichiers

Les fichiers uploadés sont accessibles publiquement via Minio :

```
http://localhost:9000/profiles/user_{userId}/{timestamp}-{hash}.{ext}
http://localhost:9000/messages/conversation_{conversationId}/{timestamp}-{hash}.{ext}
```

### Affichage dans le front
```tsx
// Les URLs Minio sont directement utilisables dans les <img>
<img src={user.profile.image_url} alt="Profile" />
<img src={message.attachment} alt="Attachment" />
```

---

## Notes importantes

1. **Token Firebase** - Toutes les routes d'upload nécessitent un token Firebase valide
2. **Taille du body JSON** - Pour les uploads base64, Express accepte jusqu'à 10MB par défaut
3. **CORS** - Les images Minio sont accessibles publiquement (pas de problème CORS)
4. **Remplacement** - Un nouvel upload de photo de profil supprime automatiquement l'ancien fichier
5. **Messages WebSocket** - Le chatService upload automatiquement les attachments base64 vers Minio

## Résumé des endpoints

| Endpoint | Méthode | Format | Description |
|----------|---------|--------|-------------|
| `/upload/profile-photo` | POST | JSON base64 | Upload photo profil |
| `/upload/profile-photo/file` | POST | FormData | Upload photo profil (Multer) |
| `/upload/profile-photo` | DELETE | - | Supprimer photo profil |
| `/upload/message-attachment` | POST | JSON base64 | Upload pièce jointe |
| `/upload/message-attachment/file` | POST | FormData | Upload pièce jointe (Multer) |
