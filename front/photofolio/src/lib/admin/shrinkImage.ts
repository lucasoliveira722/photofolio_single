import { fitWithin } from './resize';

const JPEG_QUALITY = 0.85;

// Browser-only: decodes the file (applying EXIF rotation), scales it to fit
// within the max edge, and re-encodes it as JPEG.
export async function shrinkImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not supported in this browser.');
    // JPEG has no transparency; paint transparent PNG areas white instead of black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error('Could not encode the image.');
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
