import { useState } from "react";

function App() {
  const [chatText, setChatText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    setChatText("");
    setIsLoading(true);
    console.log("开始请求SSE...");

    try {
      const response = await fetch("http://192.168.3.70:9090/chat/sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          prompt: "您好，你是？",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("流式响应完成");
          setIsLoading(false);
          break;
        }

        // 解码数据块并添加到缓冲区
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        console.log("接收到数据块:", chunk);

        // 按行分割处理
        const lines = buffer.split("\n");
        // 保留最后一行（可能不完整）
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();

          // 跳过空行
          if (trimmedLine === "") {
            // 空行表示一个SSE事件结束，处理当前事件
            if (currentEvent && currentEvent.data !== undefined) {
              processSSEEvent(currentEvent);
              currentEvent = null;
            }
            continue;
          }

          // 解析 SSE 格式
          if (trimmedLine.startsWith("event:")) {
            const eventType = trimmedLine.substring(6).trim();
            currentEvent = { event: eventType, data: "" };
          } else if (trimmedLine.startsWith("data:")) {
            const data = trimmedLine.substring(5).trim();
            if (currentEvent) {
              currentEvent.data = data;
            } else {
              // 如果没有event，创建默认事件
              currentEvent = { event: "message", data: data };
            }
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim() && currentEvent) {
        processSSEEvent(currentEvent);
      }
    } catch (error) {
      console.error("请求失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setChatText("请求失败: " + errorMessage);
      setIsLoading(false);
    }
  };

  // 处理SSE事件
  const processSSEEvent = (event) => {
    console.log("处理SSE事件:", event);

    if (event.event === "message" && event.data) {
      if (event.data === "[DONE]") {
        console.log("接收到结束信号");
        setIsLoading(false);
        return;
      }

      try {
        // 尝试解析JSON
        const messageObj = JSON.parse(event.data);
        const content =
          messageObj.content ||
          messageObj.message ||
          messageObj.text ||
          event.data;
        updateChatText(content);
      } catch (parseError) {
        // 直接使用原始数据
        updateChatText(event.data);
      }
    }
  };

  // 更新聊天文本
  const updateChatText = (content) => {
    setChatText((prev) => {
      const newText = prev + content;
      console.log("更新文本:", content, "总文本:", newText);
      return newText;
    });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🧠 Chat Demo (POST + fetch + ReadableStream)</h1>
      <button onClick={handleStartChat} disabled={isLoading}>
        {isLoading ? "生成中..." : "开始对话"}
      </button>
      <div
        style={{
          whiteSpace: "pre-wrap",
          backgroundColor: "#f4f4f4",
          marginTop: "1rem",
          padding: "1rem",
          borderRadius: "8px",
          minHeight: "120px",
          color: "#333",
          fontSize: "16px",
          lineHeight: 1.5,
        }}
      >
        {chatText}
      </div>
    </div>
  );
}

export default App;
