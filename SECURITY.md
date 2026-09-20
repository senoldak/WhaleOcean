# Security Policy

## Supported Versions

Whale Ocean actively maintains and patches the current major release:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Observational Security Model

Whale Ocean is an observational, read-only analytics platform:
- **No Credentials Accepted:** The platform does not require, accept, prompt for, or store cryptocurrency private keys, seed phrases, or exchange trading API keys.
- **Public Data Only:** All data is fetched from official, public Hyperliquid protocol endpoints (`api.hyperliquid.xyz`).
- **SQL Injection Prevention:** All persistence operations utilize parameterized queries through `node:sqlite`.
- **Runtime Schema Validation:** Ingested payloads pass through strict Zod schemas before being processed or persisted.

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential exploit within Whale Ocean, please report it responsibly:

1. **Do not disclose the issue publicly** in GitHub issues or discussions.
2. Please open a **Private Security Advisory** on the GitHub repository, or email the maintainers directly.
3. Include detailed steps to reproduce the issue, proof of concept, and any affected configurations.

We will acknowledge receipt within 48 hours and work with you to remediate the vulnerability promptly.
