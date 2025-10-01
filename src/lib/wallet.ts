import { db } from "@/server/db";
import type { User, WalletTopup } from "@prisma/client";
import { createNotificationHelper } from "@/server/api/routers/notification";

export interface WalletService {
  credit: (userId: string, amount: number, description?: string) => Promise<void>;
  debit: (userId: string, amount: number, description?: string) => Promise<boolean>;
  getBalance: (userId: string) => Promise<number>;
  transfer: (fromUserId: string, toUserId: string, amount: number, description?: string) => Promise<void>;
}

export const walletService: WalletService = {
  async credit(userId: string, amount: number, description?: string) {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    await db.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { userId },
        update: {
          balance: {
            increment: amount,
          },
        },
        create: {
          userId,
          balance: amount,
        },
      });

      await tx.walletTransaction.create({
        data: {
          toUserId: userId,
          amount,
          type: "ADD_MONEY",
          status: "COMPLETED",
          description: description || `Wallet credited with ₹${amount}`,
        },
      });
    });

    // Create notification for significant credits (≥ ₹500)
    if (amount >= 500) {
      await createNotificationHelper(db, {
        userId,
        type: "SYSTEM_ANNOUNCEMENT",
        title: "Wallet Credited!",
        content: `₹${amount} has been added to your wallet. ${description || ""}`.trim(),
      });
    }
  },

  async debit(userId: string, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const wallet = await db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < amount) {
      return false;
    }

    await db.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          fromUserId: userId,
          amount,
          type: "PAYOUT",
          status: "COMPLETED",
          description: description || `Wallet debited with ₹${amount}`,
        },
      });
    });

    // Create notification for significant debits (≥ ₹100)
    if (amount >= 100) {
      await createNotificationHelper(db, {
        userId,
        type: "SYSTEM_ANNOUNCEMENT",
        title: "Payout Processed!",
        content: `₹${amount} has been debited from your wallet. ${description || ""}`.trim(),
      });
    }

    return true;
  },

  async getBalance(userId: string): Promise<number> {
    const wallet = await db.wallet.findUnique({
      where: { userId },
    });
    return wallet?.balance || 0;
  },

  async transfer(fromUserId: string, toUserId: string, amount: number, description?: string) {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    if (fromUserId === toUserId) {
      throw new Error("Cannot transfer to same user");
    }

    const fromWallet = await db.wallet.findUnique({
      where: { userId: fromUserId },
    });

    if (!fromWallet || fromWallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    await db.$transaction(async (tx) => {
      // Debit from sender
      await tx.wallet.update({
        where: { userId: fromUserId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Credit to receiver
      await tx.wallet.upsert({
        where: { userId: toUserId },
        update: {
          balance: {
            increment: amount,
          },
        },
        create: {
          userId: toUserId,
          balance: amount,
        },
      });

      // Create transaction record
      await tx.walletTransaction.create({
        data: {
          fromUserId,
          toUserId,
          amount,
          type: "CAPSULE_PURCHASE",
          status: "COMPLETED",
          description: description || `Transfer from ${fromUserId} to ${toUserId}`,
        },
      });
    });
  },
};

export const generateReferenceId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WALLET${timestamp.slice(-6)}${random}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};