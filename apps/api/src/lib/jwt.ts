import * as jose from "jose";
import type { JWTPayload } from "./types";

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
  throw new Error(
    "FATAL: JWT_SECRET must be set in the environment (minimum 32 characters)."
  );
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_ISSUER = process.env.JWT_ISSUER || "subito-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "subito-app";
/** Default 15m — override with ACCESS_TOKEN_EXPIRY in env for staging/production parity. */
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "30d";

export async function generateAccessToken(payload: {
  userId: string;
  role: "customer" | "partner" | "admin";
  phone: string;
}): Promise<string> {
  const jwt = await new jose.SignJWT({
    userId: payload.userId,
    role: payload.role,
    phone: payload.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return jwt;
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const jwt = await new jose.SignJWT({ type: "refresh", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return {
      sub: payload.sub as string,
      userId: payload.userId as string,
      role: payload.role as "customer" | "partner" | "admin",
      phone: payload.phone as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (payload.type !== "refresh") {
      return null;
    }

    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function generateVerificationToken(
  phone: string
): Promise<string> {
  const jwt = await new jose.SignJWT({ phone, type: "verification" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime("10m")
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifyVerificationToken(
  token: string
): Promise<{ phone: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });

    if (payload.type !== "verification") {
      return null;
    }

    return { phone: payload.phone as string };
  } catch {
    return null;
  }
}
