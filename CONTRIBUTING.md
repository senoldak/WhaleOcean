# Contributing to Whale Ocean

Thank you for your interest in contributing to **Whale Ocean**! We welcome community contributions aimed at enhancing market transparency, refining analytical algorithms, and improving developer usability.

---

## Code of Conduct & Core Principles

### 1. Absolute Zero-Tolerance Fake Data Policy
Whale Ocean is strictly an observational intelligence platform:
- **Never submit PRs that inject mock market data**, simulated wallet positions, synthetic historical candles, or fallback mock feeds when APIs disconnect.
- Malformed or missing data must trigger explicit UI indicators (`DATA UNAVAILABLE`, `WAITING FOR VERIFIED LIVE DATA`), never synthetic fabrication.
- Zero speculative or hype language (`pump`, `dump`, `moon`, `smart money`, `alpha`, `insider`). All synthesized events must be strictly factual descriptions of verified numerical deltas.

### 2. Code Integrity & Testing Requirements
- Every new feature, calculation, or bug fix must include corresponding tests under the `tests/` directory.
- All tests must pass cleanly before opening a pull request:
  ```bash
  npm test
  ```
- Ensure type-checking and linter checks succeed:
  ```bash
  npm run lint
  npm run build
  ```

---

## Development Workflow

1. **Fork and Clone:**
   ```bash
   git clone https://github.com/senoldak/WhaleOcean.git
   cd WhaleOcean
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```

4. **Make Your Changes:**
   - Adhere to TypeScript strict mode.
   - Maintain parameterized SQL statements for all database operations (`src/db/repository.ts`).
   - Respect Hyperliquid API rate limits by maintaining request staggering in the collector.

5. **Run the Verification Suite:**
   ```bash
   npm test
   ```

6. **Submit a Pull Request:**
   - Push your branch to GitHub.
   - Open a Pull Request detailing the changes, reasoning, and test evidence.
