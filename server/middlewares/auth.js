import jwt from "jsonwebtoken";

const authUser = async (req, res, next) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    const decoded = jwt.decode(token); // optionally use jwt.verify if you have the secret

    if (!decoded || !decoded.clerkId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or clerkId missing",
      });
    }

    req.clerkId = decoded.clerkId; // ✅ use this instead
    next();
  } catch (error) {
    console.error("authUser error:", error.message);
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

export default authUser;
