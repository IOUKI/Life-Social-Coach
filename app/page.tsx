'use client';

import React, { useEffect, useState } from 'react';

// 定義角色資料介面
interface Character {
  fileName: string;
  name: string;
  id: string;
  content: string;
  createdAt?: string;
}

const Home = () => {
  // --- State 定義 ---
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  // 新增表單 State
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');

  // 搜尋 State
  const [searchTerm, setSearchTerm] = useState('');

  // --- API 函式 ---

  // 1. 取得角色列表 (GET)
  const fetchCharacters = async (queryName = '') => {
    setLoading(true);
    try {
      // 組合 API URL，如果有搜尋字串就帶入參數
      const url = queryName
        ? `/api/characterInfo?name=${encodeURIComponent(queryName)}`
        : '/api/characterInfo';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setCharacters(data.characters || []);
    } catch (error) {
      console.error("Fetch error:", error);
      alert('讀取列表失敗');
    } finally {
      setLoading(false);
    }
  };

  // 2. 新增角色 (POST)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); // 防止表單重新整理
    if (!newName.trim()) return alert('請輸入角色名稱');

    try {
      const response = await fetch('/api/characterInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: newName,
          content: newContent
        })
      });

      if (!response.ok) throw new Error('Create failed');

      // 成功後清空輸入框並重新讀取列表
      setNewName('');
      setNewContent('');
      fetchCharacters(searchTerm); // 保持目前的搜尋狀態重新整理
      alert('新增成功！');

    } catch (error) {
      console.error("Create error:", error);
      alert('新增失敗');
    }
  };

  // 3. 刪除角色 (DELETE)
  const handleDelete = async (fileName: string) => {
    if (!confirm(`確定要刪除檔案 ${fileName} 嗎？`)) return;

    try {
      const response = await fetch(`/api/characterInfo?fileName=${fileName}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      // 刪除後重新讀取列表
      fetchCharacters(searchTerm);

    } catch (error) {
      console.error("Delete error:", error);
      alert('刪除失敗');
    }
  };

  // --- Effects ---

  // 畫面載入時讀取列表
  useEffect(() => {
    fetchCharacters();
  }, []);

  // 當搜尋關鍵字改變時，延遲搜尋 (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCharacters(searchTerm);
    }, 500); // 0.5秒後執行搜尋，避免打字時頻繁呼叫 API

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- Render ---

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-black">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">角色資料管理系統</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* 左側：新增表單 */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">新增角色</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色名稱</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="例如: HeroAlvin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">詳細介紹 (Content)</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="輸入角色背景故事..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              儲存檔案 (POST)
            </button>
          </form>
        </div>

        {/* 右側：列表與搜尋 */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-3 text-green-600">搜尋列表</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="輸入名稱搜尋..."
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : characters.length === 0 ? (
              <p className="text-center text-gray-400 py-8">目前沒有資料 (或是資料夾尚未建立)</p>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-green-500 relative group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{char.name}</h3>
                      <p className="text-xs text-gray-400 mb-2">ID: {char.id}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(char.fileName)}
                      className="text-red-500 hover:text-red-700 text-sm border border-red-200 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                  <div className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded mt-2">
                    {char.content || "(無內容)"}
                  </div>
                  <div className="text-xs text-gray-300 mt-2 text-right">
                    File: {char.fileName}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;