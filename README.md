# 人生の社交教練 (Life Social Coach)

這是一個基於 Next.js 開發的 AI 助手，專為解決「訊息焦慮」而生。無論是面對曖昧對象的句點、上司的交辦，或是難以捉摸的社交場合，本系統能根據你提供的個性設定與對話背景，產出最合適的回應建議。

## 💡 問題 & 目的

**當前困境**：
在數位社交時代，許多人因為不知道如何回覆訊息而焦慮。我們常看到網友在論壇上貼出對話截圖（如：曖昧對象的冷淡回覆、另一半的抱怨、上司的壓力文字）尋求協助。這種「不知道怎麼回」的恐懼，反而成為了建立關係的阻礙。

**專案核心**：
「人生社交教練」讓你不再單打獨鬥。你可以隨時輸入或調整對象的**喜好、雷區、個性、生活習慣**等參數。AI 系統會整合這些細節，模擬最理想的應對口吻，提供你兼具情商（EQ）與效率的對話選項，無負擔地建立良好社交關係。

---

## 🛠 Tech Stack (技術棧)

* **Framework**: Next.js 14/15
* **AI Model**: Google Gemini Pro API
* **Styling**: Tailwind CSS
* **Language**: TypeScript / JavaScript

---

## 🚀 Getting Started (快速開始)

請按照以下步驟在本地端運行此專案：

### 1. 環境需求
* 安裝 [Node.js](https://nodejs.org/) (建議版本 v18.17 或以上)
* 準備一個 [Google AI Studio](https://aistudio.google.com/) 的 API Key

### 2. 下載並安裝
```bash
# 複製專案
git clone https://github.com/IOUKI/Life-Social-Coach.git

# 進入專案資料夾
cd Life-Social-Coach

# 安裝相應套件
npm install
```

### 3. 環境變數設定
```bash
GEMINI_API_KEY="你的_AISTUDIO_API_KEY"
```

### 4. 啟動開發伺服器
```bash
npm run dev
```
啟動後，開啟瀏覽器造訪 http://localhost:3000 即可開始使用。

## 📖 使用指南
設定對象資訊：在後台輸入對象的關鍵字（例如：巨蟹座、不喜歡被已讀不回、很注重工作效率）。  
上傳對話情境：貼上你想回覆的那段文字。

## 📄 授權與宣告
本專案僅供學習與社交輔助參考，請保持真誠的溝通，AI 建議僅供輔助之用。