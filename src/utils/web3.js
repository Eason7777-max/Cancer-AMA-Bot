import { ethers } from "ethers";
import { DIALOGUE_EXCHANGE_ABI } from "@/contracts/abi.js";
import { getContractAddress } from "@/config/index.js";

// 合约配置
export const CONTRACT_CONFIG = {
  // Ganache 本地网络合约地址
  GANACHE_ADDRESS: "0x0000000000000000000000000000000000000000",
  // JuChain 测试网合约地址 (从环境变量读取)
  JUCHAIN_ADDRESS: import.meta.env.VITE_JUCHAIN_TESTNET_CONTRACT_ADDRESS,
  // JuChain 主网合约地址 (从环境变量读取)
  JUCHAIN_MAINNET_ADDRESS: import.meta.env.VITE_JUCHAIN_MAINNET_CONTRACT_ADDRESS,
  // 网络配置
  NETWORKS: {
    GANACHE: {
      chainId: "0x1691", // 5777
      chainName: "Ganache Local",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["http://127.0.0.1:7545"],
      blockExplorerUrls: [""],
    },
    JUCHAIN: {
      chainId: "0x31707", // 202599 (十六进制格式，MetaMask要求)
      chainName: "JuChain Testnet",
      nativeCurrency: {
        name: "JU",
        symbol: "JU",
        decimals: 18,
      },
      rpcUrls: [
        import.meta.env.VITE_JUCHAIN_TESTNET_RPC || "https://testnet-rpc.juchain.org", // 从环境变量读取
        "https://rpc-testnet.juchain.org",
      ],
      blockExplorerUrls: ["https://testnet.juscan.io"],
    },
    JUCHAIN_MAINNET: {
      chainId: "0x33450", // 210000 (十六进制格式，MetaMask要求)
      chainName: "JuChain Mainnet",
      nativeCurrency: {
        name: "JU",
        symbol: "JU",
        decimals: 18,
      },
      rpcUrls: [import.meta.env.VITE_JUCHAIN_MAINNET_RPC || "https://rpc.juchain.org"], // 从环境变量读取
      blockExplorerUrls: ["https://juscan.io"],
    },
  },
};

