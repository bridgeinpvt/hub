"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Wallet } from "lucide-react";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";

export function TransactionList() {
  const { data: transactions, isLoading } = api.wallet.getTransactions.useQuery({
    limit: 20
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "CREDIT":
      case "TOPUP":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "DEBIT":
      case "PAYOUT":
      case "PURCHASE":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "CREDIT":
      case "TOPUP":
        return "text-green-600";
      case "DEBIT":
      case "PAYOUT":
      case "PURCHASE":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTransactionSign = (type: string) => {
    switch (type) {
      case "CREDIT":
      case "TOPUP":
        return "+";
      case "DEBIT":
      case "PAYOUT":
      case "PURCHASE":
        return "-";
      default:
        return "";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "default" as const;
      case "FAILED":
        return "destructive" as const;
      case "PENDING":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions && transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                      </p>
                      <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${getTransactionColor(transaction.type)}`}>
                    {getTransactionSign(transaction.type)}₹{transaction.amount}
                  </p>
                  {transaction.transactionId && (
                    <p className="text-xs text-muted-foreground">
                      ID: {transaction.transactionId.slice(-8)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your transaction history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}