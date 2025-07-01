# 环境变量配置说明

## 概述
项目使用环境变量来管理敏感配置信息，如 Coze API 认证信息。

## 配置步骤

### 1. 复制环境变量模板
```bash
cp .env.example .env
```

### 2. 编辑 .env 文件
在 `.env` 文件中设置以下变量：

```env
# Coze API 配置
VITE_COZE_API_URL=https://api.coze.cn/v3/chat
VITE_COZE_AUTH_TOKEN=你的_coze_认证_token
VITE_COZE_BOT_ID=你的_bot_id
```

### 3. 获取 Coze 配置信息
- **VITE_COZE_AUTH_TOKEN**: 从 Coze 平台获取的 Personal Access Token
- **VITE_COZE_BOT_ID**: 您创建的 Bot 的唯一标识符

## 重要提醒

⚠️ **安全注意事项**
- `.env` 文件已添加到 `.gitignore`，不会被提交到代码仓库
- 请勿将真实的认证 token 分享给他人
- 生产环境请使用不同的 token

## 验证配置
启动开发服务器时，如果环境变量配置不正确，应用会抛出错误提示。

```bash
npm run dev
```

如果看到类似错误，请检查环境变量配置：
```
Error: VITE_COZE_AUTH_TOKEN 环境变量未设置
``` 