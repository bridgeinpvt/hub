"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Smartphone, Building } from "lucide-react";
import { api } from "@/trpc/react";

interface WalletTopupModalProps {
  trigger: React.ReactNode;
}

export function WalletTopupModal({ trigger }: WalletTopupModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbanking">("upi");
  const [isOpen, setIsOpen] = useState(false);

  const topupMutation = api.wallet.createTopup.useMutation({
    onSuccess: () => {
      setIsOpen(false);
      setAmount("");
    },
  });

  const handleTopup = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    topupMutation.mutate({
      amount: Number(amount),
      paymentMethod,
    });
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label>Quick amounts</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                >
                  ₹{quickAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-1 gap-2">
              <Card
                className={`cursor-pointer border-2 ${paymentMethod === "upi" ? "border-primary" : "border-border"}`}
                onClick={() => setPaymentMethod("upi")}
              >
                <CardContent className="flex items-center space-x-3 p-3">
                  <Smartphone className="h-5 w-5" />
                  <span>UPI</span>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer border-2 ${paymentMethod === "card" ? "border-primary" : "border-border"}`}
                onClick={() => setPaymentMethod("card")}
              >
                <CardContent className="flex items-center space-x-3 p-3">
                  <CreditCard className="h-5 w-5" />
                  <span>Credit/Debit Card</span>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer border-2 ${paymentMethod === "netbanking" ? "border-primary" : "border-border"}`}
                onClick={() => setPaymentMethod("netbanking")}
              >
                <CardContent className="flex items-center space-x-3 p-3">
                  <Building className="h-5 w-5" />
                  <span>Net Banking</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleTopup}
              disabled={!amount || topupMutation.isLoading}
            >
              {topupMutation.isLoading ? "Processing..." : `Add ₹${amount || 0}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}