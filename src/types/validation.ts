import {
  VerifiedMarketSnapshot,
  VerifiedWalletObservation,
  validateMarketSnapshot,
  validateWalletObservation,
} from './contracts';

/**
 * Anti-Fake Assertion Guard.
 * Ensures an incoming array of snapshots contains ONLY verified data from Hyperliquid.
 * Rejects any unverified or mock data.
 */
export function assertVerifiedSnapshots(snapshots: unknown[]): VerifiedMarketSnapshot[] {
  if (!Array.isArray(snapshots)) {
    throw new Error('Expected array of market snapshots');
  }
  return snapshots.map(validateMarketSnapshot);
}

/**
 * Anti-Fake Assertion Guard for Wallets.
 */
export function assertVerifiedWallets(wallets: unknown[]): VerifiedWalletObservation[] {
  if (!Array.isArray(wallets)) {
    throw new Error('Expected array of wallet observations');
  }
  return wallets.map(validateWalletObservation);
}
