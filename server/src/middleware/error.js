export const notFound = (req, res) =>
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

export const errorHandler = (err, req, res, next) => {
  if (err.code === 11000)
    return res.status(409).json({ message: "Email already registered" });

  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
};