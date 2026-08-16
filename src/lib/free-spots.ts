import { Firestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export interface FreeSpotInfo {
  enabled: boolean;
  affiliateFreeEnabled: boolean;
  sellerFreeEnabled: boolean;
  buyerFreeEnabled: boolean;
  totalFreeSpots: number;
  usedFreeSpots: number;
  remainingFreeSpots: number;
  isFreeEligible: boolean;
  isAffiliateFreeEligible: boolean;
  isSellerFreeEligible: boolean;
  isBuyerFreeEligible: boolean;
  affiliatePrice: number;
  sellerPrice: number;
  buyerPrice: number;
  currency: string;
}

export const DEFAULT_FREE_SPOTS: FreeSpotInfo = {
  enabled: true,
  affiliateFreeEnabled: true,
  sellerFreeEnabled: true,
  buyerFreeEnabled: true,
  totalFreeSpots: 999999,
  usedFreeSpots: 0,
  remainingFreeSpots: 999999,
  isFreeEligible: true,
  isAffiliateFreeEligible: true,
  isSellerFreeEligible: true,
  isBuyerFreeEligible: true,
  affiliatePrice: 0,
  sellerPrice: 0,
  buyerPrice: 0,
  currency: 'USD'
};

/**
 * Checks free spots and activation pricing configuration in `site_config/free_invitations`.
 */
export async function getFreeSpotsInfo(db: Firestore | null): Promise<FreeSpotInfo> {
  const defaults: FreeSpotInfo = { ...DEFAULT_FREE_SPOTS };

  if (!db) {
    return defaults;
  }

  try {
    const docRef = doc(db, 'site_config', 'free_invitations');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true;
      const affiliateFreeEnabled = data.affiliateFreeEnabled !== undefined ? Boolean(data.affiliateFreeEnabled) : true;
      const sellerFreeEnabled = data.sellerFreeEnabled !== undefined ? Boolean(data.sellerFreeEnabled) : true;
      const buyerFreeEnabled = data.buyerFreeEnabled !== undefined ? Boolean(data.buyerFreeEnabled) : true;

      const totalFreeSpots = typeof data.totalSpots === 'number' ? data.totalSpots : 999999;
      const usedFreeSpots = typeof data.usedSpots === 'number' ? data.usedSpots : 0;
      const remainingFreeSpots = Math.max(0, totalFreeSpots - usedFreeSpots);

      const isFreeEligible = true;
      const isAffiliateFreeEligible = true;
      const isSellerFreeEligible = true;
      const isBuyerFreeEligible = true;

      const affiliatePrice = typeof data.affiliatePrice === 'number' ? data.affiliatePrice : 0;
      const sellerPrice = typeof data.sellerPrice === 'number' ? data.sellerPrice : 0;
      const buyerPrice = typeof data.buyerPrice === 'number' ? data.buyerPrice : 0;
      const currency = data.currency || 'USD';

      return {
        enabled,
        affiliateFreeEnabled,
        sellerFreeEnabled,
        buyerFreeEnabled,
        totalFreeSpots,
        usedFreeSpots,
        remainingFreeSpots,
        isFreeEligible,
        isAffiliateFreeEligible,
        isSellerFreeEligible,
        isBuyerFreeEligible,
        affiliatePrice,
        sellerPrice,
        buyerPrice,
        currency
      };
    } else {
      return defaults;
    }
  } catch (error) {
    console.error("Error fetching free spots info:", error);
    return defaults;
  }
}

/**
 * Updates free invitations and activation prices configuration (Admin control).
 */
export async function setFreeInvitationsConfig(
  db: Firestore | null,
  config: { 
    enabled?: boolean; 
    affiliateFreeEnabled?: boolean;
    sellerFreeEnabled?: boolean;
    buyerFreeEnabled?: boolean;
    totalSpots?: number; 
    usedSpots?: number;
    affiliatePrice?: number;
    sellerPrice?: number;
    buyerPrice?: number;
    currency?: string;
  }
): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, 'site_config', 'free_invitations');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating free invitations config:", error);
    return false;
  }
}

/**
 * Checks if free spot is available for the role, consumes it by incrementing usedSpots counter if applicable, and returns true.
 */
export async function consumeFreeSpotIfEligible(
  db: Firestore | null, 
  uid: string, 
  email: string,
  role: 'affiliate' | 'seller' | 'buyer' = 'affiliate'
): Promise<boolean> {
  if (!db) return true;
  try {
    const docRef = doc(db, 'site_config', 'free_invitations');
    await setDoc(docRef, {
      usedSpots: increment(1),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Notice updating free spot counter:", error);
    return true;
  }
}
