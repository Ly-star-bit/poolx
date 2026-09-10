<p align="right">
  <a href="./README_CN.md">中文</a>
</p>

<div align="center">

# ⚡️ PoolX

**Modern Proxy Kernel Control Plane · Build Resilient Proxy Pools for Scraping & Automation**

[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green?style=flat-square)](./LICENSE)

Organize Clash / Mihomo nodes into high-availability, reusable, multi-port local proxy pools. No more tedious manual configuration maintenance.

</div>

> [!WARNING]
> This project is solely a proxy pool control plane management tool and **does NOT provide any proxy nodes or methods to obtain them**. It is intended for technical learning, research, and legitimate network optimization only. After logging in with `root` for the first time, change the default password `123456` immediately.

---

## 📖 Overview

When executing intensive requests in web crawlers, data harvesting, or automated outbound traffic scenarios, target services often impose rate-limiting and IP ban mechanisms. Common solutions have clear downsides:
- **Free proxy pools**: Extremely low uptime, high latency, and poor stability;
- **Commercial dynamic proxies**: Exorbitant pricing and unpredictable bandwidth billing;
- **Manual kernel configs**: High operational overhead for multi-port routing, latency benchmarking, node elimination, and hot reloads without centralized oversight.

**PoolX** solves this directly: Aggregate your existing node assets (subscription URLs or local configs), govern node pools and orchestrate workspace configurations through an intuitive web console, automatically generate runtime specifications, and launch the Mihomo core engine to expose robust, multi-port, failover-ready local proxy gateways.

---

## 🌟 Key Features

- 🖥️ **Modernized Panoramic Dashboard**
  - High information density dashboard inspired by Cloudflare and Linear design aesthetics;
  - Real-time KPI monitoring (total nodes, connectivity health rate, average latency, active port listener matrix);
  - Protocol breakdown chart (SS / VMess / VLESS / Trojan / Hysteria, etc.) and regional distribution summary;
  - Adaptive light/dark themes and a sleek glassmorphism authentication portal with password visibility toggle.
- 🔄 **Fully Automated Kernel Lifecycle**
  - **Instant auto-start**: Support `--auto-start-kernel` flag and environment variable to launch the kernel within 1 second;
  - **Unified binary resolution**: Smart PATH fallback and Windows `.exe` auto-completion without raw executable fallback;
  - **Real-time terminal log stream**: Built-in mock terminal monitor to stream live Mihomo outputs with 4-level color coding and search.
- 📡 **Multi-Source Import & Fingerprint Deduplication**
  - Import via local configuration files or remote subscription URLs with periodic or instant syncing;
  - Dual-layer fingerprint matching to filter out corrupt and duplicate nodes automatically.
- 🧪 **Live Real-Traffic Benchmark & Governance**
  - Issue real requests via the kernel to target endpoints (e.g. Cloudflare 204) for true latency benchmarking;
  - Single-node instant test and one-click bulk benchmarking;
  - Node tagging system with quick preset tags and bulk operations.
- 🎛️ **Workspace Multi-Port Proxy Orchestration**
  - Independent multi-port listeners (Mixed / HTTP / Socks5) mapping separate ports to designated tasks;
  - Flexible routing strategies: Round-Robin, Fallback, and Load-Balance;
  - Hot configuration reload without dropping active scraping connections.
- 🔒 **Stability & Security Foundation**
  - **Persistent SessionSecret**: Automatically generated and stored in SQLite/Postgres on initial boot, eliminating session drops and cookie errors across restarts;
  - Built-in user management, system audit logs, and IP-based rate limiting protection;
  - **Single standalone binary**: Go backend embeds compiled Next.js assets into a single portable binary.

---

## 🏗️ Architecture

```text
[ Clients / Crawlers / Automation Scripts ]
                      │
                      │  Socks5 / HTTP Proxy Requests (:7890, :7891, ...)
                      ▼
┌──────────────────────────────────────────────┐
│       PoolX Proxy Kernel Control Plane       │
│                                              │
│  ┌──────────────┐      ┌──────────────────┐  │
│  │ Web Dashboard│ ◄──► │  Go Backend Core │  │
│  └──────────────┘      └─────────┬────────┘  │
│                                  │           │
│                   IPC / REST API │ Control   │
│                                  ▼           │
│                        ┌──────────────────┐  │
│                        │   Mihomo Engine  │  │
│                        └─────────┬────────┘  │
└──────────────────────────────────┼───────────┘
                                   │
              Outbound Traffic     │ (Round-robin / Fallback / Load-balance)
                                   ▼
                   [ Remote Node Pool (SS/VMess/Trojan...) ]
                                   │
                                   ▼
                        [ Target Websites / APIs ]
```

---

## 🚀 Quick Start

Default Access URL: `http://localhost:3000`  
Default Credentials: `root` / `123456`

### Option 1: Standalone Single Binary (Recommended)

Download the precompiled binary from the Releases page (e.g. `poolx.exe`):

```powershell
# Run service with auto-start enabled
.\poolx.exe --port 3000 --auto-start-kernel
```

> **Note**: On the first startup, SQLite database `poolx.db` and session keys are automatically created and persisted—no complex initial setup required!

---

### Option 2: Docker Compose

```yaml
services:
  poolx:
    image: ghcr.io/ly-star-bit/poolx:latest
    restart: unless-stopped
    ports:
      - "3000:3000"           # Management web console
      - "7890-7900:7890-7900" # Proxy listener port range for crawlers
    environment:
      - PORT=3000
      - POOLX_KERNEL_AUTO_START=true
      - SQLITE_PATH=/data/poolx.db
      - GIN_MODE=release
    volumes:
      - ./data:/data
```

---

### Option 3: Local Source Build & Development

**Prerequisites**: Go 1.24+, Node.js 20+, pnpm 10+

```powershell
# 1. Clone the repository
git clone https://github.com/Ly-star-bit/poolx.git
cd poolx

# 2. Frontend setup (Dev port 3001, proxies backend on 3000)
cd server/web
pnpm install
pnpm dev

# 3. Backend start (In a separate terminal, default port 3000)
cd server
go run ./cmd/server --port 3000 --auto-start-kernel
```

**One-Click Production Build (Embeds frontend into standalone executable)**:
```powershell
cd server
.\build.ps1                 # Full build (web + zashboard + poolx.exe)
.\build.ps1 -SkipFrontend   # Skip frontend, compile Go binary and run tests
```

---

## ⚙️ Configuration Parameters

PoolX supports command-line arguments, environment variables, and live updates via the web console:

| CLI Flag | Env Variable | Description | Default |
| :--- | :--- | :--- | :--- |
| `--port` | `PORT` | Server listening port | `3000` |
| `--auto-start-kernel` | `POOLX_KERNEL_AUTO_START` | Auto-launch proxy kernel on boot | `false` |
| `--log-dir` | `LOG_DIR` | Directory for log files (empty = stdout) | empty |
| `-` | `SESSION_SECRET` | Session signing key (auto-persisted if unset) | Auto-persisted |
| `-` | `SQLITE_PATH` | SQLite database file path | `poolx.db` |
| `-` | `SQL_DSN` | PostgreSQL DSN (takes precedence if configured) | empty |

> For complete runtime configuration and deployment guides, refer to [docs/app-config.md](./docs/app-config.md) and [docs/deployment.md](./docs/deployment.md).

---

## 📄 License

This project is open-sourced under the [Apache License 2.0](./LICENSE).

