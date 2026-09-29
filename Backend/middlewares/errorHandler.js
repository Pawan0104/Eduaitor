const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Never leak internal details to the client; log the full error server-side.
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);

  // Multer / upload rejections already carry user-safe wording.
  const statusCode =
    err?.status || err?.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  const isServerFault = statusCode >= 500;

  res.status(statusCode).json({
    success: false,
    message:
      err?.message ||
      (isServerFault ? "Something went wrong. Please try again." : "Server Error"),
  });
};

export default errorHandler;
