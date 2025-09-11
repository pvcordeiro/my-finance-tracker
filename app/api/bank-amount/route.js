import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import { bankAmountSchema } from "../../../lib/validations.ts";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const userId = user.id;

    const db = await getDatabase();
    const bankAmount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT amount FROM bank_amounts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    return NextResponse.json({ amount: bankAmount?.amount || 0 });
  } catch (error) {
    console.error("Get bank amount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request) => {
  const user = getAuthenticatedUser(request);
  const userId = user.id;

  const body = await request.json();

  // Validate input
  const validation = bankAmountSchema.safeParse({ amount: body.amount });
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid amount", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { amount } = validation.data;

  const db = await getDatabase();

  // Insert new bank amount entry (keeping history)
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO bank_amounts (user_id, amount, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, amount],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return NextResponse.json({ success: true, amount });
});
