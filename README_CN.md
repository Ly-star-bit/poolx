<p align="right">
  <a href="./README.md">English</a>
</p>

<div align="center">

# ⚡️ PoolX

**现代化代理内核控制中台 · 为爬虫与自动化场景构建高可用代理池**

[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green?style=flat-square)](./LICENSE)

将 Clash / Mihomo 节点高效组织为高可用、可复用、多端口的本地代理池，告别繁琐的手动配置维护。

</div>

> [!WARNING]
> 本项目仅为代理池控制面管理工具，**不提供任何节点及其获取方式**。仅供技术学习、研究与合法网络优化交流使用，请勿用于非法用途。初次以 `root` 登录后，请务必及时修改默认密码 `123456`。

---

## 📖 项目定位与解决的问题

在数据采集、网页爬取或自动化出网场景中，高频次请求极易触发目标站点的防刷与封禁机制。常见的代理解决方案存在诸多痛点：
- **免费代理池**：可用率极低、延迟高且极度不稳定；
- **商业动态代理**：费用高昂、按流量计费成本不可控；
- **纯手写内核配置**：维护多端口分流、节点测速淘汰、热重载成本极高且缺乏统一管控。

**PoolX** 专为解决这一场景而生：直接聚合已有节点资源（订阅链接/本地配置），通过图形化中台进行节点池治理与工作台编排，自动生成内核运行时配置并拉起 Mihomo 实例，对外输出稳定、分流、自动回退的多端口代理网关。

---

## 🌟 核心特性

- 🖥️ **现代化全景中台**
  - 参考 Cloudflare / Linear 质感重构的高信息密度 Dashboard；
  - 核心 KPI 监控卡片（节点总数、测速健康率、网络延迟均值、活跃端口监听矩阵）；
  - 协议分布统计（SS / VMess / VLESS / Trojan / Hysteria 等）与地区分布概览；
  - 内置深浅双色自适应主题体系与毛玻璃质感全屏认证页面（支持密码显隐切换）。
- 🔄 **全流程自动化内核控制**
  - **开箱即用自动拉起**：支持 `--auto-start-kernel` 参数与环境变量自启，服务启动 1 秒内自动拉起代理内核挂载监听；
  - **统一二进制解析**：智能识别系统 PATH、环境变量与 Windows `.exe` 自动适配，告别裸名回退；
  - **实时终端日志流**：内置模拟终端监视器，实时查看 Mihomo 内核输出日志，支持四级日志高亮与搜索。
- 📡 **多源节点导入与指纹去重**
  - 支持直接上传本地配置文件，或配置多条远程订阅链接定时/即时同步抓取；
  - 双层指纹比对机制，自动过滤无效及重复节点。
- 🧪 **真流量真实测速与治理**
  - 基于内核直接向真实网络端点（如 Cloudflare 204）发起连通性及延时测速；
  - 支持单节点即时测速与一键全量测速；
  - 节点标签系统（支持快捷预设标签与批量操作）。
- 🎛️ **工作台多端口代理编排**
  - 多端口独立监听（Mixed / HTTP / Socks5），可为不同爬虫任务分配不同端口；
  - 自由组合分流策略：轮询 (Round-Robin)、自动回退 (Fallback)、负载均衡 (Load-Balance)；
  - 支持热重载配置，无需中断正在进行的抓取任务。
- 🔒 **稳定与安全基座**
  - **SessionSecret 数据库持久化**：首次启动自动生成并存库，服务重启永不掉登录，杜绝 cookie 验签报错；
  - 内置全流程用户管理、系统审计日志与基于 IP 的全局速率限制保护；
  - **单文件独立部署**：Go 后端直接内嵌编译后的 Next.js 静态资源，单个 `poolx.exe` 双击即跑。

---

## 🏗️ 系统架构

