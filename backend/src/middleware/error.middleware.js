function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || (err.name === "ValidationError" ? 400 : 500);

  if (err.name === "MulterError") {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : err.message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV !== "production" ? { error: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
