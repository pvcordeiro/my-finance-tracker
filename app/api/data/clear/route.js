import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { withAuth, getAuthenticatedUser } from "@/lib/auth-middleware";
import { notifyBankAmountChange, notifyEntryChange } from "@/lib/sse-notifications";
import { clearFinanceGroupData } from "@/lib/finance-clear";

export const DELETE = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) {
      return NextResponse.json(
        { error: "No active group selected", code: "no_group" },
        { status: 403 }
      );
    }

    const deleted = clearFinanceGroupData(getDatabase(), groupId);
    notifyBankAmountChange(groupId, 0, "set");
    notifyEntryChange(groupId, "bulk-update", { timestamp: Date.now() });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Clear group finance data failed:", error);
    return NextResponse.json(
      { error: "Unable to clear financial data." },
      { status: 500 }
    );
  }
});
