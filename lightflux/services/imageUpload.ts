import { authenticatedFetch } from './authApi';

const publicEnvironment = process.env as Record<string, string | undefined>;
const uploadApiUrl = (
  publicEnvironment.EXPO_PUBLIC_UPLOAD_API_URL ??
  publicEnvironment.EXPO_PUBLIC_AUTH_API_URL ??
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

export const uploadTaskImage = async (file: File): Promise<string> => {
  if (!uploadApiUrl) {
    throw new ImageUploadError(
      'not-configured',
      'Image upload API is not configured.',
    );
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new ImageUploadError(
      'unsupported',
      'This image type is not supported.',
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError(
      'too-large',
      'The image exceeds the upload limit.',
    );
  }

  const response = await authenticatedFetch(`${uploadApiUrl}/api/uploads`, {
    body: file,
    headers: {
      'Content-Type': file.type,
    },
    method: 'POST',
  });
  const body = (await response.json()) as UploadResponse;

  if (!response.ok || !body.url) {
    throw new ImageUploadError(
      'upload-failed',
      body.error || 'Unable to upload image.',
    );
  }

  const imageUrl = new URL(body.url);
  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    throw new ImageUploadError(
      'upload-failed',
      'The upload API returned an invalid image URL.',
    );
  }

  return imageUrl.toString();
};
