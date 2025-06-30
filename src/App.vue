<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { 
  Cpu, 
  Wallet, 
  Connection, 
  CreditCard, 
  ChatDotRound, 
  InfoFilled 
} from '@element-plus/icons-vue'
import WalletConnect from './components/WalletConnect.vue'
import DialogueManager from './components/DialogueManager.vue'
import ChatBot from './components/ChatBot.vue'

// 组件引用
const walletRef = ref(null)
const dialogueRef = ref(null)
const chatRef = ref(null)

// 响应式数据
const globalLoading = ref(false)
const loadingText = ref('')
const aboutVisible = ref(false)

// 方法
const connectWallet = async () => {
  console.log('App.vue: connectWallet 被调用')
  
  if (!walletRef.value) {
    console.error('App.vue: walletRef.value 为空')
    ElMessage.error('钱包组件未初始化')
    return
  }
  
  console.log('App.vue: 调用 walletRef.value.connectWallet()')
  
  try {
    await walletRef.value.connectWallet()
    console.log('App.vue: 钱包连接完成')
  } catch (error) {
    console.error('App.vue: 钱包连接失败:', error)
    ElMessage.error('钱包连接失败: ' + error.message)
  }
}

let isUpdating = false
const handleBalanceUpdated = async () => {
  if (isUpdating) return
  isUpdating = true
  
  try {
    if (walletRef.value) {
      await walletRef.value.refreshBalance()
    }
    
    if (dialogueRef.value) {
      await dialogueRef.value.refreshDialogues()
    }
  } finally {
    isUpdating = false
  }
}

const handleWalletConnected = async (walletInfo) => {
  console.log('App.vue: 接收到钱包连接事件', walletInfo)
  
  // 等待一小段时间确保组件完全初始化
  await nextTick()
  
  try {
    console.log('App.vue: 开始刷新对话次数数据')
    if (dialogueRef.value) {
      await dialogueRef.value.refreshDialogues()
      console.log('App.vue: 对话次数数据刷新完成')
    }
  } catch (error) {
    console.error('App.vue: 刷新对话次数数据失败:', error)
  }
}

const handleAccountChanged = async (accountInfo) => {
  console.log('App.vue: 接收到账号切换事件', accountInfo)
  
  // 如果新账号为空，说明是断开连接，不需要刷新数据
  if (!accountInfo.newAccount) {
    console.log('App.vue: 账号为空，跳过数据刷新')
    // 但仍需要清空对话历史
    if (chatRef.value) {
      console.log('App.vue: 清空AI对话历史')
      chatRef.value.clearMessages()
    }
    return
  }
  
  try {
    // 清空之前账号的AI对话历史
    if (chatRef.value) {
      console.log('App.vue: 清空前一个账号的AI对话历史')
      chatRef.value.clearMessages()
    }
    
    // 刷新钱包余额
    if (walletRef.value) {
      console.log('App.vue: 刷新钱包余额')
      await walletRef.value.refreshBalance()
    }
    
    // 刷新对话次数数据 - 新账号可能有不同的对话次数
    if (dialogueRef.value) {
      console.log('App.vue: 刷新新账号的对话次数数据')
      await dialogueRef.value.refreshDialogues()
    }
    
    console.log('App.vue: 账号切换后数据刷新完成')
    
    // 显示账号切换提示
    ElNotification({
      title: '账号已切换',
      message: `已切换到新账号，对话历史已清空。账号: ${accountInfo.newAccount.slice(0, 6)}...${accountInfo.newAccount.slice(-4)}`,
      type: 'success',
      duration: 3000
    })
    
  } catch (error) {
    console.error('App.vue: 账号切换后数据刷新失败:', error)
  }
}

