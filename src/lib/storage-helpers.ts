import { createClient } from './supabase/client';

export interface UploadProgress {
  percent: number;
  status: 'idle' | 'compressing' | 'uploading' | 'complete' | 'error';
  message: string;
}

/**
 * Compresses an image file client-side to WebP format using HTML5 Canvas.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ blob: Blob; fileName: string }> {
  // If it's a PDF or SVG, do not compress via canvas
  if (file.type === 'application/pdf' || file.type === 'image/svg+xml') {
    return { blob: file, fileName: file.name };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve({ blob: file, fileName: file.name });
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ blob: file, fileName: file.name });
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            resolve({ blob, fileName: cleanName });
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve({ blob: file, fileName: file.name });
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Validates file size (max 5MB) and mime types.
 */
export function validateFile(file: File, maxSizeBytes = 5 * 1024 * 1024): { valid: boolean; error?: string } {
  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeInMB}MB) exceeds the maximum allowed limit of 5MB.`,
    };
  }

  const allowedPrefixes = ['image/', 'application/pdf'];
  const isAllowed = allowedPrefixes.some((p) => file.type.startsWith(p));
  if (!isAllowed) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type}). Please upload an image (PNG, JPG, WebP, SVG) or PDF.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to Supabase Storage or falls back to data URI in demo mode.
 */
export async function uploadPortfolioMedia(
  file: File,
  folder = 'uploads',
  onProgress?: (progress: UploadProgress) => void
): Promise<{ url: string; fileName: string; isFallback: boolean }> {
  // 1. Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  onProgress?.({
    percent: 20,
    status: 'compressing',
    message: file.type.startsWith('image/') ? 'Compressing with WebP engine...' : 'Validating PDF document...',
  });

  // 2. Compress image if applicable
  const { blob, fileName: compressedName } = await compressImageToWebP(file);

  onProgress?.({
    percent: 50,
    status: 'uploading',
    message: 'Uploading to portfolio storage...',
  });

  const supabase = createClient();
  const sanitizedFileName = compressedName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueKey = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedFileName}`;

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('portfolio-media')
        .upload(uniqueKey, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: blob.type || file.type || 'application/octet-stream',
        });

      if (error) {
        console.error('Supabase Storage upload error:', error);
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from('portfolio-media')
          .getPublicUrl(data.path);

        onProgress?.({
          percent: 100,
          status: 'complete',
          message: 'Upload successful!',
        });

        return {
          url: publicUrlData.publicUrl,
          fileName: compressedName,
          isFallback: false,
        };
      }
    } catch (err: unknown) {
      console.error('Supabase storage exception:', err);
      if (err instanceof Error && err.message.startsWith('Storage upload failed:')) {
        throw err;
      }
      throw new Error(err instanceof Error ? err.message : 'Storage upload failed. Please try again.');
    }
  }

  // Fallback demo mode: Convert to Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onProgress?.({
        percent: 100,
        status: 'complete',
        message: 'Saved to session store (Demo Mode)',
      });
      resolve({
        url: e.target?.result as string,
        fileName: compressedName,
        isFallback: true,
      });
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
