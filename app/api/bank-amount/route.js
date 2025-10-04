import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import { bankAmountSchema } from "../../../lib/validations.ts";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";
import { notifyBankAmountChange } from "../../../lib/sse-notifications.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json({ amount: 0, code: "no_group" });
    }

    const db = await getDatabase();
    const bankAmount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT amount, updated_at, user_id FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    return NextResponse.json({
      amount: bankAmount?.amount || 0,
      updated_at: bankAmount?.updated_at || null,
      last_updated_user_id: bankAmount?.user_id || null,
    });
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
  const groupId = user.current_group_id;

  if (!groupId) {
    return NextResponse.json(
      { error: "No active group selected", code: "no_group" },
      { status: 403 }
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > 10_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = await getDatabase();

  const operation = body.operation || "set";
  const note = body.note || null;

  if (operation === "adjust") {
    const delta = typeof body.delta === "number" ? body.delta : 0;

    if (delta === 0) {
      return NextResponse.json(
        { error: "Delta must be non-zero" },
        { status: 400 }
      );
    }

    const currentRow = await new Promise((resolve, reject) => {
      db.get(
        "SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const currentAmount = currentRow?.amount || 0;
    const newAmount = Math.max(0, currentAmount + delta);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO bank_amounts (group_id, user_id, amount, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [groupId, user.id, newAmount],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO balance_history (group_id, user_id, old_amount, new_amount, delta, note, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [groupId, user.id, currentAmount, newAmount, delta, note],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const operationType = delta > 0 ? "add" : "subtract";
    notifyBankAmountChange(groupId, newAmount, operationType);

    return NextResponse.json({ success: true, amount: newAmount });
  } else {
    const validation = bankAmountSchema.safeParse({ amount: body.amount });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid amount", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount } = validation.data;

    const currentRow = await new Promise((resolve, reject) => {
      db.get(
        "SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const currentAmount = currentRow?.amount || 0;
    const delta = amount - currentAmount;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO bank_amounts (group_id, user_id, amount, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [groupId, user.id, amount],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO balance_history (group_id, user_id, old_amount, new_amount, delta, note, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [groupId, user.id, currentAmount, amount, delta, note],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    notifyBankAmountChange(groupId, amount, null);

    return NextResponse.json({ success: true, amount });
  }
});
