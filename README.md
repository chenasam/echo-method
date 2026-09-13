# 回音法 (Echo Method) 語言學習 Web 應用程式 🚀

> 史嘉琳教授 (Prof. Karen Chung) 「回音法 (Echo Method)」理論實踐版，支援 **英文版 (English Edition)** 與 **日文版 (Japanese Edition)** 雙語系特訓。

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![HTML5](https://img.shields.io/badge/HTML5-WebAudio-orange.svg)

---

## ✨ 核心特色 (Key Features)

- 🎧 **史嘉琳教授 4 步驟自動化流程引擎**：
  1. **Listen 仔細聽**：聆聽母語者原音發音細節。
  2. **Echo 心裡迴音**：自動留白與脈衝腦波動畫，在腦海重現「心裡迴音 (Mental Echo)」。
  3. **Speak 模仿錄音**：開啟麥克風大聲模仿朗讀。
  4. **Compare 雙軌比對**：原音與我的錄音平行雙軌對比與星級自評。
- 🇯🇵 **日語 Pitch Accent 高低音調專屬特訓**：
  - 支援頭高型①、平板型⓪、中高型、尾高型高低音型剖析。
  - 促音 (小っ) 留白拍子與假名 (Kana) / 羅馬字 (Romaji) 雙顯示。
- 🙈 **聽力防雷字幕遮罩 (Blur Subtitle Mask)**：隱藏字幕強迫練習純聽覺耳力。
- 📊 **打卡連勝與練習紀錄 (Streak Tracker)**：LocalStorage 自動統計連續練習天數。
- 📝 **自訂句子匯入**：可自訂輸入任何電影對白或簡報句子進行特訓。

---

## 📂 專案檔案結構 (Project Structure)

```text
回音法/
├── index.html            # 🇬🇧 英文版主頁面 (English Main Page)
├── index_ja.html         # 🇯🇵 日文版主頁面 (Japanese Main Page)
├── styles.css            # Modern Glassmorphism 樣式系統
└── js/
    ├── app.js            # 英文版主邏輯
    ├── app-ja.js         # 日文版主邏輯
    ├── audio-engine.js   # Web Audio API / TTS 發音與波形視覺化
    ├── recorder.js       # MediaRecorder API 錄音與雙軌播放
    ├── lessons-data.js   # 英文連音與語調教材庫
    ├── lessons-data-ja.js# 日文 Pitch Accent 與敬語教材庫
    └── storage.js        # LocalStorage 連勝天數與紀錄管理
```

---

## 🌐 如何發佈到 GitHub Pages 免費線上運作

1. 將本 Repository 設定檔 push 至 GitHub。
2. 進入 GitHub 專案頁面的 `Settings` -> `Pages`。
3. Source 選擇 `Deploy from a branch`，Branch 選擇 `main` / `/root` 並點選 `Save`。
4. 稍等 1~2 分鐘即可存取專案網址！

---

## 📜 授權協議 (License)

MIT License © 2026 Echo Method Web App
