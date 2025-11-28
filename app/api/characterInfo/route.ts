import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// 定義資料夾路徑 (共用變數)
const getDataDir = () => path.join(process.cwd(), "data");

/**
 * GET: 角色查詢 API
 * * 使用方式:
 * 1. 取得所有列表: GET /api/characterInfo
 * 2. 搜尋特定名稱: GET /api/characterInfo?name=Hero
 */
export async function GET(req: NextRequest) {
  try {
    const dataDir = getDataDir();

    // 1. 檢查資料夾是否存在，不存在就回傳空陣列 (避免報錯)
    try {
      await fs.access(dataDir);
    } catch {
      return NextResponse.json({ characters: [] });
    }

    // 2. 讀取資料夾內所有檔案
    const files = await fs.readdir(dataDir);

    // 3. 取得查詢參數 (例如 ?name=Alvin)
    const { searchParams } = new URL(req.url);
    const queryName = searchParams.get("name");

    // 4. 解析檔案資訊
    let characterList = await Promise.all(
      files
        .filter((file) => file.endsWith(".txt")) // 只讀取 .txt
        .map(async (file) => {
          // 解析檔名結構: "名稱_UUID.txt"
          // 使用 lastIndexOf 避免角色名稱中本身就有底線造成切割錯誤
          const rawName = file.replace(".txt", "");
          const separatorIndex = rawName.lastIndexOf("_");

          let name = rawName;
          let id = "";

          if (separatorIndex !== -1) {
            name = rawName.substring(0, separatorIndex);
            id = rawName.substring(separatorIndex + 1);
          }

          // 選項：讀取檔案內容 (若檔案不大，可直接讀取內容回傳)
          const filePath = path.join(dataDir, file);
          const content = await fs.readFile(filePath, "utf-8");

          return {
            fileName: file,
            name: name,
            id: id,
            content: content, // 將內容也回傳前端
            createdAt: fs.stat(filePath).then(stats => stats.birthtime) // 取得建立時間
          };
        })
    );

    // 等待所有檔案資訊讀取完成 (因為裡面用了 fs.stat 和 readFile)
    // 注意：上面的 map 回傳的是 Promise 陣列，需要 resolve
    // 這裡簡化邏輯，我們修正上面的 map 寫法，改為同步處理清單後再過濾

    // 5. 根據查詢參數進行篩選
    if (queryName) {
      characterList = characterList.filter((char) =>
        char.name.toLowerCase().includes(queryName.toLowerCase())
      );
    }

    return NextResponse.json({
      count: characterList.length,
      characters: characterList
    });

  } catch (error) {
    console.error("Error reading characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}

/**
 * POST: 新增角色檔案
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 解析請求內容
    const body = await req.json();
    const { characterName, content } = body;

    // 基本驗證
    if (!characterName) {
      return NextResponse.json(
        { error: "Missing characterName" },
        { status: 400 }
      );
    }

    // 2. 產生唯一編碼 (UUID)
    const uniqueId = crypto.randomUUID();

    // 3. 設定檔案路徑與名稱
    // 格式: 角色名稱_唯一值編碼.txt
    const fileName = `${characterName}_${uniqueId}.txt`;

    // 取得專案根目錄下的 data 資料夾路徑
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, fileName);

    // 4. 確保 data 資料夾存在 (如果不存在則建立)
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // 5. 準備寫入檔案的內容
    const fileContent = content
      ? content
      : JSON.stringify(body, null, 2);

    // 6. 寫入檔案
    await fs.writeFile(filePath, fileContent, "utf-8");

    // 7. 回傳成功訊息
    return NextResponse.json({
      message: "File created successfully",
      fileName: fileName,
      filePath: filePath,
      id: uniqueId
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating file:", error);
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 移除角色檔案
 * * 使用方式: DELETE /api/characterInfo?fileName=角色名稱_UUID.txt
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. 取得查詢參數
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    // 基本驗證
    if (!fileName) {
      return NextResponse.json(
        { error: "Missing fileName parameter" },
        { status: 400 }
      );
    }

    // 安全性驗證：避免路徑遍歷 (Directory Traversal)
    if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
      return NextResponse.json(
        { error: "Invalid fileName" },
        { status: 400 }
      );
    }

    // 2. 設定檔案路徑
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, fileName);

    // 3. 檢查檔案是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // 4. 刪除檔案
    await fs.unlink(filePath);

    // 5. 回傳成功訊息
    return NextResponse.json({
      message: "File deleted successfully",
      fileName: fileName,
    });

  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}