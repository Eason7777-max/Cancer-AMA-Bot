<template>
  <div class="dialogue-manager">
    <el-card class="dialogue-card">
      <template #header>
        <div class="card-header">
          <el-icon><ChatDotRound /></el-icon>
          <span>对话次数管理</span>
        </div>
      </template>

      <!-- 剩余对话次数 -->
      <div class="remaining-section">
        <div class="remaining-display">
          <el-statistic 
            :value="remainingDialogues" 
            title="剩余对话次数"
            class="statistic"
          >
            <template #suffix>
              <span>次</span>
            </template>
          </el-statistic>
          
          <el-button 
            size="small" 
            @click="refreshDialogues(true)"
            :loading="refreshing"
            text
            class="refresh-btn"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        
        <el-progress 
          :percentage="getProgressPercentage" 
          :color="getProgressColor"
          :stroke-width="8"
          class="progress-bar"
        />
      </div>

      <!-- 兑换功能 -->
      <div class="exchange-section">
        <el-divider>
          <el-icon><CreditCard /></el-icon>
          兑换对话次数
        </el-divider>

        <!-- 兑换比率说明 -->
        <div class="exchange-info">
          <el-alert
            :title="getExchangeRateText"
            type="info"
            :closable="false"
            show-icon
          />
          <el-alert
            :title="`对话次数上限: ${maxDialogues} 次`"
            type="info"
            :closable="false"
            show-icon
            class="mt-2"
          >
            <template #default>
              当前剩余: {{ remainingDialogues }} 次，还可兑换: {{ maxAllowedDialogues }} 次
            </template>
          </el-alert>
        </div>

        <!-- 兑换表单 -->
        <el-form class="exchange-form">
          <el-form-item label="兑换金额">
            <el-input-number
              v-model="exchangeAmount"
              :min="minExchangeAmount"
              :max="Math.min(getMaxExchangeAmount, maxAllowedExchangeAmount)"
              :precision="3"
              :step="0.01"
              :controls="false"
              class="amount-input"
            >
              <template #append>{{ getCurrencySymbol }}</template>
            </el-input-number>
          </el-form-item>

          <el-form-item>
            <div class="preview-section">
              <el-text class="preview-text">
                将获得: 
                <span class="highlight">{{ calculateDialogues }}</span> 
                次对话
              </el-text>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button 
              type="primary" 
              @click="exchangeDialogue"
              :loading="exchanging"
              :disabled="!canExchange"
              class="exchange-btn glow"
              size="large"
            >
              <el-icon><Shop /></el-icon>
              立即兑换
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 余额不足提示 -->
        <el-alert
          v-if="!hasEnoughBalance"
          title="余额不足"
          type="warning"
          :closable="false"
          class="mt-3"
        >
          <template #default>
            当前余额: {{ formatBalance(walletBalance) }} {{ getCurrencySymbol }}
            <br>
            最小兑换金额: {{ minExchangeAmount }} {{ getCurrencySymbol }}
          </template>
        </el-alert>

        <!-- 对话次数上限提示 -->
        <el-alert
          v-if="wouldExceedLimit"
          title="兑换次数超限"
          type="error"
          :closable="false"
          class="mt-3"
        >
          <template #default>
            对话次数上限为 {{ maxDialogues }} 次，当前剩余 {{ remainingDialogues }} 次
            <br>
            最多还可兑换 {{ maxAllowedDialogues }} 次对话
            <br>
            建议兑换金额不超过 {{ maxAllowedExchangeAmount.toFixed(3) }} {{ getCurrencySymbol }}
          </template>
        </el-alert>

        <!-- 接近上限警告 -->
        <el-alert
          v-else-if="remainingDialogues >= maxDialogues * 0.8"
          title="接近上限"
          type="warning"
          :closable="false"
          class="mt-3"
        >
          <template #default>
            当前剩余 {{ remainingDialogues }} 次对话，接近上限 {{ maxDialogues }} 次
          </template>
        </el-alert>
      </div>

      <!-- 兑换历史 -->
      <div class="history-section">
        <el-divider>
          <el-icon><Document /></el-icon>
          兑换记录
        </el-divider>
        
        <div class="history-stats">
          <el-text class="stats-item">
            总兑换金额: {{ formatBalance(totalExchanged) }} {{ getCurrencySymbol }}
          </el-text>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { web3Service } from '@/utils/web3.js'
