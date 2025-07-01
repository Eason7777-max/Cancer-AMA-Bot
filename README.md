# JuChain AI Chat - 区块链 AI 对话智能体

基于区块链技术的 AI 对话智能体平台，支持使用 JUC/ETH 兑换对话次数与 AI 进行智能对话。

## 🚀 功能特性

- 🔗 **区块链钱包连接** - 支持 MetaMask 钱包连接
- 💰 **多网络支持** - 支持 JuChain 测试网和 主网
- 🔄 **对话次数兑换** - 使用 JUC/ETH 按固定比率兑换对话次数 (0.01 JUC/ETH = 5 次对话)
- 🤖 **AI 智能对话** - 与 AI 进行自然语言对话
- 📊 **使用统计** - 查看余额、对话次数、兑换记录等
- 🎨 **现代化 UI** - 基于 Element Plus 的科技感界面设计

## 🛠️ 技术栈

- **前端框架**: Vue 3 + Composition API
- **UI 组件库**: Element Plus
- **区块链交互**: ethers.js
- **样式**: CSS3 + CSS Variables
- **构建工具**: Vite
- **智能合约**: Solidity (DialogueExchange.sol)

## 📋 前置条件

1. **Node.js** >= 18.0.0
2. **MetaMask** 浏览器扩展
3. **区块链网络**:
   - JuChain 测试网账户 (推荐)
   - 或 Ganache 本地网络

## 🔧 安装与运行

### 1. 克隆项目

```bash
git clone <repository-url>
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置合约地址

在 `src/config/index.js` 中更新合约地址：

```javascript
export const APP_CONFIG = {
  contracts: {
    ganache: {
      dialogueExchange: "0x你的Ganache合约地址", // 更新这里
      chainId: 5777,
      rpcUrl: "http://127.0.0.1:7545",
    },
    juchain: {
      dialogueExchange: "0x你的JuChain合约地址", // 更新这里
      chainId: 202599,
      rpcUrl: "https://testnet-rpc.juchain.org",
    },
  },
};
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

## 🔗 智能合约部署

### Ganache 本地网络部署

```bash
cd ../juchain-cancerdao-truffle
npm run migrate -- --network ganache
```

### JuChain 测试网部署

```bash
cd ../juchain-cancerdao-truffle
npm run migrate -- --network juchain_testnet
```

部署完成后，请将合约地址复制到前端配置文件中。

## 💡 使用指南

### 1. 连接钱包

- 点击"连接钱包"按钮
- 在 MetaMask 中确认连接
- 选择或切换到支持的网络 (JuChain/Ganache)

### 2. 兑换对话次数

- 在左侧面板查看当前余额
- 输入要兑换的金额
- 点击"立即兑换"并在 MetaMask 中确认交易
- 等待交易确认完成

### 3. 开始 AI 对话

- 在右侧对话框输入问题
- 点击"发送"按钮
- AI 将自动回复 (目前返回固定内容)
- 每次对话会消耗 1 次对话次数

### 4. 查看统计

- 左侧面板显示剩余对话次数
- 查看总兑换金额等统计信息

## 📁 项目结构

```
src/
├── components/           # Vue组件
│   ├── WalletConnect.vue    # 钱包连接组件
│   ├── DialogueManager.vue # 对话次数管理组件
│   └── ChatBot.vue         # AI对话组件
├── contracts/           # 智能合约相关
│   └── abi.js              # 合约ABI定义
├── services/            # 服务层
│   └── aiService.js        # AI服务
├── utils/               # 工具函数
│   └── web3.js             # Web3工具类
├── config/              # 配置文件
│   └── index.js            # 应用配置
├── App.vue              # 主应用组件
├── main.js              # 应用入口
└── style.css            # 全局样式
```

## 🔮 AI 集成说明

当前版本使用固定回复进行演示。要集成真实的 AI 服务：

1. 修改 `src/services/aiService.js` 中的 `sendMessage` 方法
2. 配置 AI API 端点和认证信息
3. 处理 AI 响应格式化

示例：

```javascript
async sendMessage(message, conversationId = null) {
  const response = await fetch('your-ai-api-endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-api-key'
    },
    body: JSON.stringify({
      message,
      conversationId
    })
  });

  const data = await response.json();
  return {
    id: Date.now(),
    message: data.response,
    timestamp: new Date(),
    conversationId: data.conversationId
  };
}
```

## 🔧 开发配置

### 环境变量

创建 `.env` 文件：

```bash
VITE_APP_NAME=JuChain AI Chat
VITE_APP_VERSION=1.0.0
VITE_DEBUG=true
```

### 代码规范

项目使用 ESLint 和 Prettier 进行代码格式化：

```bash
npm run lint        # 检查代码规范
npm run lint:fix    # 自动修复代码格式
```

## 🌐 网络配置

### JuChain 测试网

- 网络名称: JuChain Testnet
- RPC URL: https://testnet-rpc.juchain.org
- 链 ID: 202599
- 货币符号: JUC
- 区块浏览器: https://testnet-explorer.juchain.org

### Ganache 本地网络

- 网络名称: Ganache Local
- RPC URL: http://127.0.0.1:7545
- 链 ID: 5777
- 货币符号: ETH

## 🚨 注意事项

1. **合约地址配置**: 首次使用前必须部署智能合约并更新配置文件中的合约地址
2. **网络切换**: 使用前请确保 MetaMask 连接到正确的网络
3. **Gas 费用**: 交易需要支付一定的 Gas 费用，请确保账户有足够余额
4. **测试环境**: 当前为测试版本，请勿使用真实资产进行大额交易

## 🛠️ 故障排除

### 常见问题

**Q: 连接钱包失败**
A: 检查是否安装了 MetaMask，并确保在支持的浏览器中使用

**Q: 合约地址未配置错误**
A: 检查 `src/config/index.js` 中的合约地址是否正确配置

**Q: 交易失败**
A: 检查账户余额是否足够支付 Gas 费用和兑换金额

**Q: 网络连接错误**
A: 确认 MetaMask 连接到正确的网络，检查网络配置

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

---

**Powered by JuChain • 基于区块链的 AI 对话智能体**
>>>>>>> master
