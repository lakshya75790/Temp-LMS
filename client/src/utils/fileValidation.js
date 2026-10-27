/**
 * Centralized File Validation Helper Utility for LMS WEB Application
 * 
 * Rules:
 * - Images: Max 5 MB per file
 * - Videos: Max 500 MB per file
 * - PDFs / Documents: Max 10 MB per file
 */

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_VIDEO_SIZE_MB = 500;
export const MAX_DOCUMENT_SIZE_MB = 10;

export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

/**
 * Validate image file size before upload
 */
export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image size exceeds the 5 MB limit. Please select a smaller image.'
    };
  }
  return { valid: true, error: null };
};

/**
 * Validate video file size before upload
 */
export const validateVideoFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Video size exceeds the 500 MB limit. Please select a smaller video.'
    };
  }
  return { valid: true, error: null };
};

/**
 * Validate document/PDF file size before upload
 */
export const validateDocumentFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds the 10 MB limit. Please select a smaller file.'
    };
  }
  return { valid: true, error: null };
};
