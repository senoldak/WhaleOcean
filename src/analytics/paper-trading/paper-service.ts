import { PaperPosition, PaperTrade, PaperSubscription, PaperPortfolio, VerifiedMarketSnapshot } from '../../types/contracts';
import { WhaleOceanRepository, PositionEvent } from '../../db/repository';

export interface PaperOrderInput {
  portfolioId?: string;
  asset: string;
  side: 'LONG' | 'SHORT';
  notional: number;
  leverage?: number;
  currentMarketPrice: number;
  takeProfit?: number | null;
  stopLoss?: number | null;
  source?: 'MANUAL' | 'COPY_WHALE' | 'STRATEGY_BOT';
  sourceWallet?: string | null;
}

const TAKER_FEE_PCT = 0.00035; // 0.035% Hyperliquid taker fee
const SLIPPAGE_BPS = 0.0005; // 5 bps (0.05%) default slippage

export function placePaperOrder(order: PaperOrderInput, repo: WhaleOceanRepository): PaperPosition {
  const portfolioId = order.portfolioId || 'default';
  const portfolio = repo.getOrCreatePaperPortfolio(portfolioId);
  const leverage = Math.max(1, order.leverage || 1);
  const requiredMargin = order.notional / leverage;
  const entryFee = order.notional * TAKER_FEE_PCT;

  if (portfolio.cashBalance < requiredMargin + entryFee) {
    throw new Error(
      `Insufficient cash balance ($${portfolio.cashBalance.toFixed(2)}) for required margin ($${requiredMargin.toFixed(2)}) and fee ($${entryFee.toFixed(2)})`
    );
  }

  // Dynamic slippage on entry
  const entryPrice = order.side === 'LONG'
    ? order.currentMarketPrice * (1 + SLIPPAGE_BPS)
    : order.currentMarketPrice * (1 - SLIPPAGE_BPS);

  const size = order.notional / entryPrice;

  // Calculate liquidation price
  const liquidationPrice = order.side === 'LONG'
    ? entryPrice * (1 - (1 / leverage) * 0.9)
    : entryPrice * (1 + (1 / leverage) * 0.9);

  const posId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const newPosition: PaperPosition = {
    id: posId,
    portfolioId,
    asset: order.asset,
    side: order.side,
    size,
    entryPrice,
    currentPrice: order.currentMarketPrice,
    leverage,
    marginUsed: requiredMargin,
    unrealizedPnl: 0,
    liquidationPrice,
    takeProfit: order.takeProfit ?? null,
    stopLoss: order.stopLoss ?? null,
    source: order.source || 'MANUAL',
    sourceWallet: order.sourceWallet ? order.sourceWallet.toLowerCase() : null,
    openedAt: now,
    updatedAt: now,
  };

  // Update portfolio balances
  portfolio.cashBalance -= (requiredMargin + entryFee);
  portfolio.marginUsed += requiredMargin;
  repo.updatePaperPortfolio(portfolio);

  // Save new position
  repo.savePaperPosition(newPosition);

  return newPosition;
}

export function closePaperPosition(
  positionId: string,
  repo: WhaleOceanRepository,
  exitPrice?: number,
  reason: 'MANUAL' | 'TP' | 'SL' | 'WHALE_CLOSED' | 'LIQUIDATED' = 'MANUAL',
  portfolioId = 'default'
): PaperTrade {
  const positions = repo.getPaperPositions(portfolioId);
  const pos = positions.find(p => p.id === positionId);
  if (!pos) {
    throw new Error(`Position ${positionId} not found in portfolio ${portfolioId}`);
  }

  const rawExitPrice = exitPrice || pos.currentPrice;
  // Slippage on exit
  const finalExitPrice = pos.side === 'LONG'
    ? rawExitPrice * (1 - SLIPPAGE_BPS)
    : rawExitPrice * (1 + SLIPPAGE_BPS);

  const notional = pos.size * finalExitPrice;
  const exitFee = notional * TAKER_FEE_PCT;

  const priceDiff = pos.side === 'LONG'
    ? finalExitPrice - pos.entryPrice
    : pos.entryPrice - finalExitPrice;

  const grossPnl = pos.size * priceDiff;
  const netPnl = grossPnl - exitFee;

  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const trade: PaperTrade = {
    id: tradeId,
    portfolioId,
    asset: pos.asset,
    side: pos.side,
    size: pos.size,
    entryPrice: pos.entryPrice,
    exitPrice: finalExitPrice,
    leverage: pos.leverage,
    realizedPnl: netPnl,
    feePaid: exitFee,
    fundingPaid: 0,
    source: pos.source,
    sourceWallet: pos.sourceWallet,
    closeReason: reason,
    openedAt: pos.openedAt,
    closedAt: now,
  };

  // Return margin + realized PnL to portfolio
  const portfolio = repo.getOrCreatePaperPortfolio(portfolioId);
  portfolio.marginUsed = Math.max(0, portfolio.marginUsed - pos.marginUsed);
  portfolio.cashBalance = Math.max(0, portfolio.cashBalance + pos.marginUsed + netPnl);
  portfolio.realizedPnl += netPnl;
  repo.updatePaperPortfolio(portfolio);

  // Delete position and record trade
  repo.deletePaperPosition(pos.id);
  repo.savePaperTrade(trade);

  return trade;
}

