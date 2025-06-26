import { defineStore } from "pinia";

export const useChatStore = defineStore("chat", {
  state: () => ({
    additionalMessages: [],
    conversationId: null,
    isStreaming: false,
    currentStreamingMessage: null,
    streamingContent: "",
  }),

  getters: {
    // 获取格式化的对话历史
    getFormattedMessages: (state) => {
      return state.additionalMessages;
    },

    // 获取最新的对话消息
    getLatestMessage: (state) => {
      return state.additionalMessages.length > 0
        ? state.additionalMessages[state.additionalMessages.length - 1]
        : null;
    },

    // 检查是否有对话历史
    hasHistory: (state) => {
      return state.additionalMessages.length > 0;
    },
  },

  actions: {
    // 添加用户消息
    addUserMessage(content) {
      const message = {
        role: "user",
        type: "question",
        content_type: "text",
        content: content,
        timestamp: new Date().toISOString(),
      };
      this.additionalMessages.push(message);
      return message;
    },

    // 添加助手消息
    addAssistantMessage(content) {
      const message = {
        role: "assistant",
        type: "answer",
        content_type: "text",
        content: content,
        timestamp: new Date().toISOString(),
      };
      this.additionalMessages.push(message);
      return message;
    },

    // 开始流式响应
    startStreaming(messageId) {
      this.isStreaming = true;
      this.currentStreamingMessage = messageId;
      this.streamingContent = "";
    },

    // 添加流式内容
    appendStreamingContent(content) {
      if (this.isStreaming) {
        this.streamingContent += content;
      }
    },

    // 结束流式响应
    endStreaming() {
      console.log("Store: 开始结束流式响应", {
        isStreaming: this.isStreaming,
        streamingContent: this.streamingContent
          ? this.streamingContent.length + "字符"
          : "无内容",
      });

      if (this.isStreaming && this.streamingContent) {
        // 将完整的流式内容保存为助手消息
        this.addAssistantMessage(this.streamingContent);
        console.log("Store: 流式内容已保存为助手消息");
      }

      // 重置流式响应状态，但不立即清空streamingContent
      // streamingContent会在ChatBot组件中使用后再清空
      this.isStreaming = false;
      this.currentStreamingMessage = null;

      console.log(
        "Store: 流式响应状态已重置，streamingContent保留用于界面显示"
      );
    },

    // 清空流式内容（供ChatBot组件在使用完毕后调用）
    clearStreamingContent() {
      console.log("Store: 清空流式内容");
      this.streamingContent = "";
    },

    // 设置会话ID
    setConversationId(id) {
      this.conversationId = id;
    },

    // 清空对话历史
    clearMessages() {
      this.additionalMessages = [];
      this.conversationId = null;
      this.isStreaming = false;
      this.currentStreamingMessage = null;
      this.streamingContent = "";
    },

    // 清空特定用户的对话历史
    clearUserMessages() {
      this.additionalMessages = [];
      this.conversationId = null;
      this.isStreaming = false;
      this.currentStreamingMessage = null;
      this.streamingContent = "";
    },
  },
});
