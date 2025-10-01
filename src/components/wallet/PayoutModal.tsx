"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Smartphone } from "lucide-react";
import { api } from "@/trpc/react";

interface PayoutModalProps {
  trigger: React.ReactNode;
  maxAmount: number;
}

export function PayoutModal({ trigger, maxAmount }: PayoutModalProps) {
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "upi">("bank");
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: ""
  });
  const [upiId, setUpiId] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const payoutMutation = api.wallet.createPayout.useMutation({
    onSuccess: () => {
      setIsOpen(false);
      setAmount("");
      setBankDetails({ accountNumber: "", ifscCode: "", accountHolderName: "" });
      setUpiId("");
    },
  });

  const handlePayout = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (Number(amount) > maxAmount) return;

    if (payoutMethod === "bank") {
      if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName) return;
    } else {
      if (!upiId) return;
    }

    payoutMutation.mutate({
      amount: Number(amount),
      method: payoutMethod,
      ...(payoutMethod === "bank" ? { bankDetails } : { upiId }),
    });
  };

  const quickAmounts = [100, 500, 1000, Math.min(5000, maxAmount)].filter(amt => amt <= maxAmount);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Money</DialogTitle>
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
              max={maxAmount}
            />
            <p className="text-xs text-muted-foreground">
              Available balance: ₹{maxAmount}
            </p>
          </div>

          {/* Quick Amount Buttons */}
          {quickAmounts.length > 0 && (
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
          )}

          {/* Payout Methods */}
          <div className="space-y-2">
            <Label>Withdrawal Method</Label>
            <div className="grid grid-cols-1 gap-2">
              <Card
                className={`cursor-pointer border-2 ${payoutMethod === "bank" ? "border-primary" : "border-border"}`}
                onClick={() => setPayoutMethod("bank")}
              >
                <CardContent className="flex items-center space-x-3 p-3">
                  <Building className="h-5 w-5" />
                  <span>Bank Account</span>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer border-2 ${payoutMethod === "upi" ? "border-primary" : "border-border"}`}
                onClick={() => setPayoutMethod("upi")}
              >
                <CardContent className="flex items-center space-x-3 p-3">
                  <Smartphone className="h-5 w-5" />
                  <span>UPI</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bank Details */}
          {payoutMethod === "bank" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="Enter account number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  placeholder="Enter IFSC code"
                  value={bankDetails.ifscCode}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  placeholder="Enter account holder name"
                  value={bankDetails.accountHolderName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* UPI Details */}
          {payoutMethod === "upi" && (
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                placeholder="Enter UPI ID (e.g., user@paytm)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          )}

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
              onClick={handlePayout}
              disabled={!amount || payoutMutation.isLoading}
            >
              {payoutMutation.isLoading ? "Processing..." : `Withdraw ₹${amount || 0}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}