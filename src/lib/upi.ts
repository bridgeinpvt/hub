export interface UPIPaymentParams {
  payeeVPA: string; // UPI ID of the payee
  payeeName: string; // Name of the payee
  amount: number; // Amount in rupees
  transactionNote: string; // Transaction reference/note
  transactionRef?: string; // Optional transaction reference
}

export interface UPIQRData {
  qrString: string;
  upiUrl: string;
  referenceId: string;
}

export class UPIService {
  private static readonly DEFAULT_PAYEE_VPA = process.env.UPI_MERCHANT_ID || "merchant@paytm";
  private static readonly DEFAULT_PAYEE_NAME = process.env.UPI_MERCHANT_NAME || "Capsule Management";

  static generateUPIQR(params: UPIPaymentParams): UPIQRData {
    const {
      payeeVPA = this.DEFAULT_PAYEE_VPA,
      payeeName = this.DEFAULT_PAYEE_NAME,
      amount,
      transactionNote,
      transactionRef
    } = params;

    // Validate inputs
    if (!payeeVPA) {
      throw new Error("UPI ID is required");
    }
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }
    if (!transactionNote) {
      throw new Error("Transaction note is required");
    }

    // Format UPI URI according to UPI standard
    const upiParams = new URLSearchParams({
      pa: payeeVPA,
      pn: payeeName,
      am: amount.toFixed(2),
      cu: "INR",
      tn: transactionNote,
    });

    if (transactionRef) {
      upiParams.set("tr", transactionRef);
    }

    const upiUrl = `upi://pay?${upiParams.toString()}`;
    
    return {
      qrString: upiUrl,
      upiUrl,
      referenceId: transactionNote,
    };
  }

  static generateWalletTopupQR(amount: number, referenceId: string): UPIQRData {
    return this.generateUPIQR({
      payeeVPA: this.DEFAULT_PAYEE_VPA,
      payeeName: this.DEFAULT_PAYEE_NAME,
      amount,
      transactionNote: referenceId,
      transactionRef: referenceId,
    });
  }

  static parseUPIString(upiString: string): Partial<UPIPaymentParams> | null {
    try {
      const url = new URL(upiString);
      if (url.protocol !== "upi:") {
        return null;
      }

      const params = url.searchParams;
      return {
        payeeVPA: params.get("pa") || undefined,
        payeeName: params.get("pn") || undefined,
        amount: params.get("am") ? parseFloat(params.get("am")!) : undefined,
        transactionNote: params.get("tn") || undefined,
        transactionRef: params.get("tr") || undefined,
      };
    } catch (error) {
      return null;
    }
  }

  static validateUPIId(upiId: string): boolean {
    // Basic UPI ID validation pattern
    const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9][a-zA-Z0-9.-]{0,64}[a-zA-Z0-9]$/;
    return upiPattern.test(upiId);
  }

}

// Helper function for bank statement parsing (SMS/Email)
export interface BankTransactionData {
  amount: number;
  utr?: string;
  reference?: string;
  timestamp: Date;
  description: string;
}

export class PaymentReconciliationService {
  // Parse SMS format: "Amount Rs.500.00 credited to a/c 1234 on 01-Jan-24 by UPI/REF.NO:123456/WALLET123456"
  static parseSMSNotification(smsText: string): BankTransactionData | null {
    try {
      // Common SMS patterns
      const patterns = [
        // Pattern 1: Amount Rs.XX.XX credited ... REF.NO:XXXXXX/WALLETXXXXXX
        /Amount Rs\.(\d+\.?\d*) credited.*REF\.NO:([^\/]+)\/([^\/\s]+)/i,
        // Pattern 2: Rs XX credited ... Ref: XXXXXX
        /Rs\.?\s*(\d+\.?\d*) credited.*Ref:?\s*([^\s]+)/i,
        // Pattern 3: INR XX credited ... UPI Ref: XXXXXX
        /INR\s*(\d+\.?\d*) credited.*UPI Ref:?\s*([^\s]+)/i,
      ];

      for (const pattern of patterns) {
        const match = smsText.match(pattern);
        if (match) {
          return {
            amount: parseFloat(match[1]),
            utr: match[2],
            reference: match[3] || match[2],
            timestamp: new Date(),
            description: smsText.trim(),
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing SMS:", error);
      return null;
    }
  }

  // Check if transaction matches pending wallet top-up
  static async matchTransactionToTopup(
    transactionData: BankTransactionData
  ): Promise<{ topup: any; isMatch: boolean }> {
    try {
      const { db } = await import("@/server/db");
      
      // Look for pending top-ups with matching reference ID or amount
      const pendingTopups = await db.walletTopup.findMany({
        where: {
          status: "AWAITING_PAYMENT",
          amount: transactionData.amount,
        },
        include: {
          user: true,
        },
      });

      // Check for exact reference match
      for (const topup of pendingTopups) {
        if (
          transactionData.reference &&
          transactionData.reference.includes(topup.referenceId)
        ) {
          return { topup, isMatch: true };
        }
      }

      // If no exact match, check for amount and timing match (within last 30 minutes)
      const recentCutoff = new Date(Date.now() - 30 * 60 * 1000);
      for (const topup of pendingTopups) {
        if (topup.createdAt > recentCutoff) {
          return { topup, isMatch: true };
        }
      }

      return { topup: null, isMatch: false };
    } catch (error) {
      console.error("Error matching transaction:", error);
      return { topup: null, isMatch: false };
    }
  }
}