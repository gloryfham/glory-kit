# glory-kit

Glory 工具集 -- 保险产品查询 MCP Server，适用于 Claude Desktop、Claude Code、Qoder、Kiro、OpenCode。

GitHub: https://github.com/gloryfham/glory-kit

## 目录结构

```
glory-kit/
├── src/
│   ├── index.ts               # MCP STDIO Server 源码
│   └── cli.ts                 # CLI 入口（config / setup / serve）
├── dist/                      # 编译产物（npm install 时自动生成）
├── skills/                    # Claude Code Skills
│   └── glory-product-query/
│       └── SKILL.md
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

三步完成安装与配置：

### 第一步：安装

```bash
npm install gloryfham/glory-kit
```

安装时会自动编译 TypeScript 源码，无需手动 build。

### 第二步：初始化配置

```bash
npx glory-product-query-mcp config init --baseUrl <API地址>
```

`--baseUrl` 为必填项，请向管理员获取 API 地址。

配置文件保存在 `~/.glory/config.json`。

如需后续修改 baseUrl：

```bash
npx glory-product-query-mcp config set baseUrl <url>
```

### 第三步：配置 MCP 客户端

根据你使用的客户端执行对应命令：

**Claude Desktop:**

```bash
npx glory-product-query-mcp setup claude-desktop
```

自动写入 Claude Desktop 配置文件（需重启 Claude Desktop 生效）。

**Claude Code:**

```bash
npx glory-product-query-mcp setup claude-code
```

在当前目录生成 `.mcp.json`（需重启 Claude Code 会话生效）。

**Qoder:**

```bash
npx glory-product-query-mcp setup qoder
```

在当前目录生成 `.mcp.json`（需重启 Qoder 会话生效）。

**Kiro:**

```bash
npx glory-product-query-mcp setup kiro
```

在当前目录生成 `.kiro/settings/mcp.json`（需重启 Kiro 生效）。

**OpenCode:**

```bash
npx glory-product-query-mcp setup opencode
```

写入全局配置 `~/.config/opencode/opencode.json`（需重启 OpenCode 生效）。

## CLI 命令

```
glory-product-query-mcp config              # 查看当前配置
glory-product-query-mcp config init --baseUrl <url>  # 初始化配置（必填 baseUrl）
glory-product-query-mcp config set baseUrl <url>     # 修改 baseUrl
glory-product-query-mcp setup claude-desktop  # 配置 Claude Desktop
glory-product-query-mcp setup claude-code     # 配置 Claude Code（当前目录 .mcp.json）
glory-product-query-mcp setup qoder           # 配置 Qoder（当前目录 .mcp.json）
glory-product-query-mcp setup kiro            # 配置 Kiro（当前目录 .kiro/settings/mcp.json）
glory-product-query-mcp setup opencode        # 配置 OpenCode（~/.config/opencode/opencode.json）
glory-product-query-mcp serve                 # 启动 MCP Server (STDIO)
```

## Claude Code Skill（可选）

将 Skill 复制到项目的 `.claude/skills/` 目录，Claude Code 可自动识别并触发产品查询：

```bash
mkdir -p .claude/skills
cp -r node_modules/glory-product-query-mcp/skills/glory-product-query .claude/skills/
```

之后即可通过对话触发：

- "查询产品列表"
- "有什么在售产品"
- "搜索医疗相关产品"

## MCP 工具

### queryWecomPlanList

查询企微渠道保险产品销售计划列表。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| currentPage | number | 1 | 查询页码 |
| pageSize | number | 1000 | 每页数量 |
| statusCodes | string[] | ["2"] | 状态码，"2"=已上架 |
| channelCodes | string[] | ["WECOM_GLORY"] | 渠道码 |
| keyword | string | - | 关键词搜索 |
