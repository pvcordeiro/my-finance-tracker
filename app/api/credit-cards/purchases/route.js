import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import { withAuth, getAuthenticatedUser } from "../../../../lib/auth-middleware.js";
import { getDefaultCreditPurchaseStart, getInstallmentMonths, reopenCardBillForInstallment, replaceUnpaidCreditInstallments, syncCreditCardBills } from "../../../../lib/credit-cards.js";
import { notifyEntryChange } from "../../../../lib/sse-notifications.js";

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) return NextResponse.json({ error: "No active group selected", code: "no_group" }, { status: 403 });
    const body = await request.json();
    const { cardId, description, amount, installments, firstYear, firstMonth, isInstallment } = body || {};
    const numericAmount = Number(amount);
    const count = isInstallment ? Number(installments) : 1;
    const current = new Date();
    const defaultStart = getDefaultCreditPurchaseStart(Boolean(isInstallment), current);
    const inferredYear = firstMonth && Number(firstMonth) < current.getMonth() + 1
      ? current.getFullYear() + 1
      : current.getFullYear();
    const startYear = isInstallment && firstYear && Number.isInteger(Number(firstYear))
      ? Number(firstYear)
       : isInstallment && firstMonth ? inferredYear : defaultStart.year;
    const startMonth = isInstallment && firstMonth && Number.isInteger(Number(firstMonth)) ? Number(firstMonth) : defaultStart.month;
    const purchaseTotal = numericAmount * count;
    if (!description?.trim() || description.trim().length > 160 || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000_000 || !Number.isFinite(purchaseTotal) || purchaseTotal > 1_000_000_000 || !Number.isInteger(count) || count < 1 || count > 120 || !Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12 || !Number.isInteger(startYear) || startYear < current.getFullYear() || startYear > current.getFullYear() + 50) {
      return NextResponse.json({ error: "Check the purchase details and installment schedule." }, { status: 400 });
    }
    const db = getDatabase();
    const card = db.prepare("SELECT id, entry_id FROM credit_cards WHERE id = ? AND group_id = ?").get(cardId, groupId);
    if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
    const schedule = getInstallmentMonths(startYear, startMonth, count);
    const perInstallment = Math.round((numericAmount + Number.EPSILON) * 100) / 100;
    const createPurchase = db.transaction(() => {
      const purchase = db.prepare(`
        INSERT INTO credit_purchases (card_id, description, purchase_amount, installment_amount, installment_count, start_year, start_month)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(card.id, description.trim(), purchaseTotal, perInstallment, count, startYear, startMonth);
      const insert = db.prepare("INSERT INTO credit_installments (purchase_id, year, month, amount) VALUES (?, ?, ?, ?)");
      schedule.forEach((slot) => {
        insert.run(purchase.lastInsertRowid, slot.year, slot.month, perInstallment);
        reopenCardBillForInstallment(db, card.entry_id, slot.year, slot.month);
      });
      syncCreditCardBills(db, groupId);
    });
    createPurchase();
    notifyEntryChange(groupId, "update", { entryId: card.entry_id, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create card purchase error:", error);
    return NextResponse.json({ error: "Unable to save this purchase." }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) return NextResponse.json({ error: "No active group selected", code: "no_group" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get("id");
    const body = await request.json();
    const { description, amount, installments, firstYear, firstMonth, isInstallment } = body || {};
    const numericAmount = Number(amount);
    const count = isInstallment ? Number(installments) : 1;
    const current = new Date();
    const currentDate = new Date(current.getFullYear(), current.getMonth(), 1);
    const startYear = Number(firstYear);
    const startMonth = Number(firstMonth);
    const startDate = new Date(startYear, startMonth - 1, 1);
    const total = numericAmount * count;
    if (!purchaseId || !description?.trim() || description.trim().length > 160 || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000_000 || !Number.isFinite(total) || total > 1_000_000_000 || !Number.isInteger(count) || count < 1 || count > 120 || !Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12 || !Number.isInteger(startYear) || startYear < 1900 || startYear > current.getFullYear() + 50 || startDate < new Date(1900, 0, 1)) {
      return NextResponse.json({ error: "Check the purchase details and installment schedule." }, { status: 400 });
    }
    const db = getDatabase();
    const purchase = db.prepare(`
      SELECT p.id, p.card_id, c.entry_id
      FROM credit_purchases p JOIN credit_cards c ON c.id = p.card_id
      WHERE p.id = ? AND c.group_id = ? AND p.cancelled_at IS NULL
    `).get(purchaseId, groupId);
    if (!purchase) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    const paid = db.prepare("SELECT year, month FROM credit_installments WHERE purchase_id = ? AND is_paid = 1").all(purchase.id);
    const paidDates = new Set(paid.map((slot) => `${slot.year}-${slot.month}`));
    const priorUnpaidDates = new Set(db.prepare("SELECT year, month FROM credit_installments WHERE purchase_id = ? AND is_paid = 0").all(purchase.id).map((slot) => `${slot.year}-${slot.month}`));
    const schedule = getInstallmentMonths(startYear, startMonth, count);
    const perInstallment = Math.round((numericAmount + Number.EPSILON) * 100) / 100;
    const totalCount = count + paid.length;
    if (totalCount > 120) return NextResponse.json({ error: "An installment schedule can contain up to 120 installments." }, { status: 400 });
    if (schedule.some((slot) => new Date(slot.year, slot.month - 1, 1) < currentDate && !priorUnpaidDates.has(`${slot.year}-${slot.month}`) && !paidDates.has(`${slot.year}-${slot.month}`))) {
      return NextResponse.json({ error: "New unpaid installments cannot be scheduled in past months." }, { status: 400 });
    }
    db.transaction(() => {
      db.prepare("UPDATE credit_purchases SET description = ? WHERE id = ?").run(description.trim(), purchase.id);
      replaceUnpaidCreditInstallments(db, {
        purchaseId: purchase.id,
        entryId: purchase.entry_id,
        schedule,
        amount: perInstallment,
        count: totalCount,
      });
      syncCreditCardBills(db, groupId);
    })();
    notifyEntryChange(groupId, "update", { entryId: purchase.entry_id, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update card purchase error:", error);
    return NextResponse.json({ error: "Unable to update this purchase." }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) return NextResponse.json({ error: "No active group selected", code: "no_group" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get("id");
    const db = getDatabase();
    const purchase = db.prepare(`
      SELECT p.id, p.card_id, c.entry_id
      FROM credit_purchases p JOIN credit_cards c ON c.id = p.card_id
      WHERE p.id = ? AND c.group_id = ?
    `).get(purchaseId, groupId);
    if (!purchase) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });

    // Keep already-settled installments in the card bill history; cancel only
    // unpaid installments, including installments beyond the forecast window.
    db.transaction(() => {
      db.prepare(`
        DELETE FROM credit_installments
        WHERE purchase_id = ? AND is_paid = 0
      `).run(purchase.id);
      db.prepare("DELETE FROM credit_purchases WHERE id = ? AND NOT EXISTS (SELECT 1 FROM credit_installments WHERE purchase_id = ?)").run(purchase.id, purchase.id);
      db.prepare("UPDATE credit_purchases SET cancelled_at = CURRENT_TIMESTAMP WHERE id = ?").run(purchase.id);
      syncCreditCardBills(db, groupId);
    })();
    notifyEntryChange(groupId, "update", { entryId: purchase.entry_id, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete card purchase error:", error);
    return NextResponse.json({ error: "Unable to delete this purchase." }, { status: 500 });
  }
});
