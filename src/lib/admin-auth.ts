import { createHmac, timingSafeEqual } from "crypto";

export function createAdminToken() {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
        throw new Error("ADMIN_SESSION_SECRET is not configured");
    }

    const signature = createHmac("sha256", secret)
        .update(String(expiresAt))
        .digest("hex");

    return `${expiresAt}.${signature}`;
}

export function verifyAdminToken(token?: string) {
    if (!token) return false;

    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return false;

    const [expiry, suppliedSignature] = token.split(".");
    const expiresAt = Number(expiry);

    if (!expiresAt || expiresAt < Date.now() || !suppliedSignature) {
        return false;
    }

    const expectedSignature = createHmac("sha256", secret)
        .update(String(expiresAt))
        .digest("hex");

    const supplied = Buffer.from(suppliedSignature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    return supplied.length === expected.length &&
        timingSafeEqual(supplied, expected);
}