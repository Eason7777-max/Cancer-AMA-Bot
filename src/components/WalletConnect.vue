<template>
  <div class="wallet-connect">
    <!-- 未连接状态 -->
    <div v-if="!isConnected" class="connect-section">
      <el-button 
        type="primary" 
        size="large" 
        @click="connectWallet"
        :loading="connecting"
        class="connect-btn glow"
      >
        <el-icon><Wallet /></el-icon>
        连接钱包
      </el-button>
      
      <el-alert
        v-if="!hasMetaMask"
        title="请安装MetaMask钱包"
        type="warning"
        :closable="false"
        class="mt-4"
      >
        <template #default>
          <p>请安装 <a href="https://metamask.io" target="_blank">MetaMask</a> 钱包以使用此应用</p>
        </template>
      </el-alert>
    </div>

    <!-- 已连接状态 -->
    <div v-else class="connected-section">
      <el-card class="wallet-info">
        <template #header>
          <div class="wallet-header">
            <el-icon><Wallet /></el-icon>
            <span>钱包信息</span>
            <el-button 
              type="danger" 
              size="small" 
              @click="disconnect"
              plain
            >
              断开连接
            </el-button>
          </div>
        </template>

        <!-- 账户地址 -->
        <div class="info-item">
          <el-text class="label">账户地址:</el-text>
          <el-text class="value" @click="copyAddress">
            {{ formatAddress(account) }}
            <el-icon><DocumentCopy /></el-icon>
          </el-text>
        </div>

        <!-- 网络信息 -->
        <div class="info-item">
          <el-text class="label">当前网络:</el-text>
          <el-tag :type="getNetworkType()" class="network-tag">
            {{ getNetworkName() }}
          </el-tag>
        </div>

        <!-- 余额信息 -->
        <div class="info-item">
          <el-text class="label">余额:</el-text>
          <el-text class="value balance">
            {{ formatBalance(balance) }} {{ getCurrencySymbol }}
            <el-button 
              size="small" 
              @click="refreshBalance"
              :loading="refreshing"
              text
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-text>
        </div>


      </el-card>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      @close="error = ''"
      class="mt-4"
    />


  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Wallet, DocumentCopy, Refresh } from '@element-plus/icons-vue'
import { web3Service } from '@/utils/web3.js'

// Emits
const emit = defineEmits(['balance-updated', 'wallet-connected', 'account-changed', 'chain-changed'])

// 响应式数据
const isConnected = ref(false)
const account = ref('')
const balance = ref('0')
const currentChainId = ref(null)
const connecting = ref(false)
const refreshing = ref(false)
const error = ref('')
const hasMetaMask = ref(false)

// 计算属性
const formatAddress = computed(() => (addr) => {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
})

const formatBalance = computed(() => (bal) => {
  return parseFloat(bal).toFixed(4)
})

// 方法
const checkMetaMask = () => {
  hasMetaMask.value = web3Service.isMetaMaskInstalled()
}

const connectWallet = async () => {
  console.log('WalletConnect: connectWallet 方法被调用')
  
  connecting.value = true
  error.value = ''
  
  try {
    console.log('WalletConnect: 调用 web3Service.connectWallet()')
    const result = await web3Service.connectWallet()
    
    console.log('WalletConnect: 连接结果:', result)
    account.value = result.account
    currentChainId.value = Number(result.network.chainId)
    isConnected.value = true
    
    console.log('WalletConnect: 开始刷新余额')
    await refreshBalance()
    
    console.log('WalletConnect: 连接成功，发出 wallet-connected 事件')
    // 发出钱包连接成功事件，通知其他组件刷新数据
    emit('wallet-connected', {
      account: account.value,
      chainId: currentChainId.value,
      balance: balance.value
    })
    
    ElMessage.success('钱包连接成功!')
  } catch (err) {
    console.error('WalletConnect: 连接失败:', err)
    error.value = err.message
    ElMessage.error('连接钱包失败: ' + err.message)
  } finally {
    connecting.value = false
  }
}

const disconnect = () => {
  console.log('WalletConnect: 断开钱包连接')
  const oldAccount = account.value
  
  isConnected.value = false
  account.value = ''
  balance.value = '0'
  currentChainId.value = null
  web3Service.removeAllListeners()
  
  // 发出账号变化事件（变为空）
  emit('account-changed', {
    oldAccount,
    newAccount: '',
    chainId: null
  })
  
  ElMessage.info('钱包已断开连接')
}

