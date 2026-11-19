/** Delete all finance data owned by one group, leaving every other group intact. */
export function clearFinanceGroupData(db, groupId) {
  if (!Number.isInteger(Number(groupId)) || Number(groupId) <= 0) {
    throw new Error("A valid group id is required.");
  }

  return db.transaction(() => {
    const entries = db
      .prepare("SELECT COUNT(*) AS count FROM entries WHERE group_id = ?")
      .get(groupId).count;
    const bankRecords = db
      .prepare("SELECT COUNT(*) AS count FROM bank_amounts WHERE group_id = ?")
      .get(groupId).count;
    const historyRecords = db
      .prepare("SELECT COUNT(*) AS count FROM balance_history WHERE group_id = ?")
      .get(groupId).count;
    const creditCards = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'credit_cards'").get().count
      ? db.prepare("SELECT COUNT(*) AS count FROM credit_cards WHERE group_id = ?").get(groupId).count
      : 0;

    db.prepare("DELETE FROM balance_history WHERE group_id = ?").run(groupId);
    db.prepare("DELETE FROM bank_amounts WHERE group_id = ?").run(groupId);
    db.prepare("DELETE FROM entries WHERE group_id = ?").run(groupId);

    return { entries, bankRecords, historyRecords, creditCards };
  })();
}
