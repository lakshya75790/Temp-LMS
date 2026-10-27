const { getCloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Extract Cloudinary publicId and resourceType from either a raw public_id or full Cloudinary URL
 */
const extractCloudinaryAssetInfo = (input, fallbackResourceType = 'image') => {
  if (!input || typeof input !== 'string') {
    return { publicId: null, resourceType: fallbackResourceType };
  }

  const str = input.trim();

  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const urlObj = new URL(str);
      const pathParts = urlObj.pathname.split('/');
      const uploadIdx = pathParts.findIndex(p => p === 'upload');

      if (uploadIdx !== -1 && uploadIdx + 1 < pathParts.length) {
        let detectedResourceType = fallbackResourceType;
        if (uploadIdx > 0 && ['image', 'video', 'raw'].includes(pathParts[uploadIdx - 1])) {
          detectedResourceType = pathParts[uploadIdx - 1];
        }

        let targetParts = pathParts.slice(uploadIdx + 1);
        if (targetParts[0] && /^v\d+$/.test(targetParts[0])) {
          targetParts = targetParts.slice(1);
        }

        let extractedPublicId = targetParts.join('/');
        if (detectedResourceType === 'image' || detectedResourceType === 'video') {
          extractedPublicId = extractedPublicId.replace(/\.[^/.]+$/, '');
        }

        return {
          publicId: extractedPublicId,
          resourceType: detectedResourceType
        };
      }
    } catch (err) {
      console.warn('[extractCloudinaryAssetInfo] Failed to parse URL:', err.message);
    }
  }

  return {
    publicId: str,
    resourceType: fallbackResourceType
  };
};

/**
 * Execute verified Cloudinary deletion for a publicId or URL
 */
const deleteMediaAsset = async (publicIdOrUrl, requestedResourceType = 'image') => {
  const { publicId, resourceType } = extractCloudinaryAssetInfo(publicIdOrUrl, requestedResourceType);

  if (!publicId) {
    throw new ApiError(400, 'Cloudinary publicId or valid media URL is required');
  }

  try {
    const cloudinaryInstance = getCloudinary();
    const destroyResult = await cloudinaryInstance.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });

    console.log(`[CloudinaryDelete] Asset: '${publicId}', ResourceType: '${resourceType}', Result:`, destroyResult);

    if (destroyResult.result === 'ok' || destroyResult.result === 'not found') {
      return { success: true, result: destroyResult.result, publicId, resourceType };
    }

    throw new Error(`Cloudinary status: ${destroyResult.result || 'error'}`);
  } catch (err) {
    console.error(`[CloudinaryDelete Error] Asset: '${publicId}', ResourceType: '${resourceType}':`, err.message || err);
    throw new ApiError(500, `Unable to delete the file from Cloudinary: ${err.message || 'Server error'}`);
  }
};

/**
 * Perform direct Cloudinary upload with proper resource-type timeouts
 */
const uploadToCloudinary = (file, folder, resourceType = 'auto') => {
  if (!file || !file.buffer) {
    return Promise.reject(new ApiError(400, 'File content is missing'));
  }

  return new Promise((resolve, reject) => {
    try {
      const cloudinaryInstance = getCloudinary();
      const options = {
        folder: `org_lms/${folder}`,
        resource_type: resourceType
      };

      if (resourceType === 'video') {
        options.timeout = 120000;
      } else {
        options.timeout = 30000;
      }

      const uploadStream = cloudinaryInstance.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            console.error(`[MediaUpload Error] Folder: ${folder}, ResourceType: ${resourceType}:`, error.message || error);
            return reject(new ApiError(500, `Media upload to Cloudinary failed: ${error.message || 'Cloudinary network error'}`));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration || 0
          });
        }
      );

      uploadStream.end(file.buffer);
    } catch (err) {
      console.error(`[MediaUpload Exception] Folder: ${folder}:`, err.message);
      reject(new ApiError(err.statusCode || 500, err.message || 'Cloudinary upload initialization failed'));
    }
  });
};

/**
 * @desc    Upload Image (Thumbnails, avatars)
 * @route   POST /api/media/upload-image
 * @access  Private (Instructor, Admin)
 */
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please select an image file to upload');
    }

    const result = await uploadToCloudinary(req.file, 'thumbnails', 'image');

    res.status(200).json(
      new ApiResponse(
        200,
        {
          url: result.url,
          publicId: result.publicId,
          public_id: result.publicId
        },
        'Image uploaded successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload Video Lecture
 * @route   POST /api/media/upload-video
 * @access  Private (Instructor, Admin)
 */
const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please select a video file to upload');
    }

    const result = await uploadToCloudinary(req.file, 'videos', 'video');

    res.status(200).json(
      new ApiResponse(
        200,
        {
          url: result.url,
          publicId: result.publicId,
          public_id: result.publicId,
          duration: result.duration || 0
        },
        'Video uploaded successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload PDF / Document Resource
 * @route   POST /api/media/upload-pdf
 * @access  Private (Instructor, Admin, Employee)
 */
const uploadPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please select a document file to upload');
    }

    const result = await uploadToCloudinary(req.file, 'resources', 'raw');

    res.status(200).json(
      new ApiResponse(
        200,
        {
          url: result.url,
          publicId: result.publicId,
          public_id: result.publicId,
          originalName: req.file.originalname
        },
        'Document uploaded successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Media Asset
 * @route   POST /api/media/delete
 * @access  Private (Instructor, Admin, Employee)
 */
const deleteMedia = async (req, res, next) => {
  try {
    const { publicId, public_id, url, resourceType } = req.body;
    const target = publicId || public_id || url;

    if (!target) {
      throw new ApiError(400, 'publicId or file URL is required for deletion');
    }

    const deleteResult = await deleteMediaAsset(target, resourceType || 'image');

    res.status(200).json(new ApiResponse(200, deleteResult, 'Media asset deleted successfully from Cloudinary'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  uploadVideo,
  uploadPdf,
  deleteMedia,
  deleteMediaAsset,
  extractCloudinaryAssetInfo
};
