# 公开站点批量下载头像

本项目可以直接部署到 GitHub Pages。静态托管足够支持表格解析、筛选、分析、XLSX 导出和头像预览。

批量头像 ZIP 下载有一个额外限制：浏览器 JavaScript 只有在图片源允许 CORS 时，才能读取图片二进制内容。图片能在 `<img>` 标签里正常显示，并不代表 `fetch()` 可以把图片读出来打包。要让公开网页的访问者也能批量下载头像，可以使用下面两种方案之一。

## 方案 A：配置图片桶 CORS

如果你可以管理头像图片所在的 OSS 或 CDN，优先用这个方案。

允许：

- Origin：你的 GitHub Pages 域名，例如 `https://your-name.github.io`
- Method：`GET`
- Headers：`*`

配置完成后，网页里的“头像下载代理”可以留空。浏览器会直接请求头像 URL 并在本地生成 ZIP。

## 方案 B：部署 Cloudflare Worker 图片代理

如果你不能修改图片桶的 CORS 规则，用这个方案。

`workers/avatar-proxy.js` 会从白名单图片域名拉取头像，并给响应补上浏览器可读取的 CORS 头。它默认只允许 `ttq-pub.oss-cn-beijing.aliyuncs.com`，避免变成公开通用代理。

### 免费版配置

仓库已经包含 `wrangler.toml`，按 Cloudflare Workers 免费版即可部署，不需要开付费计划。

默认配置：

- Worker 名称：`top-roles-avatar-proxy`
- 允许访问的图片域名：`ttq-pub.oss-cn-beijing.aliyuncs.com`
- 允许调用代理的网页域名：`https://wu-nai-a.github.io`
- 单张图片大小上限：`20971520` 字节，也就是 20MB

### 命令行部署

1. 安装或临时使用 Wrangler：

   ```bash
   npm create cloudflare@latest
   ```

   或者在本仓库目录直接使用：

   ```bash
   npx wrangler deploy
   ```

2. 按提示登录 Cloudflare。
3. 部署成功后复制 Worker URL，例如：

   ```text
   https://top-roles-avatar-proxy.<你的账号>.workers.dev
   ```

4. 打开 Top 角色数据工具，在“头像下载代理”里粘贴 Worker URL。
5. 筛选角色并加入角色清单，点击“下载清单头像ZIP”。

### 控制台手动部署

也可以不用命令行：

1. 在 Cloudflare 控制台创建 Worker。
2. 将 `workers/avatar-proxy.js` 的内容粘贴到 Worker。
3. 设置环境变量：

   - `ALLOWED_IMAGE_HOSTS`：`ttq-pub.oss-cn-beijing.aliyuncs.com`
   - `ALLOWED_ORIGINS`：`https://wu-nai-a.github.io`
   - `MAX_BYTES`：可选，默认 `20971520`

4. 部署 Worker，并复制它的 URL，例如：

   ```text
   https://avatar-proxy.your-name.workers.dev
   ```

5. 打开 Top 角色数据工具，在“头像下载代理”里粘贴 Worker URL。
6. 筛选角色并加入角色清单，点击“下载清单头像ZIP”。

如果只是快速公开演示，可以把 `ALLOWED_ORIGINS` 设置为 `*`。正式分享时建议限制为你的 GitHub Pages 域名。

## GitHub Pages 部署

1. 将仓库推送到 GitHub。
2. 打开仓库 Settings → Pages。
3. Source 选择 **Deploy from a branch**。
4. Branch 选择 `main`，目录选择 `/ (root)`。
5. 保存后等待几分钟。

站点会从仓库根目录发布静态文件。