import { useChatStore } from '@/stores/chat.js'

// Props
const props = defineProps({
  isConnected: {
    type: Boolean,
    default: false
  },
  account: {
    type: String,
    default: ''
  },
  walletBalance: {
    type: String,
    default: '0'
  },
  currentChainId: {
    type: Number,
    default: null
  }
})

// Emits
const emit = defineEmits(['dialogue-used', 'balance-updated'])

// Store
const chatStore = useChatStore()

// 响应式数据
const remainingDialogues = ref(0)
const totalExchanged = ref('0')
const exchangeAmount = ref(0.01)
const minExchangeAmount = ref(0.01)
const dialoguesPerEth = ref(500) // 0.01 JU = 5次对话，所以 1 JU = 500次对话
const maxDialogues = ref(100) // 对话次数上限
const refreshing = ref(false)
const exchanging = ref(false)

// 计算属性
const getCurrencySymbol = computed(() => {
  switch (props.currentChainId) {
    case 5777:
      return 'ETH'
    case 202599:
      return 'JU'
    default:
      return 'ETH'
  }
})

const getExchangeRateText = computed(() => {
  return `兑换比率: 0.01 ${getCurrencySymbol.value} = 5 次对话`
})

const formatBalance = computed(() => (balance) => {
  return parseFloat(balance).toFixed(4)
})

const getMaxExchangeAmount = computed(() => {
  const maxAmount = Math.max(parseFloat(props.walletBalance) - 0.01, 0)
  // 确保max不小于min
  return Math.max(maxAmount, minExchangeAmount.value)
})

const calculateDialogues = computed(() => {
  return Math.floor(exchangeAmount.value * dialoguesPerEth.value)
})

const getProgressPercentage = computed(() => {
  const maxDialogues = 100
  return Math.min((remainingDialogues.value / maxDialogues) * 100, 100)
})

const getProgressColor = computed(() => {
  const percentage = getProgressPercentage.value
  if (percentage > 60) return '#67c23a'
  if (percentage > 30) return '#e6a23c'
  return '#f56c6c'
})

const canExchange = computed(() => {
  const wouldExceedLimit = (remainingDialogues.value + calculateDialogues.value) > maxDialogues.value
  
  return props.isConnected && 
         exchangeAmount.value >= minExchangeAmount.value &&
         hasEnoughBalance.value &&
         !exchanging.value &&
         !wouldExceedLimit
})

const maxAllowedDialogues = computed(() => {
  return Math.max(0, maxDialogues.value - remainingDialogues.value)
})

const maxAllowedExchangeAmount = computed(() => {
  if (maxAllowedDialogues.value <= 0) return 0
  return maxAllowedDialogues.value / dialoguesPerEth.value
})

const wouldExceedLimit = computed(() => {
  return (remainingDialogues.value + calculateDialogues.value) > maxDialogues.value
})

const hasEnoughBalance = computed(() => {
  return parseFloat(props.walletBalance) >= exchangeAmount.value
})

// 方法
const refreshDialogues = async (showMessage = false) => {
  if (!props.isConnected) {
    console.log('钱包未连接，跳过刷新')
    return
  }

  refreshing.value = true
  try {
    console.log('开始刷新对话次数...')
    const contract = web3Service.getContract()
    
    console.log('调用合约方法 getMyRemainingDialogues...')
    const dialogues = await contract.getMyRemainingDialogues()
    console.log('获取到的对话次数:', dialogues.toString())
    
    remainingDialogues.value = Number(dialogues)
    console.log('更新后的对话次数:', remainingDialogues.value)
    
    console.log('调用合约方法 getTotalExchanged...')
    const totalExch = await contract.getTotalExchanged(props.account)
    totalExchanged.value = web3Service.formatEther(totalExch)
    console.log('总兑换金额:', totalExchanged.value)
    
    if (showMessage) {
      ElMessage.success(`刷新成功！剩余对话次数: ${remainingDialogues.value}`)
    } else {
      console.log(`刷新成功！剩余对话次数: ${remainingDialogues.value}`)
    }
  } catch (error) {
    console.error('刷新对话次数失败:', error)
    ElMessage.error('刷新失败: ' + error.message)
  } finally {
    refreshing.value = false
  }
}

const exchangeDialogue = async () => {
  if (!canExchange.value) return

  // 检查是否会超过对话次数上限
  const newTotalDialogues = remainingDialogues.value + calculateDialogues.value
  if (newTotalDialogues > maxDialogues.value) {
    const allowedAmount = maxAllowedExchangeAmount.value.toFixed(3)
    ElMessage.error(
      `兑换失败！对话次数上限为 ${maxDialogues.value} 次。` +
      `当前剩余 ${remainingDialogues.value} 次，最多还可兑换 ${maxAllowedDialogues.value} 次对话。` +
      `建议兑换金额不超过 ${allowedAmount} ${getCurrencySymbol.value}。`
    )
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认兑换 ${exchangeAmount.value} ${getCurrencySymbol.value} 获得 ${calculateDialogues.value} 次对话？\n` +
      `兑换后总计: ${newTotalDialogues} 次对话（上限 ${maxDialogues.value} 次）`,
      '确认兑换',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    exchanging.value = true
    const contract = web3Service.getContract()
    const value = web3Service.parseEther(exchangeAmount.value)
    
    console.log('发起兑换交易，金额:', exchangeAmount.value, getCurrencySymbol.value)
    console.log('预期获得对话次数:', calculateDialogues.value)
    
    const tx = await contract.exchangeDialogue({ value })
    console.log('交易已提交，交易哈希:', tx.hash)
    ElMessage.info('交易已提交，等待确认...')
    
    const receipt = await tx.wait()
    console.log('交易已确认，区块号:', receipt.blockNumber)
    ElMessage.success('兑换成功!')
    
    // 等待区块确认后再刷新
    console.log('等待2秒后刷新对话次数...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('开始刷新对话次数和余额...')
    await refreshDialogues()
    emit('balance-updated')
    
    exchangeAmount.value = minExchangeAmount.value
    
  } catch (error) {
    if (error.message !== 'Action cancelled by user') {
      console.error('兑换失败:', error)
      ElMessage.error('兑换失败: ' + error.message)
    }
  } finally {
    exchanging.value = false
  }
}

const useDialogue = async () => {
  if (!props.isConnected || remainingDialogues.value <= 0) {
    throw new Error('对话次数不足，请先兑换')
  }

  try {
    console.log('DialogueManager: 开始使用对话次数，当前剩余:', remainingDialogues.value)
    
    const contract = web3Service.getContract()
    console.log('DialogueManager: 调用合约useDialogue方法')
    
    const tx = await contract.useDialogue()
    console.log('DialogueManager: 交易已提交，等待确认...', tx.hash)
    
    const receipt = await tx.wait()
    console.log('DialogueManager: 交易已确认，区块号:', receipt.blockNumber)
    
    // 立即减少显示的对话次数
    remainingDialogues.value -= 1
    console.log('DialogueManager: 对话次数已减少，新剩余:', remainingDialogues.value)
    
    emit('dialogue-used')
    
    return true
  } catch (error) {
    console.error('DialogueManager: 使用对话次数失败:', error)
    throw error
  }
}

// 监听器
watch(() => props.isConnected, (newVal, oldVal) => {
  console.log('DialogueManager: isConnected 变化', { newVal, oldVal })
  if (newVal && newVal !== oldVal) {
    // 稍微延迟一下，确保钱包数据完全加载
    setTimeout(() => {
      console.log('DialogueManager: 因连接状态变化而刷新数据')
      refreshDialogues()
    }, 1000)
  } else if (!newVal) {
    console.log('DialogueManager: 钱包断开，清空数据')
    remainingDialogues.value = 0
    totalExchanged.value = '0'
    
    // 清空聊天历史
    chatStore.clearMessages()
  }
})

watch(() => props.account, (newVal, oldVal) => {
  console.log('DialogueManager: account 变化', { newVal, oldVal })
  if (props.isConnected && newVal && newVal !== oldVal) {
    // 账号切换时，先清空之前的数据
    console.log('DialogueManager: 账号切换，清空旧数据')
    remainingDialogues.value = 0
    totalExchanged.value = '0'
    
    // 清空聊天历史
    chatStore.clearMessages()
    
    // 然后加载新账号的数据
    setTimeout(() => {
      console.log('DialogueManager: 因账户变化而刷新数据')
      refreshDialogues()
    }, 1000)
  }
})

// 新增：监听网络切换
watch(() => props.currentChainId, (newVal, oldVal) => {
  console.log('DialogueManager: currentChainId 变化', { newVal, oldVal })
  if (props.isConnected && newVal && newVal !== oldVal) {
    // 网络切换时，先清空之前的数据
    console.log('DialogueManager: 网络切换，清空旧数据')
    remainingDialogues.value = 0
    totalExchanged.value = '0'
    
    // 清空聊天历史
    chatStore.clearMessages()
    
    // 然后加载新网络的数据
    setTimeout(() => {
      console.log('DialogueManager: 因网络变化而刷新数据')
      refreshDialogues()
    }, 1000)
  }
})

// 新增：监听钱包余额变化，也可能意味着有新的交易
watch(() => props.walletBalance, (newVal, oldVal) => {
  if (props.isConnected && newVal !== oldVal && parseFloat(newVal) !== parseFloat(oldVal)) {
    console.log('DialogueManager: 余额变化，可能有新交易，刷新数据')
    setTimeout(() => {
      refreshDialogues()
    }, 500)
  }
})

defineExpose({
  remainingDialogues,
  refreshDialogues,
  useDialogue
})
</script>

<style scoped>
.dialogue-manager {
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dialogue-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.remaining-section {
  margin-bottom: 2rem;
}

.remaining-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.statistic {
  text-align: center;
}

.refresh-btn {
  color: var(--primary-color);
}

.progress-bar {
  margin: 1rem 0;
}

.exchange-section {
  margin: 2rem 0;
}

.exchange-info {
  margin: 1rem 0;
}

.exchange-form {
  margin-top: 1rem;
  width: 100%;
}

.amount-input {
  width: 100%;
  box-sizing: border-box;
}

.preview-section {
  text-align: center;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.preview-text {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.highlight {
  color: var(--primary-color);
  font-weight: 600;
  font-size: 1.4rem;
}

.exchange-btn {
  width: 100%;
  padding: 1.2rem;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 600;
}

.history-section {
  margin-top: 2rem;
  padding-top: 1rem;
}

.history-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats-item {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.mt-3 {
  margin-top: 1rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

/* Element Plus 样式覆盖 */
:deep(.el-form-item) {
  width: 100%;
  margin-bottom: 1rem;
}

:deep(.el-form-item__content) {
  width: 100%;
}

:deep(.el-input-number) {
  width: 100% !important;
}

:deep(.el-input-number .el-input__inner) {
  width: 100%;
  text-align: left;
}

:deep(.el-card__body) {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}
</style> 