# 🎙️ 日語回音法（Echo Method）自主訓練工具 PRO 旗艦版

> 實踐台大外文系 **史嘉琳教授（Prof. Karen Chung）** 所倡導的「回音法（Echo Method）」核心理念：  
> **「聽 ➔ 停 (留白 2s) ➔ 摹 (開口模仿) ➔ 查 (對照文字) ➔ 比 (雙音對比)」**  
> 純前端零依賴、支援離線 PWA、可在 iPhone Safari 與 Android Chrome 加入主畫面作為獨立 App 使用。

---

## ✨ 核心特色與升級重點

1. **📊 HTML5 Canvas 互動式音波圖（Waveform）**
   - 視覺化顯示音訊能量起伏與斷句切點，支援點擊波形快速跳轉。
   - 雙向靈敏度滑桿（靜音能量閾值與換氣秒數），隨時依不同教材音檔雜音微調並一鍵重新斷句。

2. **⏱️ 回音法五步嚴謹狀態機（FSM）**
   - **STEP 1 聽**：遮蔽文字干擾，耳朵專注捕捉語調高低（Pitch Accent）與長短音。
   - **STEP 2 停**：強制留白 2 秒，環形倒數計時，喚醒大腦聽覺殘影（Echoic Memory）。
   - **STEP 3 摹**：麥克風自動啟動錄音，動態顯示收音音量波紋與倒數。
   - **STEP 4 查**：自動展開日語漢字、振假名（Furigana）與中文翻譯校對。
   - **STEP 5 比**：支援「聽原音」、「聽己音」以及「原音 ➔ 己音連續對比」，即刻察覺音調落差。

3. **🏷️ 智慧振假名語法（Furigana Helper）**
   - 告別繁瑣手打 `<ruby>` 標籤！直接輸入 `初[はじ]めまして` 或 `私(わたし)`，自動即時轉為標準振假名。

4. **✂️ 靈活段落微調**
   - 支援頭尾時間「$\pm0.1\text{s}$ 精確微調」、相鄰段落「一鍵合併（🔗）」以及太長句子「一鍵拆分（✂ Split）」。

5. **💾 本機自動快取與多元匯出**
   - 內建 LocalStorage 隨打隨存，重整不遺失。
   - 支援標準 JSON 匯出/匯入（完全向下相容手冊格式），並擴充支援 **Anki 單字卡 TSV 匯出**。

---

## 🚀 部署至 GitHub Pages 教學（免費個人 App）

本專案為純靜態網頁（Vanilla HTML/CSS/JS），無需任何 Node.js 建置步驟，可直接透過 GitHub Pages 免費託管：

### 步驟 1：建立 GitHub 儲存庫
1. 登入 [GitHub.com](https://github.com/)。
2. 點擊右上角的 **「+」** ➔ 選擇 **「New repository」**。
3. 在 **Repository name** 輸入名稱（例如：`echo-trainer` 或 `japanese-echo`）。
4. 設定為 **Public**（公開），點擊 **「Create repository」**。

### 步驟 2：上傳檔案
1. 在新建立的儲存庫頁面中，點擊 **「uploading an existing file」**（或拖曳上傳）。
2. 將本資料夾中以下所有檔案與資料夾拖曳至網頁中：
   - `index.html`
   - `css/` 資料夾（含 `style.css`）
   - `js/` 資料夾（含所有 `.js` 模組）
   - `manifest.json`
   - `sw.js`
   - `icon.jpg`
   - `sample_audio.wav`、`sample_data.json`（選填，展示用）
3. 滾動至頁面底部，點擊綠色的 **「Commit changes」**。

### 步驟 3：開啟 GitHub Pages 服務
1. 進入儲存庫上方的 **「Settings」** 分頁。
2. 在左側選單點擊 **「Pages」**。
3. 在 **Build and deployment** 下方的 **Branch**：
   - 將 `None` 改選為 **`main`**（或 `master`），資料夾保持 `/ (root)`。
   - 點擊 **「Save」** 儲存。

### 步驟 4：取得專屬網址與安裝到手機
約 1~2 分鐘後重新整理 Pages 頁面，頂部會出現您的專屬 HTTPS 網址：  
👉 `https://<您的GitHub帳號>.github.io/echo-trainer/`

- **iPhone (iOS Safari)**：
  開啟該網址 ➔ 點擊底部「分享」按鈕 ➔ 選擇 **「加入主畫面」**。
- **Android (Chrome)**：
  開啟該網址 ➔ 點擊右上角「⋮」選單 ➔ 選擇 **「加到主畫面」** 或 **「安裝應用程式」**。

加入後即成為具備離線運行能力的專屬獨立 App，隨時隨地開啟練習！

---

## ⌨️ 電腦端鍵盤快捷鍵

| 快捷鍵 | 功能說明 |
| :--- | :--- |
| `Space` (空白鍵) | 開始訓練 / 暫停訓練 / 自主步調模式下前進下一步 |
| `R` | 重新練習當前句子 |
| `←` / `→` (方向鍵) | 切換至上一句 / 下一句 |
| `1` | 聆聽當前句子母語原音 |
| `2` | 聆聽剛才自己的錄音 |
| `3` | 連續播放對比（母語原音 ➔ 停頓 ➔ 己音） |

---

## 📄 授權條款
MIT License - 歡迎自由使用、修改與推廣回音學習法！
