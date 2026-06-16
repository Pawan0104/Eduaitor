import multer from "multer";

const storage = multer.memoryStorage();

// Browsers are inconsistent about the mimetype they report for .csv,
// so we allow both common ones plus the two Excel formats.
const allowedMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
  "application/csv",
  "application/octet-stream", // some browsers send this for .csv/.xls
];

const allowedExtensions = [".xlsx", ".xls", ".csv"];

const fileFilter = (req, file, cb) => {
  const hasAllowedExt = allowedExtensions.some((ext) =>
    file.originalname.toLowerCase().endsWith(ext),
  );

  if (allowedMimeTypes.includes(file.mimetype) && hasAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx, .xls, or .csv files are allowed"), false);
  }
};

const uploadSpreadsheet = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB is plenty for a student roster
  },
});

export default uploadSpreadsheet;