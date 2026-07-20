import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  console.log("========== AUTH DEBUG ==========");
  console.log("Authorization header:", req.headers.authorization);
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
  console.log("JWT_SECRET value:", process.env.JWT_SECRET);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');

    console.log("JWT VERIFIED");
    console.log(decoded);

    req.user = decoded;
    next();

} catch (err) {

    console.log("VERIFY FAILED");
    console.log(err.name);
    console.log(err.message);

    return res.status(403).json({
        message: err.message
    });
}
}
