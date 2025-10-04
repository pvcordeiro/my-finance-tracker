"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, History, Plus, Minus, Edit3 } from "lucide-react";
import { format } from "date-fns";

interface BalanceHistoryEntry {
  id: number;
  old_amount: number;
  new_amount: number;
  delta: number;
  note: string | null;
  created_at: string;
  username: string | null;
}

interface BalanceHistoryProps {
  groupId: number | null;
  refreshTrigger?: number;
}

export function BalanceHistory({
  groupId,
  refreshTrigger,
}: BalanceHistoryProps) {
  const [history, setHistory] = useState<BalanceHistoryEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setHistory([]);
      setEnabled(false);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/balance-history", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
          setEnabled(data.enabled || false);
        }
      } catch (error) {
        console.error("Failed to fetch balance history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [groupId, refreshTrigger]);

  if (!enabled || loading) {
    return null;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-3 sm:p-6">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 hover:bg-transparent"
            >
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <span className="font-semibold text-primary">
                  Recent Balance Changes
                </span>
              </CardTitle>
              <ChevronDown
                className={`w-4 h-4 text-primary transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 p-4 sm:p-6 sm:pt-0">
            <div className="space-y-2">
              {history.map((entry) => {
                const isPositive = entry.delta > 0;
                const isNegative = entry.delta < 0;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isPositive && (
                        <div className="w-8 h-8 rounded-full bg-finance-positive/10 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-finance-positive" />
                        </div>
                      )}
                      {isNegative && (
                        <div className="w-8 h-8 rounded-full bg-finance-negative/10 flex items-center justify-center">
                          <Minus className="w-4 h-4 text-finance-negative" />
                        </div>
                      )}
                      {!isPositive && !isNegative && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span
                          className={`font-semibold text-sm sm:text-base ${
                            isPositive
                              ? "text-finance-positive"
                              : isNegative
                              ? "text-finance-negative"
                              : "text-foreground"
                          }`}
                        >
                          {isPositive && "+"}€{Math.abs(entry.delta).toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-1">
                        €{entry.old_amount.toFixed(2)} → €
                        {entry.new_amount.toFixed(2)}
                      </div>

                      {entry.note && (
                        <div className="text-sm text-foreground mt-2 bg-muted/50 rounded px-2 py-1">
                          {entry.note}
                        </div>
                      )}

                      {entry.username && (
                        <div className="text-xs text-muted-foreground mt-1">
                          by <span className="font-bold">{entry.username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
