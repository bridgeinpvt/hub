import { logger } from "@/lib/logger";

export interface EmailTemplate {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface AssetDeliveryEmailData {
  buyerName: string;
  capsuleName: string;
  assetLink: string;
  purchaseId: string;
  sellerName: string;
}

/**
 * Email service for sending notifications
 * This is a simple implementation that logs emails in development
 * In production, you would integrate with services like Resend, SendGrid, etc.
 */
class EmailService {
  private fromEmail = "admin@nocage.in";
  private fromName = "NoCage";

  /**
   * Send email using DISPATCH_API_URL with template and data (GET method)
   */
  private async sendEmailWithTemplate(
    email: string,
    template: string,
    data: Record<string, any>
  ): Promise<boolean> {
    try {
      // In development, log the email
      if (process.env.NODE_ENV === "development") {
        logger.log(`[Email] Sending ${template} email to ${email}`);
        logger.log(`[Email] Data:`, data);
      }

      // Use DISPATCH_API_URL for sending emails
      if (process.env.DISPATCH_API_URL && process.env.DISPATCH_API_TOKEN) {
        try {
          // Build query parameters - ensure all values are strings
          const params = new URLSearchParams();
          params.append('email', email);
          params.append('template', template);

          // Add all data fields as individual parameters
          Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              params.append(key, String(value));
            }
          });

          const dispatchUrl = `${process.env.DISPATCH_API_URL}/api/dispatch?${params.toString()}`;

          if (process.env.NODE_ENV === "development") {
            logger.log(`[Email] Full URL: ${dispatchUrl}`);
          }

          const response = await fetch(dispatchUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.DISPATCH_API_TOKEN}`,
              'Content-Type': 'application/json',
            }
          });

          if (response.ok) {
            logger.log(`[Email] Successfully sent ${template} email to ${email} via DISPATCH_API`);
            return true;
          } else {
            logger.warn(`[Email] DISPATCH_API failed with status ${response.status}`);
            return false;
          }
        } catch (dispatchError) {
          logger.error("[Email] DISPATCH_API error:", dispatchError);
          return false;
        }
      } else {
        logger.warn("[Email] DISPATCH_API_URL or token not configured");
        return false;
      }

    } catch (error) {
      logger.error("[Email] Failed to send email:", error);
      return false;
    }
  }

  /**
   * Send asset delivery notification email to buyer
   */
  async sendAssetDeliveryEmail(
    buyerEmail: string,
    data: AssetDeliveryEmailData
  ): Promise<boolean> {
    const { buyerName, capsuleName, assetLink, purchaseId, sellerName } = data;

    return await this.sendEmailWithTemplate(buyerEmail, "asset_delivery", {
      buyer_name: buyerName,
      capsule_name: capsuleName,
      asset_link: assetLink,
      purchase_id: purchaseId,
      seller_name: sellerName
    });
  }

  /**
   * Send asset delivery confirmation request from admin
   */
  async sendAssetConfirmationEmail(
    buyerEmail: string,
    data: AssetDeliveryEmailData
  ): Promise<boolean> {
    const { buyerName, capsuleName, assetLink, purchaseId } = data;

    return await this.sendEmailWithTemplate(buyerEmail, "asset_confirmation", {
      buyer_name: buyerName,
      capsule_name: capsuleName,
      asset_link: assetLink,
      purchase_id: purchaseId
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();