const refreshBalance = async () => {
  if (!isConnected.value) return
  
  refreshing.value = true
  try {
    console.log('WalletConnect: 开始刷新余额，当前账号:', account.value)
    console.log('WalletConnect: 当前网络ID:', currentChainId.value)
    
    const bal = await web3Service.getBalance()
    balance.value = bal
    console.log('WalletConnect: 余额刷新成功:', bal)
    emit('balance-updated')
  } catch (err) {
    console.error('刷新余额失败:', err)
    
    // 如果是网络错误，尝试重新同步网络
    if (err.message && err.message.includes('network changed')) {
      console.log('WalletConnect: 检测到网络变化错误，重试获取余额...')
      try {
        // 等待网络同步
        await new Promise(resolve => setTimeout(resolve, 2000));
        await web3Service.updateCurrentNetwork()
        const retryBal = await web3Service.getBalance()
        balance.value = retryBal
        console.log('WalletConnect: 重试余额获取成功:', retryBal)
        emit('balance-updated')
        return
      } catch (retryErr) {
        console.error('WalletConnect: 重试余额获取也失败:', retryErr)
      }
    }
    
    ElMessage.error('刷新余额失败: ' + (err.message || '未知错误'))
  } finally {
    refreshing.value = false
  }
}



const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(account.value)
    ElMessage.success('地址已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
  }
}

const getNetworkName = () => {
  switch (currentChainId.value) {
    case 5777:
      return 'Ganache Local'
    case 202599:
      return 'JuChain Testnet'
    case 210000:
      return 'JuChain Mainnet'
    default:
      return 'JuChain Mainnet' // 默认显示主网
  }
}

const getNetworkType = () => {
  switch (currentChainId.value) {
    case 5777:
    case 202599:
    case 210000:
      return 'success'
    default:
      return 'success' // 默认显示成功状态（主网）
  }
}

const getCurrencySymbol = computed(() => {
  switch (currentChainId.value) {
    case 5777:
      return 'ETH'
    case 202599:
      return 'JU'
    case 210000:
      return 'JU'
    default:
      return 'JU' // 默认使用JU（主网货币）
  }
})

// 监听器
const setupListeners = () => {
  web3Service.onAccountsChanged(async (accounts) => {
    console.log('WalletConnect: 检测到账号切换', accounts)
    if (accounts.length === 0) {
      disconnect()
    } else {
      const oldAccount = account.value
      account.value = accounts[0]
      console.log('WalletConnect: 账号从', oldAccount, '切换到', accounts[0])
      
      // 更新web3Service中的当前账号
      try {
        await web3Service.updateCurrentAccount(accounts[0])
      } catch (error) {
        console.error('WalletConnect: 更新web3Service账号失败:', error)
      }
      
      // 刷新余额
      refreshBalance()
      
      // 发出账号切换事件
      emit('account-changed', {
        oldAccount,
        newAccount: accounts[0],
        chainId: currentChainId.value
      })
      
      ElMessage.info(`账号已切换到: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`)
    }
  })

  web3Service.onChainChanged(async (chainId) => {
    console.log('WalletConnect: 检测到网络切换', chainId)
    const oldChainId = currentChainId.value
    currentChainId.value = parseInt(chainId, 16)
    console.log('WalletConnect: 网络从', oldChainId, '切换到', currentChainId.value)
    
    try {
      // 等待一下确保网络切换完成
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 更新web3Service中的网络信息
      await web3Service.updateCurrentNetwork()
      
      // 延迟刷新余额，确保网络完全同步
      setTimeout(() => {
        refreshBalance()
      }, 500)
      
      console.log('WalletConnect: 网络切换处理完成')
    } catch (error) {
      console.error('WalletConnect: 网络切换处理失败:', error)
    }
    
    // 发出网络切换事件
    emit('chain-changed', {
      oldChainId,
      newChainId: currentChainId.value
    })
    
    ElMessage.info(`网络已切换到: ${getNetworkName()}`)
  })
}

// 生命周期
onMounted(() => {
  checkMetaMask()
  setupListeners()
})

onUnmounted(() => {
  web3Service.removeAllListeners()
})

// 暴露给父组件的数据和方法
defineExpose({
  isConnected,
  account,
  balance,
  currentChainId,
  connectWallet,
  refreshBalance
})
</script>

<style scoped>
.wallet-connect {
  width: 100%;
  box-sizing: border-box;
}

.connect-section {
  text-align: center;
  padding: 2rem;
}

.connect-btn {
  font-size: 1.2rem;
  padding: 1.2rem 2.5rem;
  border-radius: 12px;
  font-weight: 600;
}

.connected-section {
  width: 100%;
  box-sizing: border-box;
}

.wallet-info {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  width: 100%;
  box-sizing: border-box;
}

.wallet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.wallet-header span {
  flex: 1;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 1rem;
}

.value {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.value:hover {
  color: var(--primary-color);
}

.balance {
  color: var(--primary-color);
  font-size: 1.2rem;
  font-weight: 700;
}

.network-tag {
  font-weight: 600;
}

.mt-4 {
  margin-top: 1rem;
}

a {
  color: var(--primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style> 