const handleChainChanged = async (chainInfo) => {
  console.log('App.vue: 接收到网络切换事件', chainInfo)
  
  try {
    // 清空对话历史 - 不同网络可能有不同的AI服务
    if (chatRef.value) {
      console.log('App.vue: 清空网络切换前的AI对话历史')
      chatRef.value.clearMessages()
    }
    
    // 等待网络切换完全完成
    console.log('App.vue: 等待网络切换完成...')
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 刷新钱包余额 - 不同网络余额可能不同  
    if (walletRef.value) {
      console.log('App.vue: 刷新新网络的钱包余额')
      try {
        await walletRef.value.refreshBalance()
      } catch (balanceError) {
        console.warn('App.vue: 钱包余额刷新失败，将稍后重试:', balanceError)
        // 延迟重试
        setTimeout(async () => {
          try {
            await walletRef.value.refreshBalance()
            console.log('App.vue: 钱包余额重试刷新成功')
          } catch (retryError) {
            console.error('App.vue: 钱包余额重试刷新仍失败:', retryError)
          }
        }, 3000)
      }
    }
    
    // 刷新对话次数数据 - 不同网络的合约数据不同
    if (dialogueRef.value) {
      console.log('App.vue: 刷新新网络的对话次数数据')
      setTimeout(async () => {
        try {
          await dialogueRef.value.refreshDialogues()
          console.log('App.vue: 对话次数数据刷新成功')
        } catch (dialogueError) {
          console.error('App.vue: 对话次数数据刷新失败:', dialogueError)
        }
      }, 1000)
    }
    
    console.log('App.vue: 网络切换后数据刷新完成')
    
    // 显示网络切换提示
    ElNotification({
      title: '网络已切换',
      message: `已切换到${getNetworkName(chainInfo.newChainId)}，对话历史已清空`,
      type: 'info',
      duration: 3000
    })
    
  } catch (error) {
    console.error('App.vue: 网络切换后数据刷新失败:', error)
  }
}

const handleDialogueUsed = () => {
  // 对话次数使用后的处理
  ElNotification({
    title: '对话次数使用',
    message: '您已成功使用1次对话',
    type: 'info',
    duration: 2000
  })
}

const handleUseDialogue = async () => {
  if (!dialogueRef.value) {
    throw new Error('对话管理器未初始化')
  }
  
  try {
    console.log('App.vue: 开始使用对话次数...')
    await dialogueRef.value.useDialogue()
    console.log('App.vue: 对话次数使用完成，合约已确认')
    return true
  } catch (error) {
    console.error('App.vue: 使用对话次数失败:', error)
    throw error
  }
}

const showAbout = () => {
  aboutVisible.value = true
}

const showWelcomeMessage = () => {
  ElNotification({
    title: '欢迎使用 Cancer AMA Bot',
    message: '请先连接您的区块链钱包，然后兑换对话次数开始与AI对话',
    type: 'info',
    duration: 5000,
    position: 'top-right'
  })
}

// 格式化方法
const formatAddress = (addr) => {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const formatBalance = (bal) => {
  return parseFloat(bal || '0').toFixed(4)
}

const getCurrencySymbol = (chainId) => {
  switch (chainId) {
    case 5777:
      return 'ETH'
    case 202599:
      return 'JU'
    case 210000:
      return 'JU'
    default:
      return 'JU' // 默认使用JU（主网货币）
  }
}

const getNetworkName = (chainId) => {
  switch (chainId) {
    case 5777:
      return 'Ganache本地网络'
    case 202599:
      return 'JuChain测试网'
    case 210000:
      return 'JuChain主网'
    default:
      return 'JuChain主网' // 默认显示主网
  }
}

// 全局错误处理
const handleGlobalError = (error) => {
  console.error('全局错误:', error)
  ElMessage.error('系统错误: ' + error.message)
}

// 生命周期
onMounted(() => {
  // 显示欢迎消息
  setTimeout(showWelcomeMessage, 1000)
  
  // 全局错误监听
  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason)
  })
  
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error)
  })
})

onUnmounted(() => {
  // 清理监听器
  window.removeEventListener('unhandledrejection', handleGlobalError)
  window.removeEventListener('error', handleGlobalError)
})
</script>

