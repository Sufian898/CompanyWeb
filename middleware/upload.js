const multer = require('multer');
const path = require('path');

// Detect serverless environment (Vercel, AWS Lambda, etc.)
// In serverless, filesystem is read-only, so we use memory storage
const isServerless = !!(
  process.env.VERCEL || 
  process.env.VERCEL_ENV || 
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

// Storage configuration
// Use memory storage for serverless, disk storage for local development
// Memory storage stores files in req.file.buffer (no filesystem needed)
const storage = isServerless
  ? multer.memoryStorage() // Memory storage for serverless (files in req.file.buffer)
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const fs = require('fs');
        let uploadPath = 'uploads/';
        
        if (file.fieldname === 'cv' || file.fieldname === 'resume') {
          uploadPath = 'uploads/cvs';
        } else if (file.fieldname === 'logo') {
          uploadPath = 'uploads/company-logos';
        } else if (file.fieldname === 'jobImage' || file.fieldname === 'image') {
          uploadPath = 'uploads/job-images';
        } else {
          uploadPath = 'uploads/profile-images';
        }
        
        // Create directory if it doesn't exist (only in local dev)
        try {
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
        } catch (err) {
          // Ignore errors - directory creation is not critical
        }
        
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
      }
    });

// File filter
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Allow PDFs for CVs
  else if (file.mimetype === 'application/pdf' && (file.fieldname === 'cv' || file.fieldname === 'resume')) {
    cb(null, true);
  }
  // Allow common document types for CVs
  else if (
    (file.mimetype === 'application/msword' || 
     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') &&
    (file.fieldname === 'cv' || file.fieldname === 'resume')
  ) {
    cb(null, true);
  }
  else {
    cb(new Error('Invalid file type. Only images and PDF/DOC files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// Upload single file
exports.uploadSingle = (fieldName) => upload.single(fieldName);

// Upload multiple files
exports.uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

// Upload fields
exports.uploadFields = (fields) => upload.fields(fields);

// CV Upload specifically
exports.uploadCV = upload.single('cv');

// Profile Image Upload
exports.uploadProfileImage = upload.single('photo');

// Company Logo Upload
exports.uploadLogo = upload.single('logo');

// Job Image Upload
exports.uploadJobImage = upload.single('jobImage');

// Export all functions properly
const uploadModule = {
  uploadSingle: exports.uploadSingle,
  uploadMultiple: exports.uploadMultiple,
  uploadFields: exports.uploadFields,
  uploadCV: exports.uploadCV,
  uploadProfileImage: exports.uploadProfileImage,
  uploadLogo: exports.uploadLogo,
  uploadJobImage: exports.uploadJobImage
};

// Export default multer instance
Object.assign(uploadModule, upload);

module.exports = uploadModule;
