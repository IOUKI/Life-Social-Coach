'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, User, Trash2, Plus, MessageSquare, Settings, ArrowLeft } from 'lucide-react';

// --- 引入 Markdown 渲染庫 ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; 
import rehypeRaw from 'rehype-raw'; 
import { Components, CodeProps } from 'react-markdown'; // 引入 Components 型別

// --- 型別定義 ---
interface Character {
  fileName: string;
  name: string;
  id: string;
  createdAt?: string;
}

interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

// 模擬每個角色的本地聊天紀錄 Key
const getStorageKey = (charId: string): string => `chat_history_${charId}`;

// --- Markdown 元件的客製化樣式 (使用 Components 型別) ---
const markdownComponents: Components = {
  // 段落樣式調整，確保文本換行正常
  p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>, 
  // 清單樣式調整
  ul: ({ children }) => <ul className="list-disc list-inside ml-4 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside ml-4 my-2">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  // 程式碼區塊樣式調整
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    // 針對程式碼區塊 (非行內)
    if (!inline && match) {
      return (
        <pre className="bg-gray-800 p-3 rounded-lg text-xs overflow-x-auto my-2 text-white">
          <code className={`language-${match[1]}`} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    // 針對行內程式碼
    return (
      <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-xs md:text-sm" {...props}>
        {children}
      </code>
    );
  },
  // 連結樣式
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">{children}</a>,
  // 標題樣式
  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
  // 表格樣式
  table: ({ children }) => <table className="min-w-full divide-y divide-gray-200 my-2 border border-gray-200 rounded-lg overflow-hidden">{children}</table>,
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">{children}</th>,
  td: ({ children }) => <td className="px-3 py-1.5 whitespace-pre-wrap text-sm text-gray-700 border-b border-gray-200">{children}</td>,
};


export default function Home() {
  // --- Global State ---
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // --- Sidebar State ---
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- API Methods (Management) ---

  const fetchCharacters = useCallback(async (queryName: string = '') => {
    setLoadingList(true);
    try {
      const url = queryName
        ? `/api/characterInfo?name=${encodeURIComponent(queryName)}`
        : '/api/characterInfo';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data: { characters: Character[] } = await response.json();
      setCharacters(data.characters || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const response = await fetch('/api/characterInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: newName })
      });
      if (!response.ok) throw new Error('Create failed');

      setNewName('');
      setIsCreating(false);
      fetchCharacters(searchTerm);
    } catch (error) {
      alert('新增失敗');
    }
  };

  const handleDelete = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation(); // 避免觸發選取
    if (!confirm(`確定要刪除 ${fileName} 嗎？`)) return;
    try {
      const response = await fetch(`/api/characterInfo?fileName=${fileName}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');

      // 如果刪除的是當前選取的角色，清空選取
      if (selectedChar?.fileName === fileName) {
        setSelectedChar(null);
      }
      fetchCharacters(searchTerm);
    } catch (error) {
      alert('刪除失敗');
    }
  };

  // --- Chat Logic ---

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMsg.trim() || !selectedChar || isSending) return;

    const currentMsg: string = inputMsg;
    setInputMsg(''); // 立即清空輸入框
    setIsSending(true);

    // 1. 加入使用者訊息
    const newUserMessage: ChatMessage = { role: 'user', content: currentMsg, timestamp: Date.now() };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // 2. 呼叫 Chat API
      const response = await fetch('/api/chatRoom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: selectedChar.name,
          characterId: selectedChar.id,
          message: currentMsg
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data: { reply: string, isUpdate?: boolean } = await response.json();

      // 3. 處理回應
      const replyMsg: ChatMessage = {
        role: data.isUpdate ? 'system' : 'ai', // 如果是更新設定，標記為系統訊息
        content: data.reply,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, replyMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: '錯誤：無法連接到角色大腦 (API Error)',
        timestamp: Date.now()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCharacters(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchCharacters]);

  // 切換角色時，讀取本地紀錄
  useEffect(() => {
    if (selectedChar) {
      const saved = localStorage.getItem(getStorageKey(selectedChar.id));
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        // 使用 Markdown 格式初始化訊息
        setMessages([{
          role: 'ai',
          content: `你好，我是 **${selectedChar.name}** 社交建議教練。

我可以幫助你：
* **分析對話**
* **提供建議**
* **調整個性** (例如：輸入 '設定他更熱情')

試著跟我聊聊吧！`,
          timestamp: Date.now()
        }]);
      }
    } else {
        setMessages([]); // 清空訊息
    }
  }, [selectedChar]);

  // 訊息更新時存回 LocalStorage 並滾動
  useEffect(() => {
    if (selectedChar && messages.length > 0) {
      localStorage.setItem(getStorageKey(selectedChar.id), JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, selectedChar]);

  // --- Render ---

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">

      {/* ================= 左側：角色列表 (Sidebar) ================= */}
      <div className={`
        flex-col w-full md:w-80 bg-white border-r border-gray-200 shadow-lg z-10 transition-transform duration-300
        ${selectedChar ? 'hidden md:flex' : 'flex'} 
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-700 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            角色列表
          </h1>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
            title="新增角色"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Create Area */}
        <div className="p-4 space-y-4">
          {isCreating && (
            <form onSubmit={handleCreate} className="flex gap-2 animate-fade-in">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="輸入角色名稱..."
                className="flex-1 p-2 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
              <button type="submit" className="bg-blue-600 text-white px-3 rounded text-sm hover:bg-blue-700">OK</button>
            </form>
          )}

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜尋角色..."
              className="w-full p-2 pl-3 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-gray-300 outline-none"
            />
          </div>
        </div>

        {/* Character List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loadingList ? (
            <div className="text-center text-gray-400 mt-10">載入中...</div>
          ) : characters.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">暫無角色，請點擊上方 + 新增</div>
          ) : (
            characters.map(char => (
              <div
                key={char.id}
                onClick={() => setSelectedChar(char)}
                className={`
                  group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                  ${selectedChar?.id === char.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' : 'hover:bg-gray-50 border border-transparent'}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
                    ${selectedChar?.id === char.id ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-gray-400'}
                  `}>
                    {char.name.slice(0, 1)}
                  </div>
                  <div className="truncate">
                    <h3 className={`font-medium truncate ${selectedChar?.id === char.id ? 'text-blue-700' : 'text-gray-700'}`}>
                      {char.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">ID: {char.id.slice(0, 6)}...</p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(e, char.fileName)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="刪除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= 右側：聊天視窗 (Main) ================= */}
      <div className={`
        flex-1 flex flex-col bg-white md:bg-gray-50
        ${selectedChar ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedChar ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-200 bg-white flex items-center px-4 justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChar(null)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {selectedChar.name}
                    <span className="text-xs font-normal text-green-500 px-2 py-0.5 bg-green-50 rounded-full border border-green-200">Online</span>
                  </h2>
                  <p className="text-xs text-gray-400 hidden md:block">您可以直接對話，或輸入「設定他喜歡...」來修改設定</p>
                </div>
              </div>
              <div className="text-gray-400">
                <Settings className="w-5 h-5 hover:text-gray-600 cursor-pointer" />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isSystem = msg.role === 'system';

                if (isSystem) {
                  return (
                    <div key={idx} className="flex justify-center my-4">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full border border-yellow-200 shadow-sm">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[80%] md:max-w-[70%] p-3 rounded-2xl shadow-sm relative text-sm md:text-base leading-relaxed
                      ${isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}
                    `}>
                      {isUser ? (
                        // 使用者訊息: 仍然是純文字
                        // 注意：如果用戶輸入的內容也需要渲染 Markdown，可以將這裡也替換為 <ReactMarkdown>
                        msg.content
                      ) : (
                        // AI 訊息: 使用 ReactMarkdown 渲染
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={markdownComponents}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                      
                      <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isSending && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-gray-200 text-gray-500 text-xs px-4 py-2 rounded-full rounded-tl-none">
                    {selectedChar.name} 正在思考...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex gap-2 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={`傳送訊息給 ${selectedChar.name}...`}
                  className="flex-1 p-3 bg-gray-100 border border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMsg.trim()}
                  className={`
                    p-3 rounded-full text-white transition-all transform active:scale-95 flex items-center justify-center w-12 h-12
                    ${isSending || !inputMsg.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}
                  `}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-400">請從左側選擇一位角色開始聊天</p>
          </div>
        )}
      </div>

    </div>
  );
}