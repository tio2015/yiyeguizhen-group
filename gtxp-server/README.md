# 高铁潜爆品雷达自动工作服务

这个服务负责让 `/gtxp` 从静态工作台升级为长期运行的数据平台。

## 能力

- 文件数据库：候选品、证据、供应商、SOP、任务、运行日志。
- API：供前端读取、录入、生成任务、触发任务、导入导出。
- 自动任务：按 SOP 生成开放式搜索任务。
- 浏览器采集：用 Playwright 打开小红书/1688/网页搜索，保存标题、可见文本和截图。
- AI 分析：有 API key 时调用模型归类评分；没有 key 时用规则兜底。

## 本地运行

```bash
cd gtxp-server
npm install
npm run seed
npm run dev
```

首次使用小红书采集前，需要登录一次：

```bash
npm run login-xhs
```

这个命令会打开一个可视浏览器。扫码登录小红书后回到终端按回车，登录态会保存在 `data/browser-profile`，后续自动任务复用该登录态。

健康检查：

```bash
curl http://127.0.0.1:8787/api/health
```

生成任务：

```bash
curl -X POST http://127.0.0.1:8787/api/tasks/generate
```

运行一个任务：

```bash
curl -X POST http://127.0.0.1:8787/api/tasks/run-next
```

## 后续部署

线上静态页可以通过反向代理把 `/gtxp-api/*` 转发到这个服务。前端会优先尝试：

1. 本地保存的 API 地址；
2. 同域 `/gtxp-api`；
3. 本机 `http://127.0.0.1:8787`。
