import { NextResponse } from "next/server";
import { validateSession, getSessionFromRequest } from "./session.js";

/**
 * Middleware to protect API routes that require authentication
 * Returns the authenticated user or null if not authenticated
 */
export function withAuth(handler) {
  return async (request, context) => {
    try {
      // Get session token from cookie
      const sessionToken = getSessionFromRequest(request);

      if (!sessionToken) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      // Validate session and get user data
      const user = validateSession(sessionToken);

      if (!user) {
        return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
      }

      // Add user to request context
      request.user = user;

      // Call the original handler
      return handler(request, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Get the authenticated user from the request
 * Use this in protected routes after applying withAuth middleware
 */
export function getAuthenticatedUser(request) {
  return request.user || null;
}
