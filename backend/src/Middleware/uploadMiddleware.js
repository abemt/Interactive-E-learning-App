const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const uploadDirs = {
  images: path.join(__dirname, "../../uploads/images"),
  audio: path.join(__dirname, "../../uploads/audio")
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, uploadDirs.images);
    } else if (file.mimetype.startsWith("audio/")) {
      cb(null, uploadDirs.audio);
    } else {
      cb(new Error("Invalid file type"), null);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, basename + "-" + uniqueSuffix + ext);
  }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  // Allowed image formats
  const imageFormats = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  // Allowed audio formats (including Amharic audio)
  const audioFormats = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];

  if (imageFormats.includes(file.mimetype) || audioFormats.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images (JPEG, PNG, GIF, WebP) and audio (MP3, WAV, OGG, WebM) are allowed.`), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 10MB."
          });
        }
        return res.status(400).json({
          success: false,
          message: "File upload error: " + err.message
        });
      } else if (err) {
        // Other errors
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      // File uploaded successfully
      next();
    });
  };
};

// Middleware for multiple files upload (up to 5)
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const uploadHandler = upload.array(fieldName, maxCount);
    
    uploadHandler(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "One or more files too large. Maximum size is 10MB per file."
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} files allowed.`
          });
        }
        return res.status(400).json({
          success: false,
          message: "File upload error: " + err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      next();
    });
  };
};

// Middleware for mixed files (image + audio)
const uploadFields = () => {
  return (req, res, next) => {
    const uploadHandler = upload.fields([
      { name: "image", maxCount: 1 },
      { name: "audio", maxCount: 1 }
    ]);
    
    uploadHandler(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 10MB."
          });
        }
        return res.status(400).json({
          success: false,
          message: "File upload error: " + err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      next();
    });
  };
};

// Middleware for any file fields (useful for dynamic form arrays)
const uploadAny = (maxCount = 20) => {
  return (req, res, next) => {
    const uploadHandler = upload.any(maxCount);

    uploadHandler(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "One or more files are too large. Maximum size is 10MB per file."
          });
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} files allowed.`
          });
        }

        return res.status(400).json({
          success: false,
          message: "File upload error: " + err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      next();
    });
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadAny
};
