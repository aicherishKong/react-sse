import { useState } from "react";

function App() {
  const [chatText, setChatText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    setChatText("");
    setIsLoading(true);
    console.log('开始请求SSE...');

    try {
      const response = await fetch(
        "http://192.168.3.70:9090/chat/sse?prompt=您好，你是？",
        {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
          },
        }
      );
      
      console.log('响应状态:', response.status);
      console.log('响应头:', response.headers.get('content-type'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (!reader) {
        console.error("SSE reader 不存在");
        setIsLoading(false);
        return;
      }

      console.log('开始读取SSE流...');
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('SSE流读取完成');
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        console.log('接收到的chunk (原始):', JSON.stringify(chunk));
        console.log('当前buffer (原始):', JSON.stringify(buffer));
        
        // 处理完整的SSE消息
        let processBuffer = buffer;
        let completeMessages = [];
        
        // 查找完整的消息（以\n\n结尾）
        while (true) {
          const messageEnd = processBuffer.indexOf('\n\n');
          if (messageEnd === -1) break;
          
          const message = processBuffer.substring(0, messageEnd);
          completeMessages.push(message);
          processBuffer = processBuffer.substring(messageEnd + 2);
        }
        
        buffer = processBuffer; // 保留不完整的消息
        console.log('完整消息数量:', completeMessages.length, '剩余buffer:', JSON.stringify(buffer));
        
        for (const message of completeMessages) {
          console.log('处理完整消息:', message);
          const lines = message.split('\n');
          
          for (const line of lines) {
            console.log('处理行:', line);
            
            // 处理可能的重复data:前缀问题
            let processLine = line;
            if (processLine.startsWith('data:data: ')) {
              // 如果是data:data:格式，移除前11个字符
              processLine = 'data: ' + processLine.substring(11);
              console.log('修正重复前缀后的行:', processLine);
            }
            
            if (processLine.startsWith('data: ')) {
              const jsonStr = processLine.substring(6); // 移除 "data: " 前缀
              console.log('JSON字符串:', jsonStr);
              if (jsonStr.trim()) {
                try {
                  const messageObj = JSON.parse(jsonStr);
                  console.log('解析后的对象:', messageObj);
                  const content = messageObj.content || messageObj.message || messageObj.text || '';
                  console.log('提取的内容:', content);
                  if (content) {
                    setChatText(prev => {
                      const newText = prev + content;
                      console.log('更新后的文本:', newText);
                      return newText;
                    });
                  }
                } catch (parseError) {
                  console.warn('JSON解析失败:', parseError);
                  setChatText(prev => prev + jsonStr);
                }
              }
            } else if (processLine.trim()) {
              console.log('非data行:', processLine);
            }
          }
        }
      }
    } catch (error) {
      console.error('请求或读取错误:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setChatText('连接失败: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🧠 Chat Demo (SSE流式，带自定义JSON)</h1>
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
