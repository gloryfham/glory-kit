#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// 配置文件路径：~/.glory/config.json
const CONFIG_DIR = path.join(os.homedir(), ".glory");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface GloryConfig {
  baseUrl: string;
}

const DEFAULT_CONFIG: GloryConfig = {
  baseUrl: "",
};

// ---------- 配置管理 ----------

function loadConfig(): GloryConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {
    // 配置文件损坏，使用默认值
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: GloryConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function handleConfig(args: string[]): void {
  if (args.length === 0) {
    // 显示当前配置
    const config = loadConfig();
    console.log("当前配置 (%s):\n", CONFIG_FILE);
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args[0] === "init") {
    const config = { ...DEFAULT_CONFIG };
    // 支持 --baseUrl 参数
    const baseUrlIdx = args.indexOf("--baseUrl");
    if (baseUrlIdx !== -1 && args[baseUrlIdx + 1]) {
      config.baseUrl = args[baseUrlIdx + 1];
    }
    if (!config.baseUrl) {
      console.error("错误: 必须通过 --baseUrl 指定 API 地址");
      console.error("用法: glory-product-query-mcp config init --baseUrl <url>");
      process.exit(1);
    }
    saveConfig(config);
    console.log("配置已初始化: %s\n", CONFIG_FILE);
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args[0] === "set" && args[1] && args[2]) {
    const config = loadConfig();
    if (args[1] === "baseUrl") {
      config.baseUrl = args[2];
      saveConfig(config);
      console.log("baseUrl 已更新为: %s", config.baseUrl);
    } else {
      console.error("未知配置项: %s", args[1]);
      process.exit(1);
    }
    return;
  }

  console.error("用法:");
  console.error("  glory-product-query-mcp config              # 查看当前配置");
  console.error("  glory-product-query-mcp config init          # 初始化默认配置");
  console.error("  glory-product-query-mcp config init --baseUrl <url>  # 初始化并设置 baseUrl");
  console.error("  glory-product-query-mcp config set baseUrl <url>     # 修改 baseUrl");
  process.exit(1);
}

// ---------- Setup ----------

function getServerScriptPath(): string {
  // 获取 MCP Server 入口文件的绝对路径
  return path.resolve(__dirname, "index.js");
}

/**
 * 通用: 向指定 JSON 配置文件注入 MCP Server 配置
 */
function injectMcpConfig(configPath: string, clientName: string): void {
  const serverPath = getServerScriptPath();

  // 确保目录存在
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 读取或创建配置
  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      config = {};
    }
  }

  // 注入 MCP Server 配置
  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }
  (config.mcpServers as Record<string, unknown>)["glory-product-query"] = {
    command: "node",
    args: [serverPath],
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  console.log("%s 配置已更新: %s", clientName, configPath);
  console.log("\n已注册 MCP Server:");
  console.log("  name: glory-product-query");
  console.log("  command: node %s", serverPath);
  console.log("\n请重启 %s 以生效。", clientName);
}

function setupClaudeDesktop(): void {
  let configPath: string;
  if (process.platform === "darwin") {
    configPath = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  } else if (process.platform === "win32") {
    configPath = path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json"
    );
  } else {
    configPath = path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
  }
  injectMcpConfig(configPath, "Claude Desktop");
}

function setupClaudeCode(): void {
  const mcpFile = path.resolve(process.cwd(), ".mcp.json");
  injectMcpConfig(mcpFile, "Claude Code");
}

function setupQoder(): void {
  // Qoder 使用项目根目录 .mcp.json，与 Claude Code 相同格式
  const mcpFile = path.resolve(process.cwd(), ".mcp.json");
  injectMcpConfig(mcpFile, "Qoder");
}

function setupKiro(): void {
  // Kiro 项目级配置: .kiro/settings/mcp.json
  const mcpFile = path.resolve(process.cwd(), ".kiro", "settings", "mcp.json");
  injectMcpConfig(mcpFile, "Kiro");
}

function setupOpenCode(): void {
  // OpenCode 全局配置: ~/.config/opencode/mcp.json
  const mcpFile = path.join(os.homedir(), ".config", "opencode", "mcp.json");
  injectMcpConfig(mcpFile, "OpenCode");
}

function handleSetup(args: string[]): void {
  const target = args[0]?.toLowerCase();

  switch (target) {
    case "claude-desktop":
      setupClaudeDesktop();
      return;
    case "claude-code":
      setupClaudeCode();
      return;
    case "qoder":
      setupQoder();
      return;
    case "kiro":
      setupKiro();
      return;
    case "opencode":
      setupOpenCode();
      return;
  }

  console.error("用法:");
  console.error("  glory-product-query-mcp setup claude-desktop  # 配置 Claude Desktop");
  console.error("  glory-product-query-mcp setup claude-code     # 配置 Claude Code（当前目录 .mcp.json）");
  console.error("  glory-product-query-mcp setup qoder           # 配置 Qoder（当前目录 .mcp.json）");
  console.error("  glory-product-query-mcp setup kiro            # 配置 Kiro（当前目录 .kiro/settings/mcp.json）");
  console.error("  glory-product-query-mcp setup opencode        # 配置 OpenCode（~/.config/opencode/mcp.json）");
  process.exit(1);
}

// ---------- 主入口 ----------

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log("glory-product-query-mcp - Glory 保险产品查询 MCP Server\n");
    console.log("用法:");
    console.log("  glory-product-query-mcp config [init|set]     # 管理配置");
    console.log("  glory-product-query-mcp setup <target>        # 配置 MCP 客户端");
    console.log("  glory-product-query-mcp serve                 # 启动 MCP Server (STDIO)\n");
    console.log("Setup 目标:");
    console.log("  claude-desktop   配置 Claude Desktop");
    console.log("  claude-code      配置 Claude Code（当前目录 .mcp.json）");
    console.log("  qoder            配置 Qoder（当前目录 .mcp.json）");
    console.log("  kiro             配置 Kiro（当前目录 .kiro/settings/mcp.json）");
    console.log("  opencode         配置 OpenCode（~/.config/opencode/mcp.json）");
    return;
  }

  switch (command) {
    case "config":
      handleConfig(args.slice(1));
      break;
    case "setup":
      handleSetup(args.slice(1));
      break;
    case "serve":
      // 启动 MCP Server（动态导入 index.ts）
      require("./index.js");
      break;
    default:
      console.error("未知命令: %s", command);
      console.error("运行 glory-product-query-mcp --help 查看可用命令");
      process.exit(1);
  }
}

main();
