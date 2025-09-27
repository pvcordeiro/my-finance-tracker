import { NextResponse } from "next/server";
import { validateSession, getSessionFromRequest } from "./session.js";

export function withAuth(handler) {
  return async (request, context) => {
    try {
      const sessionToken = getSessionFromRequest(request);

      if (!sessionToken) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const user = await validateSession(sessionToken);

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }

      request.user = user;

      return handler(request, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

export function getAuthenticatedUser(request) {
  return request.user || null;
}