export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.currentNetwork = null;
  }

  // 检查是否安装了MetaMask
  isMetaMaskInstalled() {
    return typeof window.ethereum !== "undefined";
  }

  // 连接钱包
  async connectWallet() {
    console.log("web3Service: connectWallet 方法被调用");

    if (!this.isMetaMaskInstalled()) {
      console.error("web3Service: MetaMask 未安装");
      throw new Error("请安装MetaMask钱包");
    }

    console.log("web3Service: MetaMask 已检测到");

    try {
      // 请求连接账户
      console.log("web3Service: 请求连接账户...");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("web3Service: 获得账户:", accounts);

      if (accounts.length === 0) {
        console.error("web3Service: 未找到账户");
        throw new Error("未找到可用账户");
      }

      // 初始化provider和signer
      console.log("web3Service: 初始化 provider 和 signer...");
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.currentAccount = accounts[0];

      // 获取当前网络
      console.log("web3Service: 获取当前网络...");
      const network = await this.provider.getNetwork();
      this.currentNetwork = network;

      // 自动切换到JuChain主网
      console.log("web3Service: 检查网络，自动切换到JuChain主网...");
      const currentChainId = Number(this.currentNetwork.chainId);
      if (currentChainId !== 210000) {
        console.log("web3Service: 当前不在JuChain主网，开始切换...");
        try {
          await this.switchToJuChainMainnet();
          // 重新初始化provider和signer以确保同步
          this.provider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await this.provider.getSigner();
          await this.updateCurrentNetwork();
          console.log("web3Service: 成功切换到JuChain主网并重新初始化");
        } catch (error) {
          console.warn("web3Service: 切换到主网失败，但继续连接:", error);
        }
      }

      console.log("web3Service: 连接成功", {
        account: this.currentAccount,
        network: this.currentNetwork,
      });
     
      return {
        account: this.currentAccount,
        network: this.currentNetwork,
      };
    } catch (error) {
      console.error("web3Service: 连接钱包失败:", error);
      throw error;
    }
  }

  // 测试RPC连接
  async testRpcConnection(rpcUrl) {
    try {
      // 使用AbortController实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: Date.now(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC错误: ${data.error.message}`);
      }

      return data.result !== undefined;
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn(`RPC连接超时 ${rpcUrl}`);
      } else {
        console.warn(`RPC测试失败 ${rpcUrl}:`, error.message);
      }
      return false;
    }
  }

  // 切换网络
  async switchNetwork(networkType) {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("请安装MetaMask钱包");
    }

    const networkConfig = CONTRACT_CONFIG.NETWORKS[networkType];

    // 对于JuChain网络，先测试RPC连接
    if (networkType === "JUCHAIN") {
      console.log("正在测试JuChain RPC连接...");
      const rpcTests = await Promise.all(
        networkConfig.rpcUrls.map((url) => this.testRpcConnection(url))
      );

      const workingRpcIndex = rpcTests.findIndex((test) => test === true);

      if (workingRpcIndex === -1) {
        console.warn("所有RPC端点测试失败，尝试使用默认配置");
        // 如果测试失败，仍然尝试添加网络，让用户手动处理连接问题
      } else {
        // 使用第一个可用的RPC
        const workingRpc = networkConfig.rpcUrls[workingRpcIndex];
        console.log(`使用RPC端点: ${workingRpc}`);
        // 更新网络配置，只使用工作的RPC
        networkConfig.rpcUrls = [workingRpc];
      }
    }

    try {
      // 先尝试切换到已存在的网络
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networkConfig.chainId }],
      });

      console.log(
        `成功切换到网络: ${networkConfig.chainName} (${networkConfig.chainId})`
      );
    } catch (switchError) {
      console.log("切换网络失败，尝试添加网络:", switchError);

      // 如果网络未添加，则添加网络
      if (switchError.code === 4902 || switchError.code === -32603) {
        try {
          console.log("正在添加新网络:", networkConfig);
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [networkConfig],
          });
          console.log("网络添加成功");
        } catch (addError) {
          console.error("添加网络失败:", addError);
          throw new Error("添加网络失败: " + addError.message);
        }
      } else {
        console.error("网络切换错误:", switchError);
        throw new Error("切换网络失败: " + switchError.message);
      }
    }
  }

  // 获取合约实例
  getContract() {
    if (!this.signer) {
      throw new Error("请先连接钱包");
    }

    const chainId = Number(this.currentNetwork?.chainId);
    const contractAddress = getContractAddress(chainId);

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("合约地址未配置，请先部署合约并更新配置");
    }

    this.contract = new ethers.Contract(
      contractAddress,
      DIALOGUE_EXCHANGE_ABI,
      this.signer
    );

    return this.contract;
  }

  // 获取账户余额
  async getBalance(address = null) {
    if (!this.provider) {
      throw new Error("请先连接钱包");
    }

    try {
      // 确保网络信息是最新的
      await this.updateCurrentNetwork();
      
      const targetAddress = address || this.currentAccount;
      const balance = await this.provider.getBalance(targetAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("获取余额失败:", error);
      throw error;
    }
  }

  // 格式化ETH金额
  formatEther(wei) {
    return ethers.formatEther(wei);
  }

  // 解析ETH金额为wei
  parseEther(ether) {
    return ethers.parseEther(ether.toString());
  }

  // 更新当前账号和signer
  async updateCurrentAccount(newAccount) {
    if (!this.provider) {
      throw new Error("请先连接钱包");
    }

    console.log(
      "web3Service: 更新当前账号从",
      this.currentAccount,
      "到",
      newAccount
    );
    this.currentAccount = newAccount;

    // 重新获取signer以确保使用正确的账号
    this.signer = await this.provider.getSigner();
    console.log("web3Service: Signer 已更新");
  }

  // 更新当前网络
  async updateCurrentNetwork() {
    if (!this.provider) {
      throw new Error("请先连接钱包");
    }

    console.log("web3Service: 更新当前网络信息");
    const network = await this.provider.getNetwork();
    this.currentNetwork = network;
    console.log("web3Service: 网络已更新到", network);
  }

  // 监听账户变化
  onAccountsChanged(callback) {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", callback);
    }
  }

  // 监听网络变化
  onChainChanged(callback) {
    if (window.ethereum) {
      window.ethereum.on("chainChanged", callback);
    }
  }

  // 移除监听器
  removeAllListeners() {
    if (window.ethereum) {
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
    }
  }

  // 验证Chain ID格式
  validateChainId(chainId) {
    // JuChain的Chain ID: 210000 (十进制) = 0x33450 (十六进制)
    const expectedDecimal = 210000;
    const expectedHex = "0x33450";

    if (typeof chainId === "string") {
      return chainId.toLowerCase() === expectedHex.toLowerCase();
    } else if (typeof chainId === "number") {
      return chainId === expectedDecimal;
    }

    return false;
  }

  // 手动添加JuChain网络的方法
  async addJuChainManually() {
    const juchainConfig = CONTRACT_CONFIG.NETWORKS.JUCHAIN;

    try {
      console.log("正在手动添加JuChain网络配置:", juchainConfig);
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [juchainConfig],
      });

      // 验证添加是否成功
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      console.log("当前Chain ID:", currentChainId);

      return true;
    } catch (error) {
      console.error("手动添加JuChain网络失败:", error);
      throw error;
    }
  }

  // 切换到JuChain主网
  async switchToJuChainMainnet() {
    console.log("正在切换到JuChain主网...");
    try {
      await this.switchNetwork("JUCHAIN_MAINNET");
      
      // 等待网络切换完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新初始化provider和signer以避免网络不一致
      if (this.provider) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
      }
      
      // 更新当前网络信息
      await this.updateCurrentNetwork();
      console.log("成功切换到JuChain主网");
      return true;
    } catch (error) {
      console.error("切换到JuChain主网失败:", error);
      throw new Error("切换到JuChain主网失败: " + error.message);
    }
  }

  // 切换到JuChain测试网
  async switchToJuChainTestnet() {
    console.log("正在切换到JuChain测试网...");
    try {
      await this.switchNetwork("JUCHAIN");
      // 更新当前网络信息
      await this.updateCurrentNetwork();
      console.log("成功切换到JuChain测试网");
      return true;
    } catch (error) {
      console.error("切换到JuChain测试网失败:", error);
      throw new Error("切换到JuChain测试网失败: " + error.message);
    }
  }

  // 手动添加JuChain主网
  async addJuChainMainnetManually() {
    const juchainMainnetConfig = CONTRACT_CONFIG.NETWORKS.JUCHAIN_MAINNET;

    try {
      console.log("正在手动添加JuChain主网配置:", juchainMainnetConfig);
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [juchainMainnetConfig],
      });

      // 验证添加是否成功
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      console.log("当前Chain ID:", currentChainId);

      return true;
    } catch (error) {
      console.error("手动添加JuChain主网失败:", error);
      throw error;
    }
  }

  // 获取当前连接的网络类型
  getCurrentNetworkType() {
    if (!this.currentNetwork) {
      return null;
    }

    const chainId = Number(this.currentNetwork.chainId);
    switch (chainId) {
      case 5777:
        return "GANACHE";
      case 202599:
        return "JUCHAIN_TESTNET";
      case 210000:
        return "JUCHAIN_MAINNET";
      default:
        return "UNKNOWN";
    }
  }

  // 检查是否已连接到JuChain主网
  isConnectedToJuChainMainnet() {
    return this.getCurrentNetworkType() === "JUCHAIN_MAINNET";
  }

  // 检查是否已连接到JuChain测试网
  isConnectedToJuChainTestnet() {
    return this.getCurrentNetworkType() === "JUCHAIN_TESTNET";
  }
}

// 创建全局实例
export const web3Service = new Web3Service();

// 导出常用方法
export { ethers };