```text
[ 客户端 / 爬虫任务 / 自动化脚本 ]
          │
          │  Socks5 / HTTP 代理请求 (:7890, :7891, ...)
          ▼
┌──────────────────────────────────────────────┐
│       PoolX Proxy Kernel Control Plane       │
│                                              │
│  ┌──────────────┐      ┌──────────────────┐  │
│  │ Web Dashboard│ ◄──► │  Go Backend Core │  │
│  └──────────────┘      └─────────┬────────┘  │
│                                  │           │
│                   IPC / REST API │ 编排与监控 │
│                                  ▼           │
│                        ┌──────────────────┐  │
│                        │   Mihomo Engine  │  │
│                        └─────────┬────────┘  │
└──────────────────────────────────┼───────────┘
                                   │
              Outbound Traffic     │ (Round-robin / Fallback / Load-balance)
                                   ▼
                   [ 远端代理节点池 (SS/VMess/Trojan...) ]
                                   │
                                   ▼
                            [ 目标网站 / API ]
```

---

## 🚀 快速开始

默认访问地址：`http://localhost:3000`  
默认初始账号：`root`  
默认初始密码：`123456`

### 方式一：单文件免安装运行（推荐）

从 Release 页面下载对应系统的二进制文件（如 `poolx.exe`）：

```powershell
# 启动服务并指定端口（推荐开启内核自启）
.\poolx.exe --port 3000 --auto-start-kernel
```

> **说明**：首次启动会自动生成 SQLite 数据库文件 `poolx.db`，并自动持久化会话秘钥，无需额外配置即可直接使用！

---

### 方式二：Docker Compose 部署

```yaml
services:
  poolx:
    image: ghcr.io/ly-star-bit/poolx:latest
    restart: unless-stopped
    ports:
      - "3000:3000"           # 控制台管理端口
      - "7890-7900:7890-7900" # 映射给爬虫业务的代理端口池
    environment:
      - PORT=3000
      - POOLX_KERNEL_AUTO_START=true
      - SQLITE_PATH=/data/poolx.db
      - GIN_MODE=release
    volumes:
      - ./data:/data
```

---

### 方式三：本地源码调试与构建

**前置依赖**：Go 1.24+、Node.js 20+、pnpm 10+

```powershell
# 1. 克隆代码仓库
git clone https://github.com/Ly-star-bit/poolx.git
cd poolx

# 2. 前端依赖安装与启动（开发端口 3001，自动同源反代到 3000）
cd server/web
pnpm install
pnpm dev

# 3. 后端服务启动（另起终端，默认监听 3000 端口）
cd server
go run ./cmd/server --port 3000 --auto-start-kernel
```

**一键全量打包（构建内嵌前端的单一可执行文件）**：
```powershell
cd server
.\build.ps1                 # 全量构建前端并输出 poolx.exe
.\build.ps1 -SkipFrontend   # 跳过前端，仅编译后端二进制并执行全量单测
```

---

## ⚙️ 核心配置参数

PoolX 支持通过命令行参数、环境变量以及管理端界面热更新配置：

| 命令行参数 | 环境变量 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `--port` | `PORT` | 控制台服务监听端口 | `3000` |
| `--auto-start-kernel` | `POOLX_KERNEL_AUTO_START` | 服务启动时自动拉起代理内核 | `false` |
| `--log-dir` | `LOG_DIR` | 日志持久化输出目录（留空则输出至控制台） | 空 |
| `-` | `SESSION_SECRET` | 会话签名密钥（留空则首次启动自动持久化到数据库） | 自动存库 |
| `-` | `SQLITE_PATH` | SQLite 数据库文件存储路径 | `poolx.db` |
| `-` | `SQL_DSN` | PostgreSQL 连接串（配置时优先使用 Postgres） | 空 |

> 完整参数说明与高级运行时设置，请查阅 [docs/app-config.md](./docs/app-config.md) 和 [docs/deployment.md](./docs/deployment.md)。

---

## 📄 开源许可证

本项目基于 [Apache License 2.0](./LICENSE) 许可协议开源。
