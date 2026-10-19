// One-time "last trimester" promo campaign — Sept–Nov 2026.
export const PROMO_PRICE_USD = 29.99;

// Purchases are blocked at/after this date.
export const PROMO_WINDOW_END = new Date("2026-12-01T00:00:00-05:00");

// Promo buyers keep Pro access through this date, then fold into the
// regular renewal-reminder flow at the regular price.
export const PRO_ACCESS_UNTIL = new Date("2026-12-31T23:59:59-05:00");

// Regular yearly renewal amount charged once a promo period ends.
// Matches the (pre-existing) figure the PagueloFacil callback already
// records for yearly plans — not the $299 shown on the pricing page.
export const PROMO_REGULAR_RENEWAL_AMOUNT = 240;
