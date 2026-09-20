# WHALE OCEAN — Analytical Methodology & Integrity

## 1. Core Philosophy: Intelligence, Not Speculation
WHALE OCEAN is an observational market intelligence system. It measures, classifies, and reports what has actually happened on the Hyperliquid protocol.

### Anti-Prediction Policy
- Whale Ocean **never** generates price forecasts (e.g. "BTC will rise").
- Whale Ocean **never** attributes psychology, intent, or insider status to wallets (e.g. "Whale is preparing for a pump").
- Whale Ocean **never** provides buy/sell signals.
- All natural language summaries are strictly factual descriptions of verified numerical deltas.

---

## 2. Whale Classification
Wallets in the observed universe are categorized into quantitative tiers based exclusively on total observed notional exposure ($E_{\text{total}} = \sum |\text{size}_i| \times \text{entryPrice}_i$):

| Tier | Minimum Exposure | Maximum Exposure | Classification Meaning |
| :--- | :--- | :--- | :--- |
| **FISH** | $\$0$ | $\$50,000$ | Small observed account. |
| **DOLPHIN** | $\$50,000$ | $\$250,000$ | Active mid-size account. |
| **SHARK** | $\$250,000$ | $\$1,000,000$ | Significant directional trader. |
| **HUMPBACK** | $\$1,000,000$ | $\$5,000,000$ | Large institutional-scale account. |
| **ORCA** | $\$5,000,000$ | $\$20,000,000$ | High-impact market participant. |
| **BLUE WHALE** | $\$20,000,000$ | $\$50,000,000$ | Protocol mega-trader. |
| **SPERM WHALE** | $\$50,000,000$ | $\infty$ | Top-tier sovereign/whale entity. |

*Rule:* Tiers are visual brackets only. The exact dollar exposure is always displayed alongside the tier.

---

## 3. Whale DNA (Observed Behavioral Profile)
Whale DNA summarizes measurable historical patterns of an observed wallet:
- **Directional Bias (% Long):** $\frac{\text{Long Notional}}{\text{Total Notional}} \times 100$.
- **Market Concentration (HHI):** Herfindahl-Hirschman Index $\sum s_i^2$ where $s_i$ is market share percentage ($0 - 10,000$). High HHI indicates concentrated exposure in 1–2 assets.
- **Position Flip Frequency:** Number of directional flips (Long $\leftrightarrow$ Short) observed over rolling 30 days.
- **Average Position Notional:** Mean size of recorded position change events.

### Insufficient History Rule
If fewer than 3 verified position events exist for a wallet, Whale DNA explicitly reports:
`"Insufficient observed history (< 3 position events recorded)."`
Whale Ocean never fabricates synthetic behavior.

---

## 4. Ocean Conditions Index (0–100)
A transparent environmental index describing current market climate:

$$\text{Index} = 0.35 \cdot V_{\text{vol}} + 0.25 \cdot D_{\text{OI}} + 0.25 \cdot P_{\text{funding}} + 0.15 \cdot \Delta W_{\text{whale}}$$

1. **Realized Volatility ($V_{\text{vol}}$):** Mean absolute percentage price delta across active assets over rolling 1h window ($0\% \rightarrow 0, 4\%+ \rightarrow 100$).
2. **Ocean Density ($D_{\text{OI}}$):** Rate of Open Interest expansion/contraction ($0\% \rightarrow 0, 20\%+ \rightarrow 100$).
3. **Water Pressure ($P_{\text{funding}}$):** Mean absolute 8h funding rate stress ($0.0000 \rightarrow 0, 0.0006+ \rightarrow 100$).
4. **Whale Delta ($\Delta W_{\text{whale}}$):** Absolute net exposure delta across tracked wallets ($0 \rightarrow 0, \$50\text{M}+ \rightarrow 100$).

### Environmental Classifications
- **`CALM` (0–25):** Low volatility, stable open interest, minimal funding pressure.
- **`ACTIVE` (26–55):** Normal market flow, healthy turnover.
- **`RESTLESS` (56–75):** Elevated volatility, rapid OI swings, expanding carry stress.
- **`STORM` (76–100):** Extreme volatility, aggressive positioning shifts, heavy funding stress.

---

## 5. "What Changed?" Synthesis
A deterministic event synthesizer generates factual statements from verified database deltas:
- Position events $\ge \$250,000$ notional delta produce wallet activity items.
- Market open interest deltas $\ge 5\%$ produce density change items.
- Generated purely via deterministic templates; no LLMs are permitted to hallucinate market activity.