export function updateMarkToMarket(
  repo: WhaleOceanRepository,
  snapshots: VerifiedMarketSnapshot[],
  portfolioId = 'default'
): {
  totalEquity: number;
  unrealizedPnl: number;
  liquidationsTriggered: number;
} {
  const positions = repo.getPaperPositions(portfolioId);
  const portfolio = repo.getOrCreatePaperPortfolio(portfolioId);

  let totalUnrealized = 0;
  let triggersCount = 0;

  for (const pos of positions) {
    const snap = snapshots.find(s => s.asset === pos.asset);
    if (!snap) continue;

    const currentPrice = snap.markPrice;
    const priceDiff = pos.side === 'LONG'
      ? currentPrice - pos.entryPrice
      : pos.entryPrice - currentPrice;
    const unrealized = pos.size * priceDiff;

    // Check Take Profit Trigger
    if (pos.takeProfit) {
      const hitTp = pos.side === 'LONG'
        ? currentPrice >= pos.takeProfit
        : currentPrice <= pos.takeProfit;
      if (hitTp) {
        closePaperPosition(pos.id, repo, pos.takeProfit, 'TP', portfolioId);
        triggersCount++;
        continue;
      }
    }

    // Check Stop Loss Trigger
    if (pos.stopLoss) {
      const hitSl = pos.side === 'LONG'
        ? currentPrice <= pos.stopLoss
        : currentPrice >= pos.stopLoss;
      if (hitSl) {
        closePaperPosition(pos.id, repo, pos.stopLoss, 'SL', portfolioId);
        triggersCount++;
        continue;
      }
    }

    // Check Liquidation
    if (pos.liquidationPrice) {
      const isLiquidated = pos.side === 'LONG'
        ? currentPrice <= pos.liquidationPrice
        : currentPrice >= pos.liquidationPrice;
      if (isLiquidated) {
        closePaperPosition(pos.id, repo, pos.liquidationPrice, 'LIQUIDATED', portfolioId);
        triggersCount++;
        continue;
      }
    }

    // Otherwise update live mark-to-market on position
    pos.currentPrice = currentPrice;
    pos.unrealizedPnl = unrealized;
    repo.savePaperPosition(pos);
    totalUnrealized += unrealized;
  }

  const totalEquity = portfolio.cashBalance + portfolio.marginUsed + totalUnrealized;
  return {
    totalEquity,
    unrealizedPnl: totalUnrealized,
    liquidationsTriggered: triggersCount,
  };
}

export function processWhaleEventForCopyTrading(
  event: PositionEvent,
  repo: WhaleOceanRepository,
  snapshots: VerifiedMarketSnapshot[] = [],
  portfolioId = 'default'
): void {
  const subscriptions = repo.getPaperSubscriptions(portfolioId);
  const sub = subscriptions.find(
    s => s.walletAddress.toLowerCase() === event.walletAddress.toLowerCase() && s.isActive
  );

  if (!sub) return;

  const positions = repo.getPaperPositions(portfolioId);
  const existingCopiedPos = positions.find(
    p => p.source === 'COPY_WHALE' && p.sourceWallet?.toLowerCase() === event.walletAddress.toLowerCase() && p.asset === event.asset
  );

  const snapshot = snapshots.find(s => s.asset === event.asset);
  const currentPrice = snapshot ? snapshot.markPrice : (event.prevSize > 0 ? Math.abs(event.deltaNotional / event.prevSize) : 100);

  if ((event.eventType === 'OPEN' || event.eventType === 'INCREASE' || event.eventType === 'FLIP') && !existingCopiedPos) {
    const side: 'LONG' | 'SHORT' = event.deltaNotional >= 0 ? 'LONG' : 'SHORT';
    const notional = sub.allocatedUsd * (sub.multiplier || 1.0);

    try {
      placePaperOrder({
        portfolioId,
        asset: event.asset,
        side,
        notional,
        leverage: 3, // Safe default copy leverage
        currentMarketPrice: currentPrice,
        source: 'COPY_WHALE',
        sourceWallet: event.walletAddress.toLowerCase(),
      }, repo);
    } catch {
      // Ignore if insufficient margin
    }
  } else if ((event.eventType === 'CLOSE' || event.eventType === 'FLIP') && existingCopiedPos) {
    try {
      closePaperPosition(existingCopiedPos.id, repo, currentPrice, 'WHALE_CLOSED', portfolioId);
    } catch {}
  }
}
