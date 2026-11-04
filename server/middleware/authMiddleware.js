import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please login."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!Number.isInteger(decoded.userId)) {
      return res.status(401).json({
        message: "Invalid authentication token."
      });
    }

    req.userId = decoded.userId;

    next();

  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
};