<template>
  <div class="app">
    <!-- 顶部连接钱包按钮 - 当未连接时显示 -->
    <div 
      v-if="!walletRef?.isConnected" 
      class="top-connect-banner"
    >
      <div class="banner-content">
        <div class="banner-info">
          <el-icon class="banner-icon"><Cpu /></el-icon>
          <span class="banner-text">Cancer AMA Bot</span>
        </div>
        <el-button 
          type="primary" 
          @click="connectWallet"
          size="large"
          class="top-connect-btn"
        >
          <el-icon><Wallet /></el-icon>
          连接钱包开始使用
        </el-button>
      </div>
    </div>

    <!-- 钱包连接组件 - 始终渲染但隐藏，用于方法调用 -->
    <div style="display: none;">
      <WalletConnect 
        ref="walletRef"
        @balance-updated="handleBalanceUpdated"
        @wallet-connected="handleWalletConnected"
        @account-changed="handleAccountChanged"
        @chain-changed="handleChainChanged"
      />
    </div>

    <!-- 主要内容区域 - 全屏布局 -->
    <main class="app-main" :class="{ 'connected': walletRef?.isConnected }">
      <!-- 未连接状态：显示欢迎界面 -->
      <div v-if="!walletRef?.isConnected" class="welcome-screen">
        <div class="welcome-content">
          <el-icon class="welcome-icon"><Cpu /></el-icon>
          <h1 class="welcome-title">Cancer AMA Bot</h1>
          <p class="welcome-subtitle">基于区块链技术的AI对话智能体平台</p>
          
          <div class="features-grid">
            <div class="feature-card">
              <el-icon><Connection /></el-icon>
              <h3>区块链连接</h3>
              <p>支持多种区块链网络</p>
            </div>
            <div class="feature-card">
              <el-icon><CreditCard /></el-icon>
              <h3>智能兑换</h3>
              <p>加密货币兑换对话次数</p>
            </div>
            <div class="feature-card">
              <el-icon><ChatDotRound /></el-icon>
              <h3>AI对话</h3>
              <p>智能AI助手，专业回答</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 已连接状态：显示对话界面 -->
      <div v-else class="main-layout">
        <!-- 左侧工具栏 -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="app-title">
              <el-icon class="title-icon"><Cpu /></el-icon>
              <span class="title-text">Cancer AMA Bot</span>
            </div>
          </div>
          
          <div class="sidebar-content">
            <!-- 钱包信息显示 -->
            <div class="wallet-info-display">
              <el-card>
                <template #header>
                  <div class="wallet-header">
                    <el-icon><Wallet /></el-icon>
                    <span>钱包信息</span>
                  </div>
                </template>
                
                <div class="info-item">
                  <span class="label">账户:</span>
                  <span class="value">{{ formatAddress(walletRef?.account || '') }}</span>
                </div>
                
                <div class="info-item">
                  <span class="label">余额:</span>
                  <span class="value">{{ formatBalance(walletRef?.balance || '0') }} {{ getCurrencySymbol(walletRef?.currentChainId) }}</span>
                </div>
              </el-card>
            </div>

            <!-- 对话次数管理组件 -->
            <DialogueManager
              ref="dialogueRef"
              :is-connected="!!walletRef?.isConnected"
              :account="walletRef?.account || ''"
              :wallet-balance="walletRef?.balance || '0'"
              :current-chain-id="walletRef?.currentChainId || null"
              @dialogue-used="handleDialogueUsed"
              @balance-updated="handleBalanceUpdated"
              class="dialogue-manager"
            />
          </div>
        </aside>

        <!-- 右侧：AI对话界面 - 铺满剩余空间 -->
        <section class="chat-section">
          <ChatBot
            ref="chatRef"
            :is-connected="!!walletRef?.isConnected"
            :remaining-dialogues="Number(dialogueRef?.remainingDialogues) || 0"
            :account="walletRef?.account || ''"
            :current-chain-id="walletRef?.currentChainId || null"
            :dialogue-manager-ref="dialogueRef"
          />
        </section>
      </div>
    </main>

    <!-- 全局加载状态 -->
    <div 
      v-loading="globalLoading"
      :element-loading-text="loadingText"
      element-loading-background="rgba(0, 0, 0, 0.8)"
      class="global-loading"
    ></div>

    <!-- 关于对话框 -->
    <el-dialog
      v-model="aboutVisible"
      title="关于项目"
      width="500px"
      center
    >
      <div class="about-content">
        <el-icon class="about-icon"><InfoFilled /></el-icon>
        <h3>Cancer AMA Bot</h3>
        <p>基于区块链技术的AI对话智能体平台</p>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="版本">v1.0.0</el-descriptions-item>
          <el-descriptions-item label="区块链网络">JuChain 主网</el-descriptions-item>
          <el-descriptions-item label="支持币种">JU / ETH</el-descriptions-item>
          <el-descriptions-item label="兑换比率">0.01 JU/ETH = 5次对话</el-descriptions-item>
        </el-descriptions>
        
        <div class="feature-list">
          <h4>主要功能：</h4>
          <ul>
            <li>🔗 区块链钱包连接</li>
            <li>💰 加密货币余额查询</li>
            <li>🔄 对话次数兑换</li>
            <li>🤖 AI智能对话</li>
            <li>📊 使用记录统计</li>
          </ul>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="aboutVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 强制重置，确保从最左边开始 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  width: 100vw;
  height: 100vh;
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  background: var(--gradient-background);
  overflow: hidden;
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
}

/* 顶部连接钱包横幅 */
.top-connect-banner {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 1000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin: 0;
  box-sizing: border-box;
}

