import { useState } from 'react';

function App() {
  const [chatText, setChatText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    setChatText('');
    setIsLoading(true);

    const response = await fetch('http://192.168.3.70:9090/chat/sse?prompt=您好，你是？', {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    if (!reader) {
      console.error('SSE reader 不存在');
      return;
    }

    while (true) {
      const { value, done } = await reader.read();
      console.log(value);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data:')) {
          const content = line.replace(/^data:\s*/, '');
          setChatText((prev) => prev + content);
        }
      }

      buffer = lines[lines.length - 1];
    }

    setIsLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🧠 Chat Demo (SSE流式)</h1>
      <button onClick={handleStartChat} disabled={isLoading}>
        {isLoading ? '生成中...' : '开始对话'}
      </button>
      <div style={{
        whiteSpace: 'pre-wrap',
        backgroundColor: '#f4f4f4',
        marginTop: '1rem',
        padding: '1rem',
        borderRadius: '8px',
        minHeight: '120px',
        color: '#f00'
      }}>
        {chatText}
      </div>
    </div>
  );
}

export default App;
