# 月度账本 📒

个人月度资产记账工具，每月末记录银行卡余额、理财、基金和资产负债情况。

## 在线访问

👉 部署后即可通过公网链接访问（需要先部署到 Render）

## 一键部署到 Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Jay-Guanjie/yue-du-zhang-ben)

### 手动部署步骤

1. 打开 [Render Dashboard](https://dashboard.render.com/)
2. 点击 **New +** → **Web Service**
3. 连接 GitHub 仓库 `Jay-Guanjie/yue-du-zhang-ben`
4. 配置：
   - **Name**: `yue-du-zhang-ben`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. 选择 **Free** 计划
6. 点击 **Create Web Service**
7. 等待 2-3 分钟部署完成
8. 访问 `https://yue-du-zhang-ben.onrender.com`

## 本地运行

```bash
cd 月度账本
node server.js
```

然后打开 http://localhost:3456

默认密码：`888888`

## 功能

- ✅ 每月银行卡余额记录（13张卡）
- ✅ 理财产品记录
- ✅ 基金持仓记录
- ✅ 应收账款 / 应付账款
- ✅ 收支记录
- ✅ 数据导入导出备份
- ✅ 密码登录保护

<!-- deploy trigger 2026-07-17 -->