.banner-content {
  width: 100%;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.banner-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-text {
  font-size: 1.25rem;
  font-weight: 600;
}

.top-connect-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  font-weight: 600;
}

.top-connect-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 主要内容区域 */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100vw;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-main.connected {
  height: 100vh;
  width: 100vw;
}

/* 欢迎界面 */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  margin: 0;
  position: relative;
}

.welcome-content {
  width: 100%;
  max-width: 1000px;
  margin: 0;
}

.welcome-icon {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.welcome-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin: 0 0 3rem 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.feature-card .el-icon {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.feature-card p {
  color: var(--text-secondary);
  margin: 0;
}

/* 已连接状态的主布局 */
.main-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  min-height: 0;
  overflow: hidden;
  margin: 0;
  padding: 0;
  position: relative;
  left: 0;
  right: 0;
}

/* 侧边栏 - 占屏幕宽度的1/3 */
.sidebar {
  flex: 0 0 33.333%;
  width: 33.333%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  position: relative;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  width: 100%;
  box-sizing: border-box;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  font-size: 1.8rem;
  color: var(--primary-color);
}

.title-text {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.dialogue-manager {
  margin-top: 0;
}

/* 对话区域 - 占屏幕宽度的2/3 */
.chat-section {
  flex: 0 0 66.667%;
  width: 66.667%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg-primary);
  overflow: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  position: relative;
}

/* 关于对话框 */
.about-content {
  text-align: center;
}

.about-icon {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.about-content h3 {
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.about-content p {
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
}

.feature-list {
  margin-top: 1.5rem;
  text-align: left;
}

.feature-list h4 {
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

.feature-list ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.feature-list li {
  margin: 0.5rem 0;
  line-height: 1.4;
}

/* 钱包信息显示 */
.wallet-info-display {
  margin-bottom: 1rem;
  width: 100%;
}

.wallet-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.75rem 0;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 1rem;
}

.info-item .value {
  color: var(--text-primary);
  font-weight: 600;
  font-family: monospace;
  font-size: 1rem;
}

/* 确保16:9屏幕比例的最佳显示效果 */
@media (aspect-ratio: 16/9) {
  .main-layout {
    max-width: 100vw;
    max-height: 100vh;
  }
  
  .sidebar {
    flex: 0 0 33.333% !important;
    width: 33.333% !important;
  }
  
  .chat-section {
    flex: 0 0 66.667% !important;
    width: 66.667% !important;
  }
}

/* 超宽屏优化 */
@media (min-width: 1920px) {
  .title-text {
    font-size: 1.5rem;
  }
  
  .title-icon {
    font-size: 2rem;
  }
  
  .wallet-header {
    font-size: 1.2rem;
  }
}

/* 响应式设计 - 移除最小宽度限制，确保严格按比例分配 */
@media (min-width: 969px) {
  .sidebar {
    flex: 0 0 33.333% !important;
    width: 33.333% !important;
  }
  
  .chat-section {
    flex: 0 0 66.667% !important;
    width: 66.667% !important;
  }
}

@media (max-width: 1200px) and (min-width: 969px) {
  .title-icon {
    font-size: 1.6rem;
  }
  
  .title-text {
    font-size: 1.2rem;
  }
}

@media (max-width: 968px) {
  .main-layout {
    flex-direction: column;
    height: 100vh;
  }
  
  .sidebar {
    width: 100% !important;
    height: 40vh;
    min-width: auto;
  }
  
  .chat-section {
    width: 100% !important;
    height: 60vh;
  }
  
  .banner-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .welcome-title {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 576px) {
  .banner-content,
  .welcome-content {
    padding: 0 0.5rem;
  }
  
  .welcome-title {
    font-size: 1.75rem;
  }
  
  .welcome-subtitle {
    font-size: 1rem;
  }
  
  .sidebar-header,
  .sidebar-content {
    padding: 0.5rem;
  }
  
  .title-text {
    font-size: 1rem;
  }
}

/* Element Plus 卡片组件样式强制填满宽度 */
:deep(.el-card) {
  width: 100% !important;
  box-sizing: border-box;
  margin: 0 !important;
}

:deep(.el-card__header) {
  padding: 1rem;
  margin: 0;
}

:deep(.el-card__body) {
  padding: 1rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
}

/* 强制全屏布局，确保没有留白 */
.app, .app-main, .main-layout {
  margin: 0 !important;
  padding: 0 !important;
}

/* 确保所有Flex项目从左边开始 */
.main-layout > * {
  margin: 0 !important;
  padding: 0;
  box-sizing: border-box;
}
</style>
