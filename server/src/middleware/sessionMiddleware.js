// server/src/middleware/sessionMiddleware.js
import { randomBytes, createHash } from "node:crypto";

const SESSION_COOKIE_NAME = "document_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

// Generate a cryptographically secure session token
function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

// Hash the session token before using it in the database
function hashSessionToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

// Retrieve the session token from the request cookie
function getSessionToken(req) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === SESSION_COOKIE_NAME) {
      const token = valueParts.join("=");

      if (/^[a-f0-9]{64}$/.test(token)) {
        return token;
      }

      return null;
    }
  }

  return null;
}

// Identify or create a private document session
export function identifySession(req, res, next) {
  try {
    let token = getSessionToken(req);

    if (!token) {
      token = generateSessionToken();

      res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: SESSION_MAX_AGE,
        path: "/api/documents",
      });
    }

    // Attach the hashed session identifier to the request
    req.sessionId = hashSessionToken(token);

    next();
  } catch (error) {
    next(error);
  }
}