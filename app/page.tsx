'use client';

import React, { useEffect, useState } from 'react';

const Home = () => {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function fetchHello() {
      try {
        // 使用相對路徑即可，Next.js 會自動處理
        const response = await fetch('/api/hello');

        if (!response.ok) {
          throw new Error('Failed to fetch API data');
        }

        const data = await response.json();
        // data 的內容將是 { message: "Hello from TypeScript API" }
        setMessage(data.message);

      } catch (error) {
        console.error("Fetch error:", error);
        setMessage('Error fetching data.');
      }
    }

    fetchHello();
  }, []);

  return (
    <>
      <div className="text-2xl">Home</div>
      <h1>API 訊息:</h1>
      <p>**{message}**</p>
    </>
  );
};

export default Home;