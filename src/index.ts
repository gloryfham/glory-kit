#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------- 配置加载 ----------

interface GloryConfig {
  baseUrl: string;
}

const CONFIG_FILE = path.join(os.homedir(), ".glory", "config.json");
const DEFAULT_BASE_URL = "https://hkapi.noahgroup.com/api/insurance";

function loadConfig(): GloryConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {
    // 配置文件损坏，使用默认值
  }
  return { baseUrl: DEFAULT_BASE_URL };
}

const config = loadConfig();

// API 配置
const API_URL = `${config.baseUrl}/osins/v1/salesPlan/wecomPlanList`;
const REQUEST_TIMEOUT = 30000;

// ---------- API 调用 ----------

interface ApiPayload {
  salesPlanStatusCodes: string[];
  salesPlanChannelCodes: string[];
  currentPage: number;
  pageSize: number;
}

async function queryProducts(payload: ApiPayload): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 响应解析 ----------

/**
 * 从 API 响应中提取记录列表，兼容多种返回结构
 */
function extractRecords(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response;
  if (typeof response !== "object" || response === null) return [];

  const obj = response as Record<string, unknown>;

  // 尝试多种可能的数据路径
  const data = obj["response"] ?? obj["data"] ?? obj["result"] ?? obj;

  if (Array.isArray(data)) return data;
  if (typeof data !== "object" || data === null) return [];

  const inner = data as Record<string, unknown>;
  for (const key of ["r", "records", "list", "items", "rows", "content"]) {
    const val = inner[key];
    if (Array.isArray(val)) return val;
  }

  return Object.keys(inner).length > 0 ? [inner] : [];
}

/**
 * 按关键词全文搜索记录
 */
function filterByKeyword(
  records: Record<string, unknown>[],
  keyword: string
): Record<string, unknown>[] {
  const kw = keyword.toLowerCase();
  return records.filter((r) =>
    Object.values(r).some(
      (v) => typeof v === "string" && v.toLowerCase().includes(kw)
    )
  );
}

// ---------- 响应格式化 ----------

/**
 * 将记录列表格式化为 Markdown 表格
 */
function formatAsMarkdownTable(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "未查询到在售产品数据。";

  const sb: string[] = [];
  sb.push(`查询到 ${records.length} 款在售产品：\n`);

  // 动态提取字段名（取第一条记录）
  const allFields = Object.keys(records[0]);
  const maxFields = 8;
  const displayFields = allFields.slice(0, maxFields);

  // 表头
  sb.push("| " + displayFields.join(" | ") + " |");
  sb.push("|" + displayFields.map(() => "------").join("|") + "|");

  // 数据行（限制展示前 20 条）
  const displayCount = Math.min(records.length, 20);
  for (let i = 0; i < displayCount; i++) {
    const row = displayFields.map((field) => {
      const val = records[i][field];
      let text = val != null ? String(val) : "-";
      // 截断超长文本
      if (text.length > 30) {
        text = text.substring(0, 27) + "...";
      }
      return text;
    });
    sb.push("| " + row.join(" | ") + " |");
  }

  if (records.length > displayCount) {
    sb.push(`\n... 还有 ${records.length - displayCount} 款产品未展示`);
  }

  sb.push(`\n共 ${records.length} 款产品。`);

  if (allFields.length > maxFields) {
    sb.push(
      `\n(仅展示前 ${maxFields} 个字段，全部字段: ${allFields.join(", ")})`
    );
  }

  return sb.join("\n");
}

// ---------- MCP Server ----------

const server = new McpServer({
  name: "glory-product-query",
  version: "1.0.0",
});

server.tool(
  "queryWecomPlanList",
  "查询企微渠道保险产品销售计划列表，获取在售产品信息，包括产品名称、销售计划状态、渠道等。支持分页查询和关键词搜索。",
  {
    currentPage: z
      .number()
      .optional()
      .default(1)
      .describe("查询页码，默认为1"),
    pageSize: z
      .number()
      .optional()
      .default(1000)
      .describe("每页数量，默认为1000"),
    statusCodes: z
      .array(z.string())
      .optional()
      .default(["2"])
      .describe('销售计划状态码列表，默认 ["2"]（已上架）'),
    channelCodes: z
      .array(z.string())
      .optional()
      .default(["WECOM_GLORY"])
      .describe('销售渠道码列表，默认 ["WECOM_GLORY"]'),
    keyword: z
      .string()
      .optional()
      .describe("按关键词搜索产品（搜索所有文本字段）"),
  },
  async ({ currentPage, pageSize, statusCodes, channelCodes, keyword }) => {
    try {
      const payload: ApiPayload = {
        salesPlanStatusCodes: statusCodes,
        salesPlanChannelCodes: channelCodes,
        currentPage,
        pageSize,
      };

      const response = await queryProducts(payload);
      let records = extractRecords(response);

      // 关键词过滤
      if (keyword) {
        records = filterByKeyword(records, keyword);
      }

      const text = formatAsMarkdownTable(records);

      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "未知错误";
      return {
        content: [
          { type: "text" as const, text: `查询产品列表失败: ${message}` },
        ],
        isError: true,
      };
    }
  }
);

// 启动 STDIO 传输
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP Server 启动失败: ${err}\n`);
  process.exit(1);
});
