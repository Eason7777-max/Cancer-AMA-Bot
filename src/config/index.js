// 应用配置文件
export const APP_CONFIG = {
  // 应用信息
  name: "JuChain AI Chat",
  version: "1.0.0",
  description: "基于区块链的AI对话智能体",

  // 合约地址配置 (优先从环境变量读取，默认使用主网)
  contracts: {
    // Ganache 本地网络
    ganache: {
      dialogueExchange: "0x0000000000000000000000000000000000000000", // 需要更新
      chainId: 5777,
      rpcUrl: "http://127.0.0.1:7545",
    },
    // JuChain 测试网
    juchain: {
      dialogueExchange: import.meta.env.VITE_JUCHAIN_TESTNET_CONTRACT_ADDRESS,
      chainId: parseInt(import.meta.env.VITE_JUCHAIN_TESTNET_CHAIN_ID) || 202599,
      rpcUrl: import.meta.env.VITE_JUCHAIN_TESTNET_RPC || "https://testnet-rpc.juchain.org",
    },
    // JuChain 主网 (默认网络)
    juchainMainnet: {
      dialogueExchange: import.meta.env.VITE_JUCHAIN_MAINNET_CONTRACT_ADDRESS,
      chainId: parseInt(import.meta.env.VITE_JUCHAIN_MAINNET_CHAIN_ID) || 210000,
      rpcUrl: import.meta.env.VITE_JUCHAIN_MAINNET_RPC || "https://rpc.juchain.org",
    },
  },

  // 默认网络配置 (设置为主网)
  defaultNetwork: "juchainMainnet",

  // AI服务配置
  ai: {
    // 当前使用固定回复
    fixedResponse: "你的问题很有趣，我的答案是非常好",
    // 未来可配置API端点
    apiUrl: "",
    timeout: 30000,
  },

  // UI配置
  ui: {
    theme: "dark",
    defaultLanguage: "zh-CN",
    messageMaxLength: 1000,
    maxMessagesDisplay: 100,
  },
};

// 开发环境配置
export const DEV_CONFIG = {
  // 是否启用调试模式
  debug: import.meta.env.DEV,
  // 日志级别
  logLevel: "debug",
  // 是否显示测试数据
  showTestData: true,
};

// 获取当前环境的合约地址
export const getContractAddress = (chainId) => {
  switch (chainId) {
    case 5777:
      return APP_CONFIG.contracts.ganache.dialogueExchange;
    case 202599:
      return APP_CONFIG.contracts.juchain.dialogueExchange;
    case 210000:
      return APP_CONFIG.contracts.juchainMainnet.dialogueExchange;
    default:
      throw new Error(`不支持的网络 chainId: ${chainId}`);
  }
};

// 获取网络配置
export const getNetworkConfig = (chainId) => {
  switch (chainId) {
    case 5777:
      return APP_CONFIG.contracts.ganache;
    case 202599:
      return APP_CONFIG.contracts.juchain;
    case 210000:
      return APP_CONFIG.contracts.juchainMainnet;
    default:
      throw new Error(`不支持的网络 chainId: ${chainId}`);
  }
};

// 更新合约地址的辅助函数
export const updateContractAddress = (chainId, address) => {
  switch (chainId) {
    case 5777:
      APP_CONFIG.contracts.ganache.dialogueExchange = address;
      break;
    case 202599:
      APP_CONFIG.contracts.juchain.dialogueExchange = address;
      break;
    case 210000:
      APP_CONFIG.contracts.juchainMainnet.dialogueExchange = address;
      break;
    default:
      throw new Error(`不支持的网络 chainId: ${chainId}`);
  }
};
