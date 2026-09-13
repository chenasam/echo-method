/**
 * 回音法 (Echo Method) 學習進度與 LocalStorage 資料管理
 */

const STORAGE_KEYS = {
  STREAK: 'echo_streak_data',
  HISTORY: 'echo_practice_history',
  SETTINGS: 'echo_user_settings'
};

export const StorageManager = {
  // 取得學習紀錄與連勝天數
  getStreakData() {
    const defaultData = {
      currentStreak: 1,
      totalPracticedCount: 0,
      totalDurationMinutes: 0,
      lastPracticedDate: null,
      completedLessonIds: []
    };
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STREAK);
      return data ? JSON.parse(data) : defaultData;
    } catch (e) {
      console.warn('LocalStorage error:', e);
      return defaultData;
    }
  },

  // 紀錄一次完成的迴音練習
  recordPractice(lessonId, rating, userAudioBlob = null) {
    const streakData = this.getStreakData();
    const today = new Date().toISOString().split('T')[0];

    // 更新連勝與次數
    if (streakData.lastPracticedDate !== today) {
      if (streakData.lastPracticedDate) {
        const last = new Date(streakData.lastPracticedDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streakData.currentStreak += 1;
        } else if (diffDays > 1) {
          streakData.currentStreak = 1;
        }
      }
      streakData.lastPracticedDate = today;
    }

    streakData.totalPracticedCount += 1;
    if (!streakData.completedLessonIds.includes(lessonId)) {
      streakData.completedLessonIds.push(lessonId);
    }

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData));

    // 寫入詳細練習歷史
    this.addHistoryLog({
      id: 'h-' + Date.now(),
      lessonId,
      timestamp: new Date().toISOString(),
      rating: rating || 4,
      dateStr: new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    return streakData;
  },

  getHistoryLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addHistoryLog(logItem) {
    const history = this.getHistoryLogs();
    history.unshift(logItem);
    // 保持最多 50 筆紀錄
    if (history.length > 50) history.pop();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  getSettings() {
    const defaultSettings = {
      echoPauseMultiplier: 1.0, // 留白時間倍率 (預設為音訊長度之 1 倍)
      autoRecord: true,         // 心裡迴音結束後自動開啟麥克風錄音
      showSubtitles: false,     // 預設遮罩/隱藏字幕，考驗聽力
      playbackRate: 1.0,        // 播放速度
      voiceLang: 'en-US'        // 語音語言
    };
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
};
