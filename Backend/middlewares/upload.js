import multer from "multer";

const storage = multer.memoryStorage();

const PHOTO_FIELDS = new Set([
  "studentPhoto",
  "fatherPhoto",
  "motherPhoto",
  "guardianPhoto",
]);

const PHOTO_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const DOC_MIMES = new Set([...PHOTO_MIMES, "application/pdf"]);

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const name = file.fieldname || "";

  if (PHOTO_FIELDS.has(name)) {
    if (PHOTO_MIMES.has(mime)) {
      return cb(null, true);
    }
    return cb(
      new Error("Invalid file type. Profile photos must be JPG, PNG, or WEBP."),
      false,
    );
  }

  if (DOC_MIMES.has(mime) || mime.startsWith("video/")) {
    return cb(null, true);
  }

  cb(new Error("Only JPG, PNG, WEBP, PDF, or video files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (better for video)
  },
});

/** Express error middleware — place after upload.any() / upload.single() */
export const handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === "LIMIT_FILE_SIZE" ? "File too large" : err.message,
    });
  }
  if (err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
};

export default upload;
