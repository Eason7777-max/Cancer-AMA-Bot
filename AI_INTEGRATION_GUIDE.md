# Cancer AMA Bot - Coze AI 集成说明

## 功能概述

我已按照您的要求完成了 Coze 对话 API 的集成，实现了以下功能：

### ✅ 已实现功能

1. **对话次数管理**: 用户发送消息前需确认扣除对话次数
2. **Coze API 集成**: 使用真实的 Coze API 进行 AI 对话
3. **流式响应**: 实现打字机效果的实时回复显示
4. **对话历史管理**: 使用 Pinia 缓存对话历史，支持上下文对话
5. **用户身份识别**: 使用钱包地址作为 user_id

## 技术实现详情

### 1. API 配置

- **API 地址**: `https://api.coze.cn/v3/chat`
- **Bot ID**: `7519080978552373263`
- **认证令牌**: `cztei_h0Wfv5hzXNXe8qBTs7ZKquavnKKkZgOIcIJH8pgXrlVzWbGMeBcg2wooqjJbh2i0k`
- **流式响应**: `stream: true`
- **历史保存**: `auto_save_history: true`

### 2. 状态管理 (Pinia)

使用 Pinia store (`src/stores/chat.js`) 管理：

- `additionalMessages`: 对话历史记录
- `conversationId`: 会话 ID
- `isStreaming`: 流式响应状态
- `streamingContent`: 当前流式内容

### 3. 消息格式

```javascript
{
  role: 'user',           // 用户: 'user' | 助手: 'assistant'
  type: 'question',       // 用户: 'question' | 助手: 'answer'
  content_type: 'text',   // 内容类型
  content: '消息内容',
  timestamp: 'ISO时间戳'
}
```

### 4. 事件处理流程

#### 发送消息流程：

1. 用户输入消息 → 验证消息格式
2. 弹出确认对话框 → 用户确认扣除对话次数
3. 添加用户消息到界面和 store
4. 调用 `use-dialogue` 事件扣除次数
5. 发送请求到 Coze API

#### 流式响应处理：

1. `conversation.chat.created` → 开始对话，设置会话 ID
2. `conversation.message.delta` → 逐步显示 AI 回复（打字机效果）
3. `conversation.message.completed` (verbose) → AI 停止输出
4. `conversation.chat.completed` → 显示完成通知
5. `done` → 保存完整对话到历史记录

### 5. 错误处理

- API 请求失败显示错误消息
- 用户取消确认显示"用户未确认对话"
- 流式响应中断自动恢复
- 自动重置 AI 状态

## 用户使用流程

1. **连接钱包**: 用户连接 MetaMask 钱包
2. **兑换对话次数**: 使用 JU/ETH 兑换对话次数
3. **发送消息**:
   - 输入问题
   - 点击发送按钮
   - 确认扣除对话次数
4. **查看回复**: 观看 AI 实时生成回复（打字机效果）
5. **继续对话**: 基于历史上下文继续对话

## 技术特性

### 🔄 状态同步

- 账号切换自动清空对话历史
- 网络切换清空历史并重新初始化
- 钱包断开连接清空所有状态

### 💬 用户体验

- 确认对话框防止误操作
- 流式输出提供实时反馈
- 光标动画增强视觉效果
- 错误提示清晰明确

### 🔐 安全设计

- 用户钱包地址作为身份标识
- 每次对话前确认扣费
- API 令牌安全管理

## 文件结构

```
src/
├── stores/
│   └── chat.js                 # Pinia 状态管理
├── services/
│   └── aiService.js           # Coze API 集成
├── components/
│   ├── ChatBot.vue            # 聊天界面组件
│   ├── DialogueManager.vue    # 对话次数管理
│   └── WalletConnect.vue      # 钱包连接
└── main.js                    # Pinia 注册
```

## 调试信息

应用启动后，打开浏览器开发者工具查看详细日志：

- API 请求和响应
- 流式事件处理
- 状态变化跟踪
- 错误信息详情

## 注意事项

1. **API 令牌**: 当前使用测试令牌，生产环境请替换
2. **错误处理**: 已实现基础错误处理，可根据需要扩展
3. **性能优化**: 大量对话历史可能影响性能，建议设置历史记录上限
4. **网络连接**: 确保网络稳定以获得最佳流式体验

## 测试建议

1. 测试正常对话流程
2. 测试网络切换场景
3. 测试账号切换场景
4. 测试错误处理（网络中断等）
5. 测试长对话上下文维护
