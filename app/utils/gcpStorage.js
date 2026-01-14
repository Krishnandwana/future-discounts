import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the storage client with credentials
const storage = new Storage({
  keyFilename: path.join(__dirname, '../../storage-credentials.json'),
  projectId: 'total-now-441210-u5',
});

const bucketName = 'convert-boost';
const bucket = storage.bucket(bucketName);

/**
 * Upload a base64 image to GCP bucket with compression and return the public URL
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} filename - Filename for the uploaded image
 * @param {string} contentType - MIME type of the image
 * @param {object} options - Compression options
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
export async function uploadImageToGCP(base64Data, filename, contentType, options = {}) {
  try {
    // Remove data URL prefix if present (data:image/jpeg;base64,)
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const originalBuffer = Buffer.from(base64Image, 'base64');
    
    // Compression settings with defaults
    const {
      maxWidth = 1200,
      maxHeight = 800,
      quality = 80,
      format = 'webp' // WebP provides better compression
    } = options;
    
    // Compress and resize the image
    let compressedBuffer;
    const sharpInstance = sharp(originalBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    
    // Apply format-specific compression
    if (format === 'webp') {
      compressedBuffer = await sharpInstance
        .webp({ quality, effort: 6 })
        .toBuffer();
    } else if (format === 'jpeg') {
      compressedBuffer = await sharpInstance
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } else if (format === 'png') {
      compressedBuffer = await sharpInstance
        .png({ compressionLevel: 9, quality })
        .toBuffer();
    } else {
      // Default to WebP for best compression
      compressedBuffer = await sharpInstance
        .webp({ quality, effort: 6 })
        .toBuffer();
    }
    
    // Create a unique filename with timestamp and proper extension
    const timestamp = Date.now();
    const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove original extension
    const uniqueFilename = `${timestamp}-${baseFilename}.${format}`;
    
    // Create file reference in the bucket
    const file = bucket.file(uniqueFilename);
    
    // Upload the compressed file
    await file.save(compressedBuffer, {
      metadata: {
        contentType: `image/${format}`,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
    // Log compression stats
    const originalSize = originalBuffer.length;
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    console.log(`Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% reduction)`);
    
    // Return the public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFilename}`;
    return publicUrl;
    
  } catch (error) {
    console.error('Error uploading image to GCP:', error);
    throw new Error('Failed to upload image to cloud storage');
  }
}

/**
 * Delete an image from GCP bucket
 * @param {string} imageUrl - Public URL of the image to delete
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteImageFromGCP(imageUrl) {
  try {
    // Extract filename from URL
    const filename = imageUrl.split('/').pop();
    
    if (!filename) {
      throw new Error('Invalid image URL');
    }
    
    // Delete the file
    await bucket.file(filename).delete();
    return true;
    
  } catch (error) {
    console.error('Error deleting image from GCP:', error);
    return false;
  }
}

/**
 * Check if a string is a base64 image
 * @param {string} str - String to check
 * @returns {boolean} - Whether the string is base64 image data
 */
export function isBase64Image(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/') || /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

/**
 * Extract content type from base64 data URL
 * @param {string} base64Data - Base64 data URL
 * @returns {string} - Content type
 */
export function getContentTypeFromBase64(base64Data) {
  const match = base64Data.match(/^data:image\/([a-z]+);base64,/);
  return match ? `image/${match[1]}` : 'image/jpeg';
}