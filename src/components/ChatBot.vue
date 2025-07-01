<template>
  <div class="chat-bot">
    <el-card class="chat-card">
      <template #header>
        <div class="chat-header">
          <el-icon><MessageBox /></el-icon>
          <span>Cancer AMA Bot</span>
          <div class="chat-status">
            <el-tag :type="getStatusType" size="small">
              {{ getStatusText }}
            </el-tag>
          </div>
        </div>
      </template>

      <!-- 消息列表 -->
      <div class="message-container" ref="messageContainer">
        <div class="message-list">
          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0" class="welcome-message">
            <div class="welcome-content">
              <el-icon class="welcome-icon"><ChatDotRound /></el-icon>
              <h3>欢迎使用Cancer AMA Bot</h3>
              <p>请先连接钱包并兑换对话次数，然后开始与AI对话</p>
            </div>
          </div>

          <!-- 消息列表 -->
          <transition-group name="slide-up" tag="div">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-item"
              :class="message.type"
            >
              <div class="message-content">
                <div class="message-avatar">
                  <el-avatar
                    :size="32"
                    :src="getAvatarSrc(message.type)"
                    :icon="getAvatarIcon(message.type)"
                  />
                </div>
                
                <div class="message-bubble" :class="message.type">
                  <div class="message-text">{{ message.content }}</div>
                  <div class="message-time">
                    {{ formatTime(message.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </transition-group>

          <!-- AI思考中动画 -->
          <div v-if="aiStatus === 'thinking'" class="message-item assistant">
            <div class="message-content">
              <div class="message-avatar">
                <el-avatar :size="32">
                  <el-icon><MessageBox /></el-icon>
                </el-avatar>
              </div>
              
              <div class="message-bubble assistant thinking">
                <div class="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div class="message-text">请在MetaMask中确认消耗对话次数</div>
              </div>
            </div>
          </div>

          <!-- 流式响应输出 -->
          <div v-if="chatStore.isStreaming" class="message-item assistant">
            <div class="message-content">
              <div class="message-avatar">
                <el-avatar :size="32">
                  <el-icon><MessageBox /></el-icon>
                </el-avatar>
              </div>
              
              <div class="message-bubble assistant streaming">
                <div class="message-text">{{ chatStore.streamingContent }}<span class="cursor">|</span></div>
                <div class="message-time">
                  {{ formatTime(new Date()) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-section">
        <el-form @submit.prevent="sendMessage" class="input-form">
          <el-form-item>
            <div class="input-container">
              <el-input
                v-model="inputMessage"
                type="textarea"
                :rows="3"
                placeholder="请输入您的问题..."
                :disabled="!canSendMessage"
                @keydown.enter.exact.prevent="sendMessage"
                @keydown.enter.shift.exact.prevent="inputMessage += '\n'"
                class="message-input"
                resize="none"
                maxlength="1000"
                show-word-limit
              />
              
              <div class="input-actions">
                <el-tooltip content="Shift+Enter换行，Enter发送" placement="top">
                  <el-button
                    type="primary"
                    @click="sendMessage"
                    :loading="sending"
                    :disabled="!canSendMessage || !inputMessage.trim()"
                    class="send-btn glow"
                    size="large"
                  >
                    <el-icon><Promotion /></el-icon>
                    发送
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <!-- 状态提示 -->
        <div class="status-hints">
          <el-alert
            v-if="!isConnected"
            title="请先连接钱包"
            type="warning"
            :closable="false"
            class="status-alert"
          />
          
          <el-alert
            v-else-if="remainingDialogues <= 0"
            title="对话次数不足，请先兑换"
            type="error"
            :closable="false"
            class="status-alert"
          >
            <template #default>
              剩余对话次数: {{ remainingDialogues }}
            </template>
          </el-alert>
          
          <el-alert
            v-else-if="remainingDialogues <= 5"
            title="对话次数即将用完"
            type="warning"
            :closable="false"
            class="status-alert"
          >
            <template #default>
              剩余对话次数: {{ remainingDialogues }}，建议及时兑换
            </template>
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { aiService, MessageType, AIStatus } from '@/services/aiService.js'
import { useChatStore } from '@/stores/chat.js'

// Props
const props = defineProps({
  isConnected: {
    type: Boolean,
    default: false
  },
  remainingDialogues: {
    type: Number,
    default: 0
  },
  account: {
    type: String,
    default: ''
  },
  currentChainId: {
    type: Number,
    default: null
  },
  dialogueManagerRef: {
    type: Object,
    default: null
  }
})

// Emits（目前无需发送事件）
const emit = defineEmits([])

// Store
const chatStore = useChatStore()

// 响应式数据
const messages = ref([])
const inputMessage = ref('')
const sending = ref(false)
const aiStatus = ref(AIStatus.IDLE)
const messageContainer = ref(null)

// 计算属性
const canSendMessage = computed(() => {
  const canSend = props.isConnected && 
         props.remainingDialogues > 0 && 
         !sending.value &&
         aiStatus.value === AIStatus.IDLE &&
         !chatStore.isStreaming
  
  return canSend
})

const getStatusType = computed(() => {
  if (!props.isConnected) return 'info'
  if (props.remainingDialogues <= 0) return 'danger'
  if (props.remainingDialogues <= 5) return 'warning'
  return 'success'
})

const getStatusText = computed(() => {
  if (!props.isConnected) return '未连接'
  if (props.remainingDialogues <= 0) return '无对话次数'
  return `${props.remainingDialogues}次对话`
})

// 方法
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getAvatarSrc = (type) => {
  return null // 使用默认图标
}

const getAvatarIcon = (type) => {
  return type === MessageType.USER ? 'User' : 'Robot'
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageContainer.value) {
    const container = messageContainer.value
    container.scrollTop = container.scrollHeight
  }
}

const addMessage = (content, type, timestamp = new Date()) => {
  const message = {
    id: Date.now() + Math.random(),
    content,
    type,
    timestamp
  }
  
  messages.value.push(message)
  scrollToBottom()
  
  return message
}

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || !canSendMessage.value) return

  try {
    // 验证消息
    aiService.validateMessage(message)

    // 确认使用对话次数
    await ElMessageBox.confirm(
      `发送此消息将消耗 1 次对话。当前剩余次数: ${props.remainingDialogues}`,
      '确认发送',
      {
        confirmButtonText: '确认发送',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // 设置发送状态
    sending.value = true
    aiStatus.value = AIStatus.THINKING
    
    // 使用对话次数 (在添加消息之前，等待合约确认)
    console.log('ChatBot: 开始使用对话次数...')
    await handleUseDialogueContract()
    console.log('ChatBot: 对话次数使用完成，合约已确认')
    
    // 将用户消息添加到 store 中
    chatStore.addUserMessage(message)
    
    // 同步Store中的消息到界面显示
    syncMessagesFromStore()
    
    // 清空输入框
    inputMessage.value = ''
    
    // 准备发送到API的消息历史
    const additionalMessages = [...chatStore.getFormattedMessages]
    
    console.log('准备发送的对话历史:', additionalMessages)
    
    // 设置AI服务事件处理器
    console.log('ChatBot: 开始设置AI服务事件处理器')
    
    // 先定义所有事件处理器
    const eventHandlers = {
      onChatCreated: (data) => {
        console.log('对话已创建:', data)
        aiStatus.value = AIStatus.RESPONDING
        
        // 设置对话ID
        if (data.conversation_id) {
          chatStore.setConversationId(data.conversation_id)
        }
        
        // 开始流式响应
        chatStore.startStreaming(data.id)
      },
      
      onMessageDelta: (data) => {
        console.log('收到增量消息:', data)
        if (data.content) {
          // 添加增量内容
          chatStore.appendStreamingContent(data.content)
          scrollToBottom()
        }
      },
      
      onMessageCompleted: (data) => {
        console.log('消息完成:', data)
        if (data.type === 'verbose') {
          // 智能体停止输出
          console.log('智能体输出完成')
        }
      },
      
      onChatCompleted: (data) => {
        console.log('对话完成:', data)
        
        // 显示完成提示
        ElNotification({
          title: '回答生成完毕',
          message: 'AI 已完成回答生成',
          type: 'success',
          position: 'top-right',
          duration: 3000
        })
      },
      
      onDone: async () => {
        console.log('ChatBot: 流式响应结束，开始处理onDone事件')
        
        try {
          // 获取当前的流式内容，准备添加到界面
          const aiResponseContent = chatStore.streamingContent
          console.log('ChatBot: 获取到AI回答内容，长度:', aiResponseContent ? aiResponseContent.length : 0)
          
          // 结束流式响应并保存到store
          chatStore.endStreaming()
          console.log('ChatBot: 流式内容已保存到store')
          
          // 清空流式内容（Store已经保存了AI回答）
          chatStore.clearStreamingContent()
          console.log('ChatBot: 流式内容已清空')
          
          // 同步Store中的所有消息到界面显示
          syncMessagesFromStore()
          
          // 等待DOM更新
          await nextTick()
          
          // 重置状态，允许用户继续对话
          aiStatus.value = AIStatus.IDLE
          sending.value = false
          
          console.log('ChatBot: 状态已重置，用户可以继续对话')
          console.log('ChatBot: 界面消息数量:', messages.value.length)
          console.log('ChatBot: Store消息数量:', chatStore.getFormattedMessages.length)
          
          // 显示成功消息
          ElMessage.success('AI回复生成完成，您可以继续对话了')
          
        } catch (error) {
          console.error('ChatBot: 处理onDone事件时出错:', error)
          // 确保状态被重置
          aiStatus.value = AIStatus.IDLE
          sending.value = false
          chatStore.endStreaming()
        }
      },
      
      onError: (error) => {
        console.error('AI服务错误:', error)
        aiStatus.value = AIStatus.ERROR
        sending.value = false
        
        // 结束流式响应
        chatStore.endStreaming()
        
        // 添加错误消息
        addMessage(
          `抱歉，处理您的消息时出现了错误: ${error.message}`,
          MessageType.ASSISTANT
        )
        
        ElMessage.error('发送失败: ' + error.message)
        
        setTimeout(() => {
          aiStatus.value = AIStatus.IDLE
        }, 3000)
      }
    }
    
    // 设置事件处理器
    console.log('ChatBot: 即将设置事件处理器:', Object.keys(eventHandlers))
    aiService.setEventHandlers(eventHandlers)
    console.log('ChatBot: 事件处理器设置完成')
    
    // 发送到AI服务
    await aiService.sendMessage(
      message, 
      props.account, // 使用钱包地址作为 user_id
      additionalMessages,
      chatStore.conversationId
    )
    
  } catch (error) {
    console.error('发送消息失败:', error)
    
    // 重置状态
    sending.value = false
    aiStatus.value = AIStatus.ERROR
    
    // 根据错误类型显示不同消息
    if (error === 'cancel' || error.message === 'Action cancelled by user') {
      // 用户取消确认对话
      ElMessage.warning('未确认对话次数消耗')
      setTimeout(() => {
        aiStatus.value = AIStatus.IDLE
      }, 1000)
    } else {
      // 其他错误
      const errorMsg = `处理消息时出现错误: ${error.message || error}`
      
      // 添加错误消息到界面
      addMessage(errorMsg, MessageType.ASSISTANT)
      
      ElMessage.error('发送失败: ' + (error.message || error))
      
      setTimeout(() => {
        aiStatus.value = AIStatus.IDLE
      }, 3000)
    }
  }
}

const clearMessages = (showWelcome = false) => {
  messages.value = []
  aiStatus.value = AIStatus.IDLE
  chatStore.clearMessages()
  
  if (showWelcome) {
    // 添加新的欢迎消息
    setTimeout(() => {
      addMessage(
        '您好！我是Cancer AMA Bot。您的对话历史已更新，请开始新的对话吧！',
        MessageType.ASSISTANT
      )
    }, 300)
  }
}

// 同步Store中的消息到界面显示
const syncMessagesFromStore = () => {
  console.log('ChatBot: 开始同步Store中的消息到界面')
  const storeMessages = chatStore.getFormattedMessages
  
  // 清空当前界面消息
  messages.value = []
  
  // 将Store中的消息转换为界面消息格式并添加
  storeMessages.forEach((storeMsg, index) => {
    const uiMessage = {
      id: Date.now() + index,
      content: storeMsg.content,
      type: storeMsg.role === 'user' ? MessageType.USER : MessageType.ASSISTANT,
      timestamp: new Date(storeMsg.timestamp)
    }
    messages.value.push(uiMessage)
  })
  
  console.log('ChatBot: 同步完成，界面消息数量:', messages.value.length)
  scrollToBottom()
}

const addSystemMessage = (content) => {
  addMessage(content, MessageType.ASSISTANT)
}

const handleUseDialogueContract = async () => {
  if (!props.dialogueManagerRef) {
    throw new Error('对话管理器未初始化')
  }
  
  try {
    console.log('ChatBot: 调用对话管理器的 useDialogue 方法')
    const result = await props.dialogueManagerRef.useDialogue()
    console.log('ChatBot: 对话次数使用成功，合约交易已确认')
    
    // 对话次数使用完成（不再需要发送事件，由DialogueManager处理）
    
    return result
  } catch (error) {
    console.error('ChatBot: 使用对话次数失败:', error)
    throw error
  }
}

// 监听AI状态和流式响应状态变化
watch([() => aiStatus.value, () => sending.value, () => chatStore.isStreaming], 
  ([newAiStatus, newSending, newStreaming], [oldAiStatus, oldSending, oldStreaming]) => {
    console.log('状态变化监听:', {
      aiStatus: { old: oldAiStatus, new: newAiStatus },
      sending: { old: oldSending, new: newSending },
      streaming: { old: oldStreaming, new: newStreaming },
      canSend: canSendMessage.value
    })
  }
)

// 监听对话次数变化
watch(() => props.remainingDialogues, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal <= 0 && messages.value.length > 0) {
    nextTick(() => {
      addMessage(
        '您的对话次数已用完，请兑换更多次数继续对话。',
        MessageType.ASSISTANT
      )
    })
  }
})

// 监听账号变化
watch(() => props.account, (newVal, oldVal) => {
  if (newVal !== oldVal && oldVal !== '' && props.isConnected) {
    console.log('ChatBot: 检测到账号切换，清空对话历史')
    clearMessages()
    if (newVal) {
      // 为新账号添加欢迎消息
      setTimeout(() => {
        addMessage(
          `账号已切换至 ${newVal.slice(0, 6)}...${newVal.slice(-4)}，对话历史已清空。请开始新的对话！`,
          MessageType.ASSISTANT
        )
      }, 800)
    }
  } else if (newVal && props.isConnected) {
    // 同步现有消息
    setTimeout(() => {
      syncMessagesFromStore()
    }, 500)
  }
})

// 监听网络变化
watch(() => props.currentChainId, (newVal, oldVal) => {
  if (newVal !== oldVal && oldVal !== null && props.isConnected) {
    console.log('ChatBot: 检测到网络切换，清空对话历史')
    clearMessages()
    if (newVal) {
      // 为新网络添加欢迎消息
      setTimeout(() => {
        const networkName = getNetworkName(newVal)
        addMessage(
          `网络已切换至${networkName}，对话历史已清空。请开始新的对话！`,
          MessageType.ASSISTANT
        )
      }, 800)
    }
  }
})

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

// 组件挂载时设置事件处理器
onMounted(() => {
  console.log('ChatBot 组件已挂载，设置AI服务事件处理器')
  
  // 同步Store中的现有消息
  if (props.isConnected) {
    setTimeout(() => {
      syncMessagesFromStore()
    }, 100)
  }
})

// 暴露方法给父组件
defineExpose({
  messages,
  clearMessages,
  addMessage,
  addSystemMessage,
  syncMessagesFromStore
})
</script>

<style scoped>
.chat-bot {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.chat-card {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: none;
  border-radius: 0;
  margin: 0;
  box-sizing: border-box;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.chat-status {
  margin-left: auto;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  min-height: 0;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 1rem;
}

.welcome-message {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.welcome-icon {
  font-size: 3rem;
  color: var(--primary-color);
}

.welcome-content h3 {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.5rem;
}

.welcome-content p {
  margin: 0;
  opacity: 0.8;
  font-size: 1.1rem;
}

.message-item {
  display: flex;
  max-width: 100%;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.assistant {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 80%;
}

.message-item.user .message-content {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  position: relative;
  word-wrap: break-word;
}

.message-bubble.user {
  background: var(--gradient-primary);
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message-bubble.assistant {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-bottom-left-radius: 0.25rem;
}

.message-bubble.thinking,
.message-bubble.streaming {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.message-text {
  line-height: 1.5;
  white-space: pre-wrap;
  font-size: 1rem;
}

.message-time {
  font-size: 0.8rem;
  opacity: 0.6;
  margin-top: 0.25rem;
  text-align: right;
}

.message-bubble.assistant .message-time {
  text-align: left;
}

/* 流式输出光标动画 */
.cursor {
  animation: blink 1s infinite;
  color: var(--primary-color);
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.input-section {
  border-top: 1px solid var(--border-color);
  padding: 1.5rem;
  background: var(--bg-secondary);
  width: 100%;
  box-sizing: border-box;
}

.input-form {
  margin: 0;
  width: 100%;
}

.input-container {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  width: 100%;
}

.message-input {
  flex: 1;
  min-width: 0;
}

.input-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.send-btn {
  min-width: 120px;
  padding: 1rem 1.8rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  height: auto;
}

.status-hints {
  margin-top: 0.5rem;
}

.status-alert {
  margin: 0.25rem 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-content {
    max-width: 95%;
  }
  
  .input-section {
    padding: 1rem;
  }
  
  .input-container {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .message-input {
    width: 100%;
  }
  
  .input-actions {
    flex-direction: row;
    justify-content: flex-end;
    width: 100%;
  }
  
  .send-btn {
    min-width: 100px;
    padding: 0.8rem 1.2rem;
  }
  
  :deep(.el-textarea__inner) {
    min-height: 60px;
    padding: 0.8rem;
  }
}

@media (min-width: 769px) {
  .input-container {
    align-items: flex-end;
  }
  
  .message-input {
    flex: 1;
  }
  
  .send-btn {
    align-self: flex-end;
  }
}

/* Element Plus 样式覆盖 */
:deep(.el-card__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  width: 100%;
}

:deep(.el-textarea) {
  width: 100%;
}

:deep(.el-textarea__inner) {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-primary);
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(116, 83, 220, 0.1);
}

:deep(.el-form-item) {
  margin-bottom: 0;
  width: 100%;
}

:deep(.el-form-item__content) {
  width: 100%;
}
</style> 