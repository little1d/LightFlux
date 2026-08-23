import { authenticatedFetch } from './authApi';

// Direct `process.env.EXPO_PUBLIC_*` access so Expo inlines the value at build
// time; reading through an alias leaves it undefined in the web export.
const uploadApiUrl = (
  process.env.EXPO_PUBLIC_UPLOAD_API_URL ??
  process.env.EXPO_PUBLIC_AUTH_API_URL ??
  ''
).replace(/\/$/, '');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export type ImageUploadErrorCode =
  | 'not-configured'
  | 'too-large'
  | 'unsupported'
  | 'upload-failed';

export class ImageUploadError extends Error {
  code: ImageUploadErrorCode;

  constructor(code: ImageUploadErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

interface UploadResponse {
  error?: string;
  url?: string;
}

const uploadImage = async (
  imageBody: Blob,
  contentType: string,
  size: number,
): Promise<string> => {
  if (!uploadApiUrl) {
    throw new ImageUploadError(
      'not-configured',
      'Image upload API is not configured.',
    );
  }

  if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
    throw new ImageUploadError(
      'unsupported',
      'This image type is not supported.',
    );
  }

  if (size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError(
      'too-large',
      'The image exceeds the upload limit.',
    );
  }

  const response = await authenticatedFetch(`${uploadApiUrl}/api/uploads`, {
    body: imageBody,
    headers: {
      'Content-Type': contentType,
    },
    method: 'POST',
  });
  const responseBody = (await response.json()) as UploadResponse;

  if (!response.ok || !responseBody.url) {
    throw new ImageUploadError(
      'upload-failed',
      responseBody.error || 'Unable to upload image.',
    );
  }

  const imageUrl = new URL(responseBody.url);
  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    throw new ImageUploadError(
      'upload-failed',
      'The upload API returned an invalid image URL.',
    );
  }

  return imageUrl.toString();
};

export const uploadTaskImage = async (file: File): Promise<string> =>
  uploadImage(file, file.type, file.size);

export const uploadProfileImage = async ({
  file,
  fileSize,
  mimeType,
  uri,
}: {
  file?: File;
  fileSize?: number;
  mimeType?: string;
  uri: string;
}): Promise<string> => {
  let body: Blob;
  if (file) {
    body = file;
  } else {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new ImageUploadError(
        'upload-failed',
        'Unable to read the selected image.',
      );
    }
    body = await response.blob();
  }

  return uploadImage(
    body,
    mimeType || body.type,
    fileSize ?? body.size,
  );
};
