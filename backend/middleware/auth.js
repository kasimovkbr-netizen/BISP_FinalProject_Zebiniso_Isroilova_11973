/**
 * Authentication middleware
 * Verifies Supabase JWT tokens using Supabase Admin client
 * (avoids JWT secret algorithm issues)
 */

const { supabase } = require("../config/supabase");

async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "missing_auth_token",
        message: "Authentication token is required",
      },
    });
  }

  try {
    // Use Supabase to verify the token — no JWT secret needed
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "invalid_auth_token",
          message: "Invalid or expired token",
        },
      });
    }

    req.user = { uid: user.id, email: user.email || null };
    next();
  } catch (err) {
    console.error("[auth] error:", err.message);
    return res.status(401).json({
      success: false,
      error: { code: "invalid_auth_token", message: "Authentication failed" },
    });
  }
}

module.exports = { authenticateUser };
