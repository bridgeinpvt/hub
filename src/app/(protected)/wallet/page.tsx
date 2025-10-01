"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Plus, ArrowUpDown, ArrowDownToLine, IndianRupee, Clock, CheckCircle, XCircle } from "lucide-react";
import { WalletTopupModal } from "@/components/wallet/WalletTopupModal";
import { WalletTopupList } from "@/components/wallet/WalletTopupList";
import { PayoutModal } from "@/components/wallet/PayoutModal";
import { TransactionList } from "@/components/wallet/TransactionList";
import { PayoutRequestList } from "@/components/wallet/PayoutRequestList";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function WalletPage() {
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState("topups");

  const { data: wallet, isLoading: walletLoading } = api.wallet.getWallet.useQuery();
  const { data: transactions, isLoading: transactionsLoading } = api.wallet.getTransactions.useQuery({
    limit: 20,
  });
  const { data: payoutRequests, isLoading: payoutLoading } = api.wallet.getPayoutRequests.useQuery({
    limit: 10,
  });
  const { data: topupsData, isLoading: topupsLoading } = api.wallet.getWalletTopups.useQuery({
    limit: 20,
  });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "PROCESSING":
        return <ArrowUpDown className="h-4 w-4" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (walletLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          My Wallet
        </h1>
        <p className="text-muted-foreground">
          Manage your wallet balance, add money, and request payouts
        </p>
      </div>

      {/* Wallet Balance Card */}
      <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <IndianRupee className="h-6 w-6" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-bold text-primary">
                {formatCurrency(wallet?.balance || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Available for purchases and payouts
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setShowTopupModal(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Add Money</span>
                <span className="xs:hidden">Add</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPayoutModal(true)}
                disabled={(wallet?.balance || 0) < 10}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span className="hidden xs:inline">Request Payout</span>
                <span className="xs:hidden">Payout</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-16 z-40 shadow-sm -mx-4 md:-mx-6 lg:-mx-8">
          <div className="px-4 md:px-6 lg:px-8 py-3">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="topups">Top-ups</TabsTrigger>
              <TabsTrigger value="transactions">History</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="space-y-4 mt-6 w-full">
          <TabsContent value="topups" className="space-y-4 w-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Wallet Top-up Requests
                </CardTitle>
                <CardDescription>
                  Track your wallet top-up requests and their payment status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WalletTopupList
                  topups={topupsData?.topups || []}
                  isLoading={topupsLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 w-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  View all your wallet transactions including purchases, sales, and money additions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionList
                  transactions={transactions?.transactions || []}
                  isLoading={transactionsLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4 w-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5" />
                  Payout Requests
                </CardTitle>
                <CardDescription>
                  Track your payout requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PayoutRequestList
                  requests={payoutRequests || []}
                  isLoading={payoutLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <WalletTopupModal 
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
      />
      
      <PayoutModal 
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        maxAmount={wallet?.balance || 0}
      />
    </div>
  );
}