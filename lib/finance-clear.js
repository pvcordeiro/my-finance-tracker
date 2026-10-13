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

    db.prepare("DELETE FROM balance_history WHERE group_id = ?").run(groupId);
    db.prepare("DELETE FROM bank_amounts WHERE group_id = ?").run(groupId);
    db.prepare("DELETE FROM entries WHERE group_id = ?").run(groupId);

    return { entries, bankRecords, historyRecords };
  })();
}
