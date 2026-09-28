/**
 * Printing Marketplace Price Calculator & Order Engine.
 * All financial math is executed in Kobo integers to prevent floating-point rounding bugs.
 */

export interface PrintCatalogueItem {
  itemType: "business_card" | "letterhead" | "stickers" | "envelopes" | "banner";
  name: string;
  defaultUnitPriceKobo: number;
  minQuantity: number;
}

export const PRINT_CATALOGUE: Record<string, PrintCatalogueItem> = {
  business_card: {
    itemType: "business_card",
    name: "Premium Branded Business Cards (Pack of 100)",
    defaultUnitPriceKobo: 5000, // ₦50.00 per card
    minQuantity: 100,
  },
  letterhead: {
    itemType: "letterhead",
    name: "Official Corporate Letterheads (Pack of 100)",
    defaultUnitPriceKobo: 7500, // ₦75.00 per sheet
    minQuantity: 100,
  },
  stickers: {
    itemType: "stickers",
    name: "Die-Cut Logo Brand Stickers (Pack of 50)",
    defaultUnitPriceKobo: 3000, // ₦30.00 per sticker
    minQuantity: 50,
  },
  envelopes: {
    itemType: "envelopes",
    name: "DL Branded Corporate Envelopes (Pack of 100)",
    defaultUnitPriceKobo: 8000, // ₦80.00 per envelope
    minQuantity: 100,
  },
  banner: {
    itemType: "banner",
    name: "Roll-Up Executive Display Banner (Single)",
    defaultUnitPriceKobo: 2500000, // ₦25,000.00
    minQuantity: 1,
  },
};

export interface PrintPriceCalculation {
  itemType: string;
  quantity: number;
  partnerUnitPriceKobo: number;
  partnerCostKobo: number;
  platformMarginPct: number; // e.g. 15 (15%)
  marginKobo: number;
  totalAmountKobo: number;
  formattedTotalNaira: string;
}

export function calculatePrintPrice(
  itemType: string,
  quantity: number,
  partnerUnitPriceKobo?: number,
  platformMarginPct: number = 15 // Default 15% platform margin
): PrintPriceCalculation {
  const catalogueItem = PRINT_CATALOGUE[itemType] || PRINT_CATALOGUE.business_card;
  const unitPriceKobo = partnerUnitPriceKobo || catalogueItem.defaultUnitPriceKobo;

  // Exact integer math in Kobo
  const partnerCostKobo = Math.round(unitPriceKobo * quantity);
  const marginKobo = Math.round(partnerCostKobo * (platformMarginPct / 100));
  const totalAmountKobo = partnerCostKobo + marginKobo;

  const totalNaira = (totalAmountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  return {
    itemType,
    quantity,
    partnerUnitPriceKobo: unitPriceKobo,
    partnerCostKobo,
    platformMarginPct,
    marginKobo,
    totalAmountKobo,
    formattedTotalNaira: totalNaira,
  };
}
