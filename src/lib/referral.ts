/**
 * Generates a unique referral code for a user
 * @param userId The user's ID
 * @returns A formatted referral code
 */
export function generateReferralCode(userId: string): string {
  // Generate a referral code based on user ID and timestamp
  const timestamp = Date.now().toString(36);
  const userPart = userId.slice(-4).toUpperCase();
  return `REF${userPart}${timestamp}`.slice(0, 12);
}

/**
 * Checks if a referral code is unique in the database
 * @param db Prisma client instance
 * @param referralCode The code to check
 * @returns Promise<boolean> True if the code is unique
 */
export async function isReferralCodeUnique(db: any, referralCode: string): Promise<boolean> {
  const existing = await db.user.findUnique({
    where: { referralCode }
  });
  return !existing;
}

/**
 * Generates a unique referral code for a user, ensuring uniqueness
 * @param db Prisma client instance
 * @param userId The user's ID
 * @returns Promise<string> A unique referral code
 */
export async function generateUniqueReferralCode(db: any, userId: string): Promise<string> {
  let referralCode: string;
  let isUnique = false;
  
  do {
    referralCode = generateReferralCode(userId);
    isUnique = await isReferralCodeUnique(db, referralCode);
  } while (!isUnique);
  
  return referralCode;
}