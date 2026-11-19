import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import { withAuth, getAuthenticatedUser } from "../../../lib/auth-middleware.js";
import { getCreditCardsWithPurchases, syncCreditCardBills, validateCreditCardName } from "../../../lib/credit-cards.js";
import { notifyEntryChange } from "../../../lib/sse-notifications.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    if (!user.current_group_id) return NextResponse.json({ cards: [] });
    const db = getDatabase();
    syncCreditCardBills(db, user.current_group_id);
    return NextResponse.json({ cards: getCreditCardsWithPurchases(db, user.current_group_id) });
  } catch (error) {
    console.error("Load credit cards error:", error);
    return NextResponse.json({ error: "Unable to load credit cards." }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) return NextResponse.json({ error: "No active group selected", code: "no_group" }, { status: 403 });
    const body = await request.json();
    const { name } = body || {};
    const parsedLimit = Number(body?.creditLimit);
    if (!validateCreditCardName(name) || !Number.isFinite(parsedLimit) || parsedLimit < 0 || parsedLimit > 1_000_000_000) return NextResponse.json({ error: "Enter a card name and a valid credit limit." }, { status: 400 });
    const db = getDatabase();
    const createCard = db.transaction(() => {
      const entry = db.prepare(`
        INSERT INTO entries (group_id, user_id, name, type, is_credit_card, created_at, updated_at)
        VALUES (?, ?, ?, 'expense', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(groupId, user.id, name.trim());
      const card = db.prepare(`
        INSERT INTO credit_cards (group_id, user_id, name, credit_limit, entry_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(groupId, user.id, name.trim(), parsedLimit, entry.lastInsertRowid);
      db.prepare("UPDATE entries SET credit_card_id = ? WHERE id = ?").run(card.lastInsertRowid, entry.lastInsertRowid);
      return String(card.lastInsertRowid);
    });
    const id = createCard();
    notifyEntryChange(groupId, "create", { timestamp: Date.now() });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (String(error?.message).includes("UNIQUE")) return NextResponse.json({ error: "A card with that name already exists." }, { status: 409 });
    console.error("Create credit card error:", error);
    return NextResponse.json({ error: "Unable to create credit card." }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) return NextResponse.json({ error: "No active group selected", code: "no_group" }, { status: 403 });
    const body = await request.json();
    const { id, name } = body || {};
    const parsedLimit = Number(body?.creditLimit);
    if (!id || !validateCreditCardName(name) || !Number.isFinite(parsedLimit) || parsedLimit < 0 || parsedLimit > 1_000_000_000) return NextResponse.json({ error: "Enter a card name and a valid credit limit." }, { status: 400 });
    const db = getDatabase();
    const card = db.prepare("SELECT id, entry_id FROM credit_cards WHERE id = ? AND group_id = ?").get(id, groupId);
    if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
    db.transaction(() => {
      db.prepare("UPDATE credit_cards SET name = ?, credit_limit = ? WHERE id = ?").run(name.trim(), parsedLimit, id);
      db.prepare("UPDATE entries SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name.trim(), card.entry_id);
    })();
    notifyEntryChange(groupId, "update", { entryId: card.entry_id, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (String(error?.message).includes("UNIQUE")) return NextResponse.json({ error: "A card with that name already exists." }, { status: 409 });
    console.error("Rename credit card error:", error);
    return NextResponse.json({ error: "Unable to rename credit card." }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) return NextResponse.json({ error: "No active group selected", code: "no_group" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const db = getDatabase();
    const card = db.prepare("SELECT id, entry_id FROM credit_cards WHERE id = ? AND group_id = ?").get(id, groupId);
    if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
    db.prepare("DELETE FROM entries WHERE id = ? AND group_id = ?").run(card.entry_id, groupId);
    notifyEntryChange(groupId, "delete", { entryId: card.entry_id, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete credit card error:", error);
    return NextResponse.json({ error: "Unable to delete credit card." }, { status: 500 });
  }
});
