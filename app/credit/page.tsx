"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { PendingOccurrences } from "@/components/finance/pending-occurrences";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard as CreditCardIcon, Plus, Trash2, Pencil, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useFinanceData, type CreditCard } from "@/hooks/use-finance-data";
import { useLanguage } from "@/hooks/use-language";
import { useGuidedTourMode } from "@/hooks/use-guided-tour-mode";
import { guidedTourFinanceData } from "@/lib/guided-tour-data";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";
import { toast } from "sonner";

function CreditPageContent() {
  const { data, isLoading, refreshData } = useFinanceData();
  const isGuidedTourActive = useGuidedTourMode();
  const { t, currencySymbol, currencyFractionDigits, formatCurrency } = useLanguage();
  const visibleData = isGuidedTourActive ? guidedTourFinanceData : data;
  const cards = visibleData.creditCards || [];
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLimit, setRenameLimit] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [firstMonth, setFirstMonth] = useState("");
  const [firstYear, setFirstYear] = useState("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<{ id: string; description: string } | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});
  const addCardDialogRef = useRef<HTMLDivElement>(null);
  const purchaseDialogRef = useRef<HTMLDivElement>(null);
  const editCardDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anyFormDialogOpen = addCardOpen || purchaseOpen || Boolean(renameId);
    if (!anyFormDialogOpen) return;
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const reposition = () => {
      const dialog = addCardOpen
        ? addCardDialogRef.current
        : purchaseOpen
          ? purchaseDialogRef.current
          : editCardDialogRef.current;
      if (!dialog) return;
      dialog.style.top = `${visualViewport.offsetTop + visualViewport.height / 2}px`;
      dialog.style.transform = "translateX(-50%) translateY(-50%)";
      dialog.style.maxHeight = `${visualViewport.height * 0.92}px`;
    };

    visualViewport.addEventListener("resize", reposition);
    visualViewport.addEventListener("scroll", reposition);
    reposition();

    return () => {
      visualViewport.removeEventListener("resize", reposition);
      visualViewport.removeEventListener("scroll", reposition);
      for (const dialog of [addCardDialogRef.current, purchaseDialogRef.current, editCardDialogRef.current]) {
        if (!dialog) continue;
        dialog.style.top = "";
        dialog.style.transform = "";
        dialog.style.maxHeight = "";
      }
    };
  }, [addCardOpen, purchaseOpen, renameId]);

  const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const rollingMonthOptions = Array.from({ length: 12 }, (_, index) => {
    const month = ((currentMonth - 1 + index) % 12) + 1;
    return { month, key: monthKeys[month - 1] };
  });
  const selectedInstallmentYear = Number(firstYear) || currentYear;
  const expensesById = new Map(visibleData.expenses.map((entry) => [entry.id, entry]));
  const cardEntryIds = new Set(cards.map((card) => card.entryId));
  const cardPending = (visibleData.pending || []).filter((item) => cardEntryIds.has(item.entryId));

  const request = async (url: string, method: string, body?: unknown) => {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || t("credit.requestFailed"));
    return result;
  };

  const addCard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cardName.trim()) return false;
    setSubmitting(true);
    try {
      await request("/api/credit-cards", "POST", { name: cardName, creditLimit: Number(cardLimit) });
      setCardName("");
      setCardLimit("");
      await refreshData();
      toast.success(t("credit.cardCreated"));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
      return false;
    } finally { setSubmitting(false); }
  };

  const openPurchase = (card: CreditCard) => {
    setEditingPurchaseId(null);
    setSelectedCard(card);
    setDescription(""); setAmount(""); setIsInstallment(false); setInstallmentCount("2");
    setFirstMonth("");
    setFirstYear("");
    setPurchaseOpen(true);
  };

  const openEditPurchase = (card: CreditCard, purchase: CreditCard["purchases"][number]) => {
    const unpaid = purchase.installments.filter((item) => !item.resolved);
    const firstUnpaid = unpaid[0];
    const defaultStart = new Date(currentYear, currentMonth + 1, 1);
    setSelectedCard(card);
    setEditingPurchaseId(purchase.id);
    setDescription(purchase.description);
    setAmount(String(purchase.installmentAmount));
    setIsInstallment(unpaid.length > 1 || (unpaid.length === 1 && purchase.installmentCount > 1));
    setInstallmentCount(String(Math.max(unpaid.length, 1)));
    setFirstMonth(String(firstUnpaid?.month ?? defaultStart.getMonth() + 1));
    setFirstYear(String(firstUnpaid?.year ?? defaultStart.getFullYear()));
    setPurchaseOpen(true);
  };

  const minimumInstallments = editingPurchaseId ? 1 : 2;

  const addPurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCard) return;
    setSubmitting(true);
    try {
      await request(
        editingPurchaseId
          ? `/api/credit-cards/purchases?id=${encodeURIComponent(editingPurchaseId)}`
          : "/api/credit-cards/purchases",
        editingPurchaseId ? "PATCH" : "POST",
        {
        cardId: selectedCard.id,
        description,
        amount: Number(amount),
        isInstallment,
        installments: isInstallment ? Number(installmentCount) : 1,
        firstMonth: firstMonth ? Number(firstMonth) : undefined,
        firstYear: firstYear ? Number(firstYear) : undefined,
        }
      );
      setPurchaseOpen(false);
      await refreshData();
      toast.success(t(editingPurchaseId ? "credit.purchaseUpdated" : "credit.purchaseAdded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
    } finally { setSubmitting(false); }
  };

  const deletePurchase = async () => {
    if (!purchaseToDelete || deletePending) return;
    setDeletePending(true);
    try {
      await request(`/api/credit-cards/purchases?id=${encodeURIComponent(purchaseToDelete.id)}`, "DELETE");
      await refreshData();
      setPurchaseToDelete(null);
      toast.success(t("credit.purchaseRemoved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
    } finally {
      setDeletePending(false);
    }
  };

  const deleteCard = async () => {
    if (!cardToDelete || deletePending) return;
    setDeletePending(true);
    try {
      await request(`/api/credit-cards?id=${encodeURIComponent(cardToDelete.id)}`, "DELETE");
      await refreshData();
      setCardToDelete(null);
      toast.success(t("credit.cardRemoved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
    } finally {
      setDeletePending(false);
    }
  };

  const markCurrentBillPaid = async (card: CreditCard) => {
    const entry = expensesById.get(card.entryId);
    if (!entry || !rollingBill(card, 0)) return;
    try {
      await request("/api/entries", "PATCH", {
        id: card.entryId,
        month: currentMonth,
        year: currentYear,
        is_resolved: true,
        occurrence_id: entry.occurrenceIds?.[0],
      });
      const bankResponse = await fetch("/api/bank-amount", { credentials: "include", cache: "no-store" });
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        window.dispatchEvent(new CustomEvent("bankAmountUpdated", { detail: { amount: bankData.amount } }));
      }
      await refreshData();
      toast.success(t("credit.billPaid"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
    }
  };

  const saveRename = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renameId) return;
    try {
      await request("/api/credit-cards", "PATCH", { id: renameId, name: renameValue, creditLimit: Number(renameLimit) });
      setRenameId(null);
      await refreshData();
      toast.success(t("credit.cardRenamed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
    }
  };

  const openEditCard = (card: CreditCard) => {
    setRenameId(card.id);
    setRenameValue(card.name);
    setRenameLimit(String(card.creditLimit));
  };

  const resolveCardBill = async (occurrence: (typeof cardPending)[number]) => {
    try {
      await request("/api/entries", "PATCH", {
        id: occurrence.entryId, month: occurrence.month, year: occurrence.year,
        is_resolved: true, occurrence_id: occurrence.occurrenceId,
      });
      const bankResponse = await fetch("/api/bank-amount", { credentials: "include", cache: "no-store" });
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        window.dispatchEvent(new CustomEvent("bankAmountUpdated", { detail: { amount: bankData.amount } }));
      }
      await refreshData();
      toast.success(t("entries.expenseResolved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("credit.requestFailed"));
    }
  };

  const rollingBill = (card: CreditCard, index: number) => expensesById.get(card.entryId)?.amounts[index] || 0;
  const validateLimit = (raw: string) => {
    const value = Number(raw);
    return raw !== "" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
  };
  const monthName = (month: number) => t(`months.${monthKeys[month - 1]}`);

  return (
    <div className="min-h-dvh finance-gradient page-nav-padding">
      <DashboardHeader />
      <main className="container mx-auto space-y-5 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-primary-contrast">{t("credit.title")}</h1>
            <p className="text-muted-foreground">{t("credit.subtitle")}</p>
          </div>
          <Button data-tour="tour-credit-limit" type="button" className="self-start sm:self-auto" disabled={isGuidedTourActive} onClick={() => { setCardName(""); setCardLimit(""); setAddCardOpen(true); }}><Plus className="mr-2 h-4 w-4" />{t("credit.addCard")}</Button>
        </div>

        {cardPending.length > 0 && <PendingOccurrences occurrences={cardPending} onResolve={resolveCardBill} tourReadOnly={isGuidedTourActive} />}

        {isLoading && !isGuidedTourActive ? <p className="py-10 text-center text-muted-foreground">{t("common.loadingFinancialData")}</p> : cards.length === 0 ? (
          <Card data-tour="tour-credit-purchases"><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="rounded-full bg-primary/10 p-4 text-primary-contrast"><CreditCardIcon className="h-7 w-7" /></span>
            <p className="font-medium">{t("credit.emptyTitle")}</p><p className="max-w-md text-sm text-muted-foreground">{t("credit.emptyDescription")}</p>
          </CardContent></Card>
        ) : (
          <div className={`mx-auto grid w-full gap-4 ${cards.length === 1 ? "max-w-3xl grid-cols-1" : "max-w-6xl grid-cols-1 xl:grid-cols-2"}`}>
            {cards.map((card, index) => {
              const bill = rollingBill(card, 0);
              const nextBill = rollingBill(card, 1);
              const isCurrentBillPaid = Boolean(expensesById.get(card.entryId)?.resolved?.[0]);
              const purchases = card.purchases.filter((purchase) => !purchase.cancelled);
              return <Card key={card.id} data-tour={index === 0 ? "tour-credit-purchases" : undefined} className="overflow-hidden shadow-sm">
                <CardHeader className="flex-row items-start justify-between gap-3 border-b bg-muted/30">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-contrast"><CreditCardIcon className="h-5 w-5" /></span>
                    <div className="min-w-0"><CardTitle className="truncate text-lg">{card.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{t("credit.purchasesCount").replace("{count}", String(purchases.length))}</p></div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label={t("credit.editCard")} disabled={isGuidedTourActive} onClick={() => openEditCard(card)}><Pencil className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("credit.deleteCard")} disabled={isGuidedTourActive} onClick={() => setCardToDelete(card)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 border-b pb-4">
                    <div><p className="text-xs text-muted-foreground">{t("credit.totalLimit")}</p><p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(card.creditLimit)}</p></div>
                    <div><p className="text-xs text-muted-foreground">{t("credit.availableLimit")}</p><p className={`mt-1 text-sm font-semibold tabular-nums ${card.availableCredit < 0 ? "text-finance-negative" : "text-finance-positive"}`}>{formatCurrency(card.availableCredit)}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{t("credit.currentBill")} · {monthName(currentMonth)}</p><p className="mt-1 text-xl font-bold tabular-nums"><PrivacyNumber value={bill} /></p>
                      {bill > 0 && <Button type="button" size="sm" variant={isCurrentBillPaid ? "outline" : "default"} className="mt-2 h-auto min-h-8 w-full whitespace-normal px-2 py-1.5 text-center text-xs leading-tight" disabled={isCurrentBillPaid} onClick={() => void markCurrentBillPaid(card)}><span className="block min-w-0 whitespace-normal break-words">{isCurrentBillPaid ? t("credit.billPaid") : t("credit.markBillPaid")}</span></Button>}
                    </div>
                    <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{t("credit.nextBill")} · {monthName(currentMonth === 12 ? 1 : currentMonth + 1)}</p><p className="mt-1 text-xl font-bold tabular-nums"><PrivacyNumber value={nextBill} /></p></div>
                  </div>
                  <Button data-tour={index === 0 ? "tour-credit-purchases" : undefined} type="button" className="w-full" disabled={isGuidedTourActive} onClick={() => openPurchase(card)}><Plus className="mr-2 h-4 w-4" />{t("credit.addPurchase")}</Button>
                  <div className="space-y-3">
                    <button
                      type="button"
                      data-tour="tour-credit-purchases-toggle"
                      aria-expanded={isGuidedTourActive || Boolean(expandedSchedules[card.id])}
                      onClick={() => { if (!isGuidedTourActive) setExpandedSchedules((previous) => ({ ...previous, [card.id]: !previous[card.id] })); }}
                      disabled={isGuidedTourActive}
                      className="flex w-full items-center gap-2 rounded-md py-1 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ShoppingBag className="h-4 w-4 text-primary-contrast" />
                      <span className="min-w-0 flex-1">{t("credit.purchaseHistory")}</span>
                      <span className="text-xs font-normal text-muted-foreground">{purchases.length}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSchedules[card.id] ? "rotate-180" : ""}`} />
                    </button>
                    {(isGuidedTourActive || expandedSchedules[card.id]) && (purchases.length === 0 ? <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">{t("credit.noPurchases")}</p> : purchases.map((purchase) => {
                      const remaining = purchase.installments.filter((item) => !item.resolved);
                      return <div key={purchase.id} className={`rounded-lg border p-3 ${purchase.cancelled ? "opacity-65" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="truncate text-sm font-medium"><PrivacyText value={purchase.description} /></p>
                            <p className="mt-1 text-xs text-muted-foreground">{purchase.installmentCount === 1 ? t("credit.oneTime") : t("credit.installmentSummary").replace("{count}", String(purchase.installmentCount)).replace("{amount}", formatCurrency(purchase.installmentAmount))} · {formatCurrency(purchase.purchaseAmount)}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" disabled={isGuidedTourActive || (purchase.installments.length > 0 && purchase.installments.every((item) => item.resolved))} onClick={() => openEditPurchase(card, purchase)}><Pencil className="mr-1 h-3.5 w-3.5" />{t("common.edit")}</Button>
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" disabled={isGuidedTourActive} onClick={() => setPurchaseToDelete({ id: purchase.id, description: purchase.description })}><Trash2 className="mr-1 h-3.5 w-3.5" />{t("common.delete")}</Button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {purchase.installments.map((installment, index) => <span key={`${installment.year}-${installment.month}`} className={`rounded-full border px-2 py-1 text-[10px] tabular-nums ${installment.resolved ? "border-finance-positive/30 bg-finance-positive/10 text-finance-positive" : "bg-muted/40 text-muted-foreground"}`}>
                            {monthName(installment.month)} {installment.year} · {index + 1}/{purchase.installmentCount} · {formatCurrency(installment.amount)}{installment.resolved ? ` · ${t("credit.paid")}` : ""}
                          </span>)}
                        </div>
                        {!purchase.cancelled && remaining.length === 0 && <p className="mt-2 text-xs text-finance-positive">{t("credit.allInstallmentsPaid")}</p>}
                      </div>;
                    }))}
                  </div>
                </CardContent>
              </Card>;
            })}
          </div>
        )}
      </main>

      <Dialog open={!isGuidedTourActive && purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent ref={purchaseDialogRef} className="min-w-0 max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t(editingPurchaseId ? "credit.editPurchase" : "credit.newPurchase")}{selectedCard ? ` · ${selectedCard.name}` : ""}</DialogTitle></DialogHeader>
          <form onSubmit={addPurchase} autoComplete="off" className="space-y-4">
            <div className="space-y-2"><Label htmlFor="purchase-description">{t("entries.description")}</Label><Input id="purchase-description" autoFocus required maxLength={160} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("credit.purchasePlaceholder")} /></div>
            <div className="space-y-2"><Label htmlFor="purchase-amount">{t("credit.amountPerInstallment")} ({currencySymbol})</Label><Input id="purchase-amount" required type="number" min="0.01" step={currencyFractionDigits === 0 ? "1" : "0.01"} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div><Label htmlFor="installment-toggle">{t("credit.isInstallment")}</Label><p className="mt-1 text-xs text-muted-foreground">{t("credit.installmentHelp")}</p></div>
              <Switch id="installment-toggle" checked={isInstallment} onCheckedChange={setIsInstallment} />
            </div>
            {isInstallment && <div className="min-w-0 space-y-4 rounded-lg border bg-muted/20 p-3 sm:p-4">
              <div className="min-w-0 space-y-2"><Label htmlFor="installment-count">{t("credit.installmentCount")}</Label><Input id="installment-count" name="credit-installment-count" autoComplete="off" inputMode="numeric" type="number" min={minimumInstallments} max="120" step="1" required value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} /></div>
              <p className="text-xs text-muted-foreground">{t("credit.firstInstallmentHint")}</p>
              <div className="grid min-w-0 grid-cols-1 gap-3">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="first-month">{t("credit.firstMonthOptional")}</Label>
                  <div className="relative min-w-0">
                    <select id="first-month" name="credit-first-month" autoComplete="off" value={firstMonth} onChange={(event) => { setFirstMonth(event.target.value); if (!editingPurchaseId) setFirstYear(""); }} className="h-10 min-w-0 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-10 text-sm">
                      <option value="">{t("credit.automaticMonth")}</option>
                      {rollingMonthOptions.map(({ month, key }) => <option key={month} value={month}>{t(`months.${key}`)}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <Label>{t("common.year")}</Label>
                  <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.previous")} disabled={!firstMonth || selectedInstallmentYear <= currentYear} onClick={() => setFirstYear(String(selectedInstallmentYear - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span aria-live="polite" className="min-w-12 text-center text-sm tabular-nums">{selectedInstallmentYear}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.next")} disabled={!firstMonth || selectedInstallmentYear >= currentYear + 50} onClick={() => setFirstYear(String(selectedInstallmentYear + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>}
            <DialogFooter className="flex-row gap-2 sm:gap-2"><Button type="button" variant="outline" className="flex-1" onClick={() => setPurchaseOpen(false)}>{t("common.cancel")}</Button><Button type="submit" className="flex-1" disabled={submitting || !description.trim() || Number(amount) <= 0 || (isInstallment && (Number(installmentCount) < minimumInstallments || Number(installmentCount) > 120))}>{t(editingPurchaseId ? "common.save" : "credit.addPurchase")}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!isGuidedTourActive && addCardOpen} onOpenChange={setAddCardOpen}>
        <DialogContent ref={addCardDialogRef} className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("credit.addCard")}</DialogTitle></DialogHeader>
          <form onSubmit={async (event) => { if (await addCard(event)) setAddCardOpen(false); }} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="new-card-name">{t("credit.cardName")}</Label><Input id="new-card-name" autoFocus placeholder={t("credit.cardNamePlaceholder")} value={cardName} maxLength={100} onChange={(event) => setCardName(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="new-card-limit">{t("credit.totalLimit")} ({currencySymbol})</Label><Input id="new-card-limit" type="number" min="0" max="1000000000" step={currencyFractionDigits === 0 ? "1" : "0.01"} required value={cardLimit} onChange={(event) => setCardLimit(event.target.value)} placeholder="0.00" /></div>
            <DialogFooter className="flex-row gap-2 sm:gap-2"><Button type="button" variant="outline" className="flex-1" onClick={() => setAddCardOpen(false)}>{t("common.cancel")}</Button><Button type="submit" className="flex-1" disabled={submitting || !cardName.trim() || !validateLimit(cardLimit)}>{t("credit.addCard")}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!isGuidedTourActive && Boolean(renameId)} onOpenChange={(open) => { if (!open) setRenameId(null); }}>
        <DialogContent ref={editCardDialogRef} className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{t("credit.renameCard")}</DialogTitle></DialogHeader>
          <form onSubmit={saveRename} className="space-y-4"><div className="space-y-2"><Label htmlFor="rename-card">{t("credit.cardName")}</Label><Input id="rename-card" autoFocus maxLength={100} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="rename-card-limit">{t("credit.totalLimit")} ({currencySymbol})</Label><Input id="rename-card-limit" type="number" min="0" max="1000000000" step={currencyFractionDigits === 0 ? "1" : "0.01"} required value={renameLimit} onChange={(event) => setRenameLimit(event.target.value)} /></div><DialogFooter className="flex-row gap-2 sm:gap-2"><Button type="button" variant="outline" className="flex-1" onClick={() => setRenameId(null)}>{t("common.cancel")}</Button><Button type="submit" className="flex-1" disabled={!renameValue.trim() || !validateLimit(renameLimit)}>{t("common.save")}</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!isGuidedTourActive && Boolean(purchaseToDelete)} onOpenChange={(open) => { if (!open && !deletePending) setPurchaseToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("credit.deletePurchaseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {purchaseToDelete && t("credit.deletePurchaseConfirm").replace("{purchase}", purchaseToDelete.description)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deletePending} onClick={(event) => { event.preventDefault(); void deletePurchase(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!isGuidedTourActive && Boolean(cardToDelete)} onOpenChange={(open) => { if (!open && !deletePending) setCardToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("credit.deleteCard")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cardToDelete && t("credit.deleteCardConfirm").replace("{card}", cardToDelete.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deletePending} onClick={(event) => { event.preventDefault(); void deleteCard(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CreditPage() {
  return <AuthGate><CreditPageContent /></AuthGate>;
}
