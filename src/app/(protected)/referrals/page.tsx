"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReferralHistoryListSkeleton, Skeleton } from "@/components/skeletons";
import { Users, DollarSign, Share2, TrendingUp, Coins, Info, Wallet, ArrowRight, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

export default function ReferralsPage() {
  const [creditsToConvert, setCreditsToConvert] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const { data: stats, error: statsError, isLoading: statsLoading, refetch: refetchStats } = api.referral.getReferralStats.useQuery();
  const { data: referralHistory, isLoading: historyLoading } = api.referral.getReferralHistory.useQuery();
  const utils = api.useUtils();

  const convertCreditsMutation = api.wallet.convertReferralCreditsToWallet.useMutation();

  const handleConvertCredits = async () => {
    const credits = parseInt(creditsToConvert);

    if (!credits || credits < 100) {
      toast.error("Minimum conversion is 100 credits");
      return;
    }

    if (credits > (stats?.referralCredits || 0)) {
      toast.error("Insufficient referral credits");
      return;
    }

    try {
      const result = await convertCreditsMutation.mutateAsync({ credits });

      toast.success(
        `Successfully converted ${result.creditsConverted} credits to ₹${result.walletAmountAdded}!`
      );

      // Refresh data
      await Promise.all([
        refetchStats(),
        utils.wallet.getWallet.invalidate(),
        utils.wallet.getTransactions.invalidate()
      ]);

      setCreditsToConvert("");
    } catch (error: any) {
      toast.error(error.message || "Failed to convert credits");
    }
  };

  const handleCopyLink = async () => {
    const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'}/ref/${stats?.referralCode || ''}`;

    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      toast.success("Referral link copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy link. Please try selecting and copying manually.");
    }
  };

  const handleShare = async () => {
    const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'}/ref/${stats?.referralCode || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Nocage - Professional Network',
          text: 'Join me on Nocage and start building your professional network!',
          url: referralLink,
        });
      } catch (error) {
        // User cancelled sharing or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyLink();
    }
  };

  if (statsError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Referral Program</h1>
          <div className="text-red-500">
            <p>Failed to load referral data</p>
            <p className="text-sm">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  const totalReferrals = stats?.totalReferrals ?? 0;
  const totalEarnings = stats?.totalEarnings ?? 0;
  const monthlyReferrals = stats?.monthlyReferrals ?? 0;
  const referralCredits = stats?.referralCredits ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Referral Program</h1>
        <p className="text-muted-foreground text-lg">Share Nocage and earn rewards</p>
      </div>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">How the Referral Process Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">1. Share Your Link</h3>
              <p className="text-sm text-muted-foreground">Copy and share your unique referral link with friends and family</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">2. They Sign Up</h3>
              <p className="text-sm text-muted-foreground">When someone clicks your link and signs up, they're automatically tagged as your referral</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">3. Everyone Wins!</h3>
              <p className="text-sm text-muted-foreground">You earn 100 credits (₹20), they get ₹10 welcome bonus when they complete signup</p>
              <div className="flex items-center gap-1 mt-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">You get 100 credits (₹20), they get ₹10 welcome bonus</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-xs text-muted-foreground">100 credits = ₹20</span>
              </div>
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">Important Notes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Referral codes can be entered during signup or onboarding</li>
              <li>• Users can only be referred once - subsequent referral codes are ignored</li>
              <li>• You earn 100 credits (₹20) per successful referral</li>
              <li>• New users get ₹10 welcome bonus when they use your code</li>
              <li>• Convert additional credits to wallet balance: 100 credits = ₹20</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : totalReferrals}
            </div>
            <p className="text-muted-foreground text-sm">People you've referred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : `₹${totalEarnings.toLocaleString()}`}
            </div>
            <p className="text-muted-foreground text-sm">From referral bonuses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : (stats?.activeReferrals ?? 0)}
            </div>
            <p className="text-muted-foreground text-sm">Currently earning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Referral Credits</CardTitle>
              <Coins className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : referralCredits.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <p className="text-muted-foreground text-sm">Credits earned</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">100 credits = ₹20 which can be used for app purchases</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">Value: ₹{Math.floor((referralCredits / 100) * 20).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Convert Credits to Wallet */}
      {referralCredits >= 100 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Convert Credits to Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Info className="h-4 w-4" />
              <span>Available: {referralCredits.toLocaleString()} credits (≈ ₹{Math.floor((referralCredits / 100) * 20).toLocaleString()})</span>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="creditsToConvert">Credits to Convert</Label>
                <Input
                  id="creditsToConvert"
                  type="number"
                  placeholder="Minimum 100 credits"
                  value={creditsToConvert}
                  onChange={(e) => setCreditsToConvert(e.target.value)}
                  min="100"
                  max={referralCredits}
                  step="100"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
                <span>
                  ₹{creditsToConvert ? Math.floor((parseInt(creditsToConvert) / 100) * 20) : 0}
                </span>
              </div>

              <Button
                onClick={handleConvertCredits}
                disabled={
                  convertCreditsMutation.isPending ||
                  !creditsToConvert ||
                  parseInt(creditsToConvert) < 100 ||
                  parseInt(creditsToConvert) > referralCredits
                }
                className="min-w-32"
              >
                {convertCreditsMutation.isPending ? "Converting..." : "Convert"}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <span>Conversion Rate: 100 credits = ₹20</span>
              <span>Minimum: 100 credits (₹20)</span>
              <span>Maximum: {referralCredits.toLocaleString()} credits</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              readOnly
              value={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'}/ref/${stats?.referralCode || (statsLoading ? "loading..." : "none")}`}
              className="flex-1 font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              onClick={handleCopyLink}
              disabled={statsLoading || !stats?.referralCode}
              className={isCopied ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={statsLoading || !stats?.referralCode}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this link and earn 100 credits (₹20) for each person who signs up! They also get ₹10 welcome bonus.
          </p>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {statsError ? (
            <div className="text-center py-8 text-red-500">
              <p>Failed to load referral data</p>
              <p className="text-sm">Please try refreshing the page</p>
            </div>
          ) : historyLoading ? (
            <ReferralHistoryListSkeleton count={5} />
          ) : referralHistory && referralHistory.length > 0 ? (
            <div className="space-y-4">
              {referralHistory.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {referral.referred?.name?.[0] || referral.referred?.username?.[0] || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{referral.referred?.name || referral.referred?.username || "Unknown User"}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">+₹{referral.earnings}</p>
                    <p className="text-sm text-muted-foreground">Referral bonus</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p>No referrals yet</p>
              <p className="text-sm">Share your link to start earning!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
