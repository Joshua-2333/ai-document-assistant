// server/src/middleware/visitorMiddleware.js
import { createHmac } from "node:crypto";

const visitorHashSecret = process.env.VISITOR_HASH_SECRET;

// Validate the secret during server startup
if (!/^[a-f0-9]{64}$/i.test(visitorHashSecret || "")) {
  throw new Error("Invalid VISITOR_HASH_SECRET configuration.");
}

// Generate a consistent visitor ID from an IP address
export function generateVisitorId(ipAddress) {
  if (
    typeof ipAddress !== "string" ||
    !ipAddress.trim()
  ) {
    throw new Error("Invalid visitor IP address.");
  }

  // Normalize IPv4-mapped IPv6 addresses
  const normalizedIp = ipAddress
    .trim()
    .toLowerCase()
    .replace(/^::ffff:/, "");

  return createHmac(
    "sha256",
    Buffer.from(visitorHashSecret, "hex")
  )
    .update(normalizedIp)
    .digest("hex");
}

// Attach the generated visitor ID to the Express request
export function identifyVisitor(req, res, next) {
  try {
    req.visitorId = generateVisitorId(req.ip);

    next();
  } catch (error) {
    next(error);
  }
}