// AI 对话服务 - 接入 Coze API
export class AIService {
  constructor() {
    this.apiUrl = "https://api.coze.cn/v3/chat";
    this.authToken =
      "pat_0wgfHRcToVR69tUKoPnGculBGWlgb56Acxkhs8n3iIhGEqFGBl35t1fj1z7Myzfy";
    this.botId = "7519080978552373263";

    // 事件处理器
    this.onChatCreated = null;
    this.onMessageDelta = null;
    this.onMessageCompleted = null;
    this.onChatCompleted = null;
    this.onDone = null;
    this.onError = null;
  }

  // 发送消息到 Coze AI
  async sendMessage(
    message,
    userId,
    additionalMessages = [],
    conversationId = null
  ) {
    try {
      // 验证消息
      this.validateMessage(message);

      // 构建请求体
      const requestBody = {
        bot_id: this.botId,
        user_id: userId,
        stream: true,
        auto_save_history: true,
        additional_messages: additionalMessages,
      };

      // 如果有会话ID，添加到URL参数
      let url = this.apiUrl;
      if (conversationId) {
        url += `?conversation_id=${conversationId}`;
      }

      console.log("发送消息到 Coze API:", {
        url,
        requestBody: JSON.stringify(requestBody, null, 2),
      });

      // 发起请求
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(
          `API 请求失败: ${response.status} ${response.statusText}`
        );
      }

      // 处理流式响应
      await this.processStreamResponse(response);
    } catch (error) {
      console.error("发送消息失败:", error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  // 处理流式响应
  async processStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码数据
        buffer += decoder.decode(value, { stream: true });

        // 按行处理数据
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 保留最后一行（可能不完整）

        for (const line of lines) {
          if (line.trim()) {
            this.processStreamLine(line.trim());
          }
        }
      }

      // 处理剩余的缓冲区
      if (buffer.trim()) {
        this.processStreamLine(buffer.trim());
      }
    } catch (error) {
      console.error("处理流式响应失败:", error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  // 处理单行流式数据
  processStreamLine(line) {
    try {
      // 解析 SSE 格式
      if (line.startsWith("event:")) {
        this.currentEvent = line.substring(6).trim();
        return;
      }

      if (line.startsWith("data:")) {
        const dataStr = line.substring(5).trim();

        // 详细调试数据内容
        console.log(
          "aiService: 处理data行，原始dataStr:",
          JSON.stringify(dataStr)
        );

        // 跳过特殊数据
        if (dataStr === "[DONE]") {
          console.log("aiService: 检测到[DONE]信号，准备调用onDone回调");
          console.log("aiService: onDone回调是否存在:", !!this.onDone);
          if (this.onDone) {
            console.log("aiService: 开始调用onDone回调");
            this.onDone();
            console.log("aiService: onDone回调调用完成");
          } else {
            console.warn("aiService: onDone回调未设置!");
          }
          return;
        }

        // 解析 JSON 数据
        let data;
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          console.warn("无法解析 JSON 数据:", dataStr);
          return;
        }

        // 根据事件类型处理数据
        this.handleStreamEvent(this.currentEvent, data);
      }
    } catch (error) {
      console.error("处理流式数据行失败:", error, line);
    }
  }

  // 处理流式事件
  handleStreamEvent(event, data) {
    console.log("收到流式事件:", event, data);

    switch (event) {
      case "conversation.chat.created":
        if (this.onChatCreated) {
          this.onChatCreated(data);
        }
        break;

      case "conversation.chat.in_progress":
        // 对话处理中，暂时不需要特殊处理
        break;

      case "conversation.message.delta":
        if (data.type === "answer" && this.onMessageDelta) {
          this.onMessageDelta(data);
        }
        break;

      case "conversation.message.completed":
        if (data.type === "verbose" && this.onMessageCompleted) {
          this.onMessageCompleted(data);
        }
        break;

      case "conversation.chat.completed":
        if (this.onChatCompleted) {
          this.onChatCompleted(data);
        }
        break;

      case "conversation.chat.failed":
        if (this.onError) {
          this.onError(new Error(`对话失败: ${data.msg || "未知错误"}`));
        }
        break;

      case "error":
        if (this.onError) {
          this.onError(new Error(`流式响应错误: ${data.msg || "未知错误"}`));
        }
        break;

      case "done":
        console.log(
          "aiService: 在handleStreamEvent中检测到done事件，data:",
          data
        );
        if (
          data === "[DONE]" ||
          (typeof data === "string" && data.includes("DONE"))
        ) {
          console.log("aiService: 通过handleStreamEvent处理DONE信号");
          if (this.onDone) {
            console.log("aiService: 开始调用onDone回调(via handleStreamEvent)");
            this.onDone();
            console.log("aiService: onDone回调调用完成(via handleStreamEvent)");
          } else {
            console.warn("aiService: onDone回调未设置!(via handleStreamEvent)");
          }
        }
        break;

      default:
        console.log("未处理的事件类型:", event, data);
        break;
    }
  }

  // 设置事件处理器
  setEventHandlers(handlers) {
    console.log(
      "aiService: 设置事件处理器，onDone函数类型:",
      typeof handlers.onDone
    );
    this.onChatCreated = handlers.onChatCreated;
    this.onMessageDelta = handlers.onMessageDelta;
    this.onMessageCompleted = handlers.onMessageCompleted;
    this.onChatCompleted = handlers.onChatCompleted;
    this.onDone = handlers.onDone;
    this.onError = handlers.onError;
    console.log("aiService: 事件处理器设置完成，this.onDone:", !!this.onDone);
  }

  // 验证消息 (检查内容、长度等)
  validateMessage(message) {
    if (!message || typeof message !== "string") {
      throw new Error("消息内容不能为空");
    }

    if (message.trim().length === 0) {
      throw new Error("消息内容不能为空");
    }

    if (message.length > 1000) {
      throw new Error("消息内容过长，请控制在1000字符以内");
    }

    return true;
  }

  // 生成对话ID
  generateConversationId() {
    return "conv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // 格式化消息历史
  formatMessageHistory(messages) {
    return messages.map((msg) => ({
      role: msg.role || (msg.isUser ? "user" : "assistant"),
      type: msg.type || (msg.isUser ? "question" : "answer"),
      content_type: msg.content_type || "text",
      content: msg.content || msg.message,
      timestamp: msg.timestamp,
    }));
  }
}

// 创建全局实例
export const aiService = new AIService();

// 消息类型枚举
export const MessageType = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
};

// AI状态枚举
export const AIStatus = {
  IDLE: "idle",
  THINKING: "thinking",
  RESPONDING: "responding",
  ERROR: "error",
};
