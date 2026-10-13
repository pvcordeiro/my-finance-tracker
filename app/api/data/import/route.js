import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { withAuth, getAuthenticatedUser } from "@/lib/auth-middleware";
import { notifyBankAmountChange, notifyEntryChange } from "@/lib/sse-notifications";
import { mergeFinanceBackup, validateFinanceBackup } from "@/lib/finance-backup";

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) {
      return NextResponse.json(
        { error: "No active group selected", code: "no_group" },
        { status: 403 }
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > 8_000_000) {
      return NextResponse.json({ error: "Backup is too large" }, { status: 413 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid backup payload." },
        { status: 400 }
      );
    }

    let backup;
    try {
      backup = validateFinanceBackup(payload);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid backup format" },
        { status: 400 }
      );
    }

    const result = mergeFinanceBackup(getDatabase(), {
      groupId,
      userId: user.id,
      backup,
    });

    notifyBankAmountChange(groupId, backup.bankAmount, "set");
    notifyEntryChange(groupId, "bulk-update", { timestamp: Date.now() });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Import backup error:", error);
    return NextResponse.json({ error: "Unable to import backup." }, { status: 500 });
  }
});
