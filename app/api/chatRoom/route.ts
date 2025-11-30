// app/api/chatRoom/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// 輔助函式：呼叫 Gemini API
async function callGemini(prompt: string, systemInstruction: string = "") {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    // 如果需要更強的 system prompt，可在此加入，或是直接寫在 prompt 內
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Gemini API Error");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { characterName, characterId, message } = body;

    if (!characterName || !characterId || !message) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 0. 準備檔案路徑與讀取現有內容
    const fileName = `${characterName}_${characterId}.txt`;
    const filePath = path.join(process.cwd(), "data", fileName);

    let currentContent = "";
    try {
      currentContent = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      // 如果檔案不存在，視為空角色，或是建立新檔
      console.warn("File not found, creating new context.");
      currentContent = `角色名稱：${characterName}`;
    }

    // ==========================================
    // STEP 1: 判斷意圖 (是設定屬性還是聊天?)
    // ==========================================
    const classifyPrompt = `
    訊息：「${message}」

    請判斷以上訊息內容是否為「人物角色屬性敘述、背景設定修改或添加」，請回答 yes or no。`;
    // (例如：「他喜歡吃蘋果」、「他的個性很冷酷」是 yes。「你好嗎」、「講個笑話」是 no)`;

    const classifyResult = await callGemini(classifyPrompt);
    const isSettingUpdate = classifyResult.toLowerCase().includes("yes");

    console.log(`User Message: ${message} | Is Update: ${isSettingUpdate}`);

    let reply = "";
    let systemMessage = ""; // 用於前端顯示特殊狀態

    if (isSettingUpdate) {
      // ==========================================
      // STEP 2-A (YES): 更新角色文件
      // ==========================================
      const updatePrompt = `
      你是一個專業的角色設定師。

      【現有角色文件】：
      ${currentContent}

      【使用者的新增/修改指令】：
      ${message}

      【文件範例】：
      xxx 角色資訊
      喜好：
      - 吃蘋果
      - 騎重機
      - ...

      討厭：
      - 環境髒亂
      - 亂丟垃圾
      - ...

      生日：2000/02/25

      工作單位：台積電設備工程師
      ... (依此類推)

      請將使用者的指令與現有文件融合，生成一份「更新後、條理分明」的角色設定文字檔內容。
      請依照文件範例生成角色資訊。
      請保留舊有的重要資訊，並自然地加入新設定。
      直接輸出新的文件內容即可，不要有多餘的對話。
      `;

      const newContent = await callGemini(updatePrompt);

      // 寫入檔案更新
      await fs.writeFile(filePath, newContent, "utf-8");

      reply = `(系統提示：已更新 ${characterName} 的角色設定)`;
      systemMessage = "Character Updated";

    } else {
      // ==========================================
      // STEP 2-B (NO): 一般聊天回覆
      // ==========================================
      const chatPrompt = `
      請扮演以下角色與使用者對話。

      【角色設定】：
      ${currentContent}

      【使用者訊息】：
      ${message}

      請根據角色設定的內容提供使用者問題建議。
      `;

      reply = await callGemini(chatPrompt);
    }

    return NextResponse.json({
      reply,
      isUpdate: isSettingUpdate,
      systemMessage
    });

  } catch (error: any) {
    console.error("ChatRoom API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}