---
name: glory-product-query
description: 查询保险产品/销售计划列表，支持按状态、渠道筛选，并对结果进行分析统计。当用户提到查询产品、产品列表、销售计划、wecom计划、产品分析时自动触发。
---

# Glory 产品查询 Skill

通过 MCP 协议查询 Noah 保险产品销售计划列表，支持按条件筛选和数据分析。

## 前置条件

此 skill 依赖 `glory-product-query` MCP Server。安装步骤：

1. 安装: `npm install @gloryfham/glory-product-query-mcp`
2. 初始化配置: `npx glory-product-query-mcp config init`
3. 配置 Claude Code: `npx glory-product-query-mcp setup claude-code`

## 可用 MCP 工具

### queryWecomPlanList

查询企微渠道保险产品销售计划列表。

**调用方式**: 使用 `mcp__glory-product-query__queryWecomPlanList` 工具

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| currentPage | number | 1 | 查询页码 |
| pageSize | number | 1000 | 每页数量 |
| statusCodes | string[] | ["2"] | 销售计划状态码，"2" 表示已上架 |
| channelCodes | string[] | ["WECOM_GLORY"] | 销售渠道码 |
| keyword | string | - | 按关键词搜索产品（搜索所有文本字段） |

**返回**: Markdown 表格格式的产品列表，包含产品名称、状态、渠道等信息。

## 使用示例

当用户请求查询产品时，直接调用 MCP 工具：

1. **查询所有在售产品**: 调用 `queryWecomPlanList`，使用默认参数
2. **搜索特定产品**: 调用 `queryWecomPlanList`，设置 `keyword` 参数
3. **分页查询**: 调用 `queryWecomPlanList`，设置 `currentPage` 和 `pageSize`

## 分析能力

获取到产品数据后，可以进行：

1. **产品统计**: 统计产品总数、各状态分布
2. **关键词搜索**: 按产品名称或其他字段搜索匹配的产品
3. **字段提取**: 从返回结果中提取特定字段用于后续处理
4. **数据对比**: 对比不同渠道或不同状态的产品差异

## 注意事项

- 默认查询已上架状态 (statusCode=2) 的 WECOM_GLORY 渠道产品
- 返回结果最多展示前 20 条记录，超出部分会提示总数
