/**
 * 回音法 (Echo Method) 主程式應用邏輯 (app.js)
 */

import { PRESET_LESSONS, LESSON_CATEGORIES } from './lessons-data.js';
import { AudioEngine } from './audio-engine.js';
import { VoiceRecorder } from './recorder.js';
import { StorageManager } from './storage.js';

class EchoApp {
  constructor() {
    this.audioEngine = new AudioEngine();
    this.recorder = new VoiceRecorder();
    this.currentLesson = PRESET_LESSONS[0];
    this.lessonsList = [...PRESET_LESSONS];
    this.currentCategory = 'all';

    // 4 步驟狀態: 'IDLE' | 'STEP1_LISTEN' | 'STEP2_ECHO' | 'STEP3_RECORD' | 'STEP4_COMPARE'
    this.workflowState = 'IDLE';
    this.echoTimer = null;
    this.echoRemainingSec = 0;
    this.playbackRate = 1.0;
    this.showSubtitles = false; // 預設遮罩/隱藏字幕，強迫聽力訓練

    this.initElements();
    this.bindEvents();
    this.renderHeaderStats();
    this.renderLessonCards();
    this.loadLesson(this.currentLesson);
  }

  initElements() {
    // DOM Elements
    this.elStep1 = document.getElementById('step-1');
    this.elStep2 = document.getElementById('step-2');
    this.elStep3 = document.getElementById('step-3');
    this.elStep4 = document.getElementById('step-4');

    this.elCanvas = document.getElementById('waveform-canvas');
    this.elEchoCountdown = document.getElementById('echo-countdown');
    this.elEchoStatusText = document.getElementById('echo-status-text');

    this.elTextTitle = document.getElementById('lesson-title');
    this.elTextSentence = document.getElementById('lesson-sentence');
    this.elTextSubMask = document.getElementById('subtitle-mask');
    this.elTextIpa = document.getElementById('lesson-ipa');
    this.elTextTranslation = document.getElementById('lesson-translation');
    this.elTextTips = document.getElementById('lesson-tips');
    this.elHighlightsContainer = document.getElementById('lesson-highlights');

    // Controls
    this.btnStartWorkflow = document.getElementById('btn-start-workflow');
    this.btnPlayOriginal = document.getElementById('btn-play-original');
    this.btnToggleRecord = document.getElementById('btn-toggle-record');
    this.btnPlayRecording = document.getElementById('btn-play-recording');
    this.btnToggleSubtitles = document.getElementById('btn-toggle-subtitles');
    this.speedSelector = document.getElementById('speed-selector');

    // Navigation & Modals
    this.categoryFilters = document.getElementById('category-filters');
    this.lessonsGrid = document.getElementById('lessons-grid');
    this.btnCustomLesson = document.getElementById('btn-custom-lesson');
    this.modalCustom = document.getElementById('modal-custom');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.formCustomLesson = document.getElementById('form-custom-lesson');

    this.btnHistory = document.getElementById('btn-history');
    this.modalHistory = document.getElementById('modal-history');
    this.btnCloseHistory = document.getElementById('btn-close-history');
    this.historyList = document.getElementById('history-list');

    // Ratings
    this.ratingButtons = document.querySelectorAll('.btn-rating');
  }

  bindEvents() {
    // 主按鈕：啟動 4 步驟自動迴音訓練
    this.btnStartWorkflow.addEventListener('click', () => this.startWorkflow());

    // 個別手動按鈕
    this.btnPlayOriginal.addEventListener('click', () => this.playOriginalAudio());
    this.btnToggleRecord.addEventListener('click', () => this.toggleRecording());
    this.btnPlayRecording.addEventListener('click', () => this.recorder.playRecording());
    
    // 字幕遮罩切換
    this.btnToggleSubtitles.addEventListener('click', () => {
      this.showSubtitles = !this.showSubtitles;
      this.updateSubtitleVisibility();
    });

    // 播放速度
    this.speedSelector.addEventListener('change', (e) => {
      this.playbackRate = parseFloat(e.target.value);
    });

    // 選擇/上傳自訂本機音檔 (MP3, WAV, M4A, OGG)
    const audioFileInput = document.getElementById('audio-file-input');
    if (audioFileInput) {
      audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const audio = this.audioEngine.loadCustomAudioFile(file);
          this.hasCustomAudio = true;
          this.customAudioName = file.name;
          
          audio.onloadedmetadata = () => {
            this.setupSegmentPanel();
          };
          setTimeout(() => this.setupSegmentPanel(), 800);

          alert(`📁 已成功載入本機音檔：${file.name}\n已在上方為您自動切分分句！`);
          this.elEchoStatusText.textContent = `已載入本機音檔：${file.name}`;
        }
      });
    }

    // 雲端音檔彈窗與讀取
    const modalCloud = document.getElementById('modal-cloud');
    const btnCloudUrl = document.getElementById('btn-cloud-url');
    const btnCloseCloud = document.getElementById('btn-close-cloud');
    const btnFetchCloud = document.getElementById('btn-fetch-cloud');
    const cloudUrlInput = document.getElementById('cloud-url-input');

    if (btnCloudUrl && modalCloud) {
      btnCloudUrl.addEventListener('click', () => modalCloud.classList.add('open'));
      btnCloseCloud?.addEventListener('click', () => modalCloud.classList.remove('open'));
      btnFetchCloud?.addEventListener('click', () => {
        let url = cloudUrlInput.value.trim();
        if (!url) return;

        // Google Drive 連結解析
        const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (gdriveMatch) {
          const fileId = gdriveMatch[1];
          url = `https://docs.google.com/uc?export=download&id=${fileId}`;
        } else if (url.includes('dropbox.com')) {
          url = url.replace('dl=0', 'raw=1');
        }

        modalCloud.classList.remove('open');
        this.audioEngine.customAudioElement = new Audio(url);
        this.hasCustomAudio = true;
        this.customAudioName = "雲端音檔";

        this.audioEngine.customAudioElement.onloadedmetadata = () => {
          this.setupSegmentPanel();
        };
        setTimeout(() => this.setupSegmentPanel(), 1000);

        alert(`☁️ 已成功載入雲端音檔網址！`);
        this.elEchoStatusText.textContent = `已載入雲端音檔：${url}`;
      });
    }

    // 分句時間微調控制項
    this.segStartInput = document.getElementById('seg-start-time');
    this.segEndInput = document.getElementById('seg-end-time');

    document.getElementById('btn-seg-start-minus')?.addEventListener('click', () => this.adjustTime('start', -0.5));
    document.getElementById('btn-seg-start-plus')?.addEventListener('click', () => this.adjustTime('start', 0.5));
    document.getElementById('btn-seg-end-minus')?.addEventListener('click', () => this.adjustTime('end', -0.5));
    document.getElementById('btn-seg-end-plus')?.addEventListener('click', () => this.adjustTime('end', 0.5));
    
    document.getElementById('btn-preview-segment')?.addEventListener('click', () => {
      const start = parseFloat(this.segStartInput.value) || 0;
      const end = parseFloat(this.segEndInput.value) || null;
      this.audioEngine.startWaveformVisualizer(this.elCanvas, 'listen');
      this.audioEngine.playAudioSegment(start, end, this.playbackRate).then(() => {
        this.audioEngine.startWaveformVisualizer(this.elCanvas, 'idle');
      });
    });

    // 分類篩選
    this.categoryFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-chip');
      if (!btn) return;
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      this.currentCategory = btn.dataset.cat;
      this.renderLessonCards();
    });

    // 自訂句子彈窗
    this.btnCustomLesson.addEventListener('click', () => this.modalCustom.classList.add('open'));
    this.btnCloseModal.addEventListener('click', () => this.modalCustom.classList.remove('open'));
    this.formCustomLesson.addEventListener('submit', (e) => this.handleCustomLessonSubmit(e));

    // 歷史紀錄彈窗
    this.btnHistory.addEventListener('click', () => {
      this.renderHistoryModal();
      this.modalHistory.classList.add('open');
    });
    this.btnCloseHistory.addEventListener('click', () => this.modalHistory.classList.remove('open'));

    // 自評打分按鈕
    this.ratingButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rating = parseInt(btn.dataset.rating);
        StorageManager.recordPractice(this.currentLesson.id, rating);
        this.renderHeaderStats();
        alert('🎉 恭喜完成這次迴音練習！紀錄已儲存。');
      });
    });

    // 錄音狀態變化
    this.recorder.onStateChange = (state) => {
      if (state.isRecording) {
        this.btnToggleRecord.classList.add('recording');
        this.btnToggleRecord.querySelector('span').textContent = '停止錄音';
        this.audioEngine.startWaveformVisualizer(this.elCanvas, 'record');
      } else {
        this.btnToggleRecord.classList.remove('recording');
        this.btnToggleRecord.querySelector('span').textContent = '重新錄音';
        if (state.hasRecording) {
          this.btnPlayRecording.disabled = false;
          this.setStepActive('STEP4_COMPARE');
        }
      }
    };
  }

  loadLesson(lesson) {
    this.currentLesson = lesson;
    this.workflowState = 'IDLE';
    this.resetStepBadges();

    this.elTextTitle.textContent = lesson.title;
    this.elTextSentence.textContent = lesson.text;
    this.elTextIpa.textContent = lesson.ipa || '';
    this.elTextTranslation.textContent = lesson.translation || '';
    this.elTextTips.innerHTML = lesson.tips ? `<strong>💡 迴音心法：</strong>${lesson.tips}` : '';

    // 重點標記
    this.elHighlightsContainer.innerHTML = '';
    if (lesson.highlights) {
      lesson.highlights.forEach(h => {
        const tag = document.createElement('span');
        tag.className = `hl-tag hl-${h.type}`;
        tag.innerHTML = `<strong>${h.word}</strong>: ${h.note}`;
        this.highlightsContainer = this.elHighlightsContainer.appendChild(tag);
      });
    }

    this.updateSubtitleVisibility();
    this.btnPlayRecording.disabled = true;
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'idle');
    this.elEchoStatusText.textContent = '準備就緒，點擊「開始一鍵迴音特訓」';
    this.elEchoCountdown.textContent = '';
  }

  updateSubtitleVisibility() {
    if (this.showSubtitles) {
      this.elTextSubMask.classList.add('revealed');
      this.btnToggleSubtitles.innerHTML = `<svg class="icon"><use href="#icon-eye-off"/></svg> 隱藏字幕 (遮罩模式)`;
    } else {
      this.elTextSubMask.classList.remove('revealed');
      this.btnToggleSubtitles.innerHTML = `<svg class="icon"><use href="#icon-eye"/></svg> 顯示字幕 (揭露)`;
    }
  }

  resetStepBadges() {
    [this.elStep1, this.elStep2, this.elStep3, this.elStep4].forEach(el => {
      el.classList.remove('active', 'completed');
    });
  }

  setStepActive(stepName) {
    this.workflowState = stepName;
    this.resetStepBadges();

    if (stepName === 'STEP1_LISTEN') {
      this.elStep1.classList.add('active');
    } else if (stepName === 'STEP2_ECHO') {
      this.elStep1.classList.add('completed');
      this.elStep2.classList.add('active');
    } else if (stepName === 'STEP3_RECORD') {
      this.elStep1.classList.add('completed');
      this.elStep2.classList.add('completed');
      this.elStep3.classList.add('active');
    } else if (stepName === 'STEP4_COMPARE') {
      this.elStep1.classList.add('completed');
      this.elStep2.classList.add('completed');
      this.elStep3.classList.add('completed');
      this.elStep4.classList.add('active');
    }
  }

  /**
   * 4-Step Automated Echo Method Workflow Engine
   */
  async startWorkflow() {
    this.audioEngine.ensureAudioContext();

    // 1. Step 1: Listen to native audio
    this.setStepActive('STEP1_LISTEN');
    this.elEchoStatusText.textContent = this.hasCustomAudio 
      ? `【Step 1 仔細聽】播放載入的音檔 (${this.customAudioName})...` 
      : '【Step 1 仔細聽】請專注聽母語發音的音調與連音...';
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'listen');

    let durationMs = 3000;
    if (this.hasCustomAudio) {
      const segStart = parseFloat(this.segStartInput?.value) || 0;
      const segEnd = parseFloat(this.segEndInput?.value) || null;
      if (segEnd && segEnd > segStart) {
        durationMs = ((segEnd - segStart) / this.playbackRate) * 1000;
      }
      await this.audioEngine.playAudioSegment(segStart, segEnd, this.playbackRate);
    } else {
      durationMs = await this.audioEngine.speakText(this.currentLesson.text, this.playbackRate);
    }

    // 2. Step 2: Mental Echo (心裡留白倒數)
    this.setStepActive('STEP2_ECHO');
    this.elEchoStatusText.textContent = '【Step 2 心裡迴音】閉上眼睛，在腦海重放剛才聲音細節...';
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'echo');

    const pauseSec = Math.ceil((durationMs / 1000) * (this.currentLesson.recommendedEchoPauseSec || 1.2));
    await this.runEchoCountdown(pauseSec);

    // 3. Step 3: Mimic & Record (大聲模仿與錄音)
    this.setStepActive('STEP3_RECORD');
    this.elEchoStatusText.textContent = '【Step 3 大聲模仿】請開啟麥克風大聲模仿唸出！';
    
    try {
      await this.recorder.startRecording();
      // 錄音保持母語音訊時間之 1.5 倍長度
      setTimeout(() => {
        if (this.recorder.isRecording) {
          this.recorder.stopRecording();
          this.elEchoStatusText.textContent = '【Step 4 比對與自評】點擊下方按鈕比對發音並打分！';
        }
      }, Math.max(3000, durationMs * 1.5));
    } catch (e) {
      this.elEchoStatusText.textContent = '錄音權限未開啟，請手動練習';
    }
  }

  runEchoCountdown(seconds) {
    return new Promise((resolve) => {
      this.echoRemainingSec = seconds;
      this.elEchoCountdown.textContent = `${this.echoRemainingSec}s`;

      this.echoTimer = setInterval(() => {
        this.echoRemainingSec -= 1;
        if (this.echoRemainingSec <= 0) {
          clearInterval(this.echoTimer);
          this.elEchoCountdown.textContent = '';
          resolve();
        } else {
          this.elEchoCountdown.textContent = `${this.echoRemainingSec}s`;
        }
      }, 1000);
    });
  }

  async playOriginalAudio() {
    this.audioEngine.ensureAudioContext();
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'listen');
    await this.audioEngine.speakText(this.currentLesson.text, this.playbackRate);
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'idle');
  }

  async toggleRecording() {
    if (this.recorder.isRecording) {
      this.recorder.stopRecording();
    } else {
      await this.recorder.startRecording();
    }
  }

  renderHeaderStats() {
    const data = StorageManager.getStreakData();
    document.getElementById('stat-streak').textContent = `${data.currentStreak} 天`;
    document.getElementById('stat-count').textContent = `${data.totalPracticedCount} 句`;
  }

  renderLessonCards() {
    const filtered = this.currentCategory === 'all' 
      ? this.lessonsList 
      : this.lessonsList.filter(l => l.category === this.currentCategory);

    this.lessonsGrid.innerHTML = '';

    filtered.forEach(lesson => {
      const card = document.createElement('div');
      card.className = `lesson-card ${lesson.id === this.currentLesson.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="card-header">
          <span class="badge diff-${lesson.difficulty}">${lesson.difficulty}</span>
          <span class="cat-tag">${this.getCatName(lesson.category)}</span>
        </div>
        <h3 class="card-title">${lesson.title}</h3>
        <p class="card-text">"${lesson.text}"</p>
        <p class="card-trans">${lesson.translation}</p>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.lesson-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.loadLesson(lesson);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      this.lessonsGrid.appendChild(card);
    });
  }

  getCatName(catId) {
    const cat = LESSON_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.name.split(' ')[0] : '一般';
  }

  handleCustomLessonSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('custom-title').value.trim() || '自訂迴音練習';
    const text = document.getElementById('custom-text').value.trim();
    const translation = document.getElementById('custom-translation').value.trim();

    if (!text) return;

    const newLesson = {
      id: 'custom-' + Date.now(),
      category: 'daily',
      title,
      text,
      ipa: '',
      translation,
      tips: '【自訂句子】練習時仔細注意這句話的生字音節與整體調速。',
      difficulty: '自訂',
      recommendedEchoPauseSec: 3.0
    };

    this.lessonsList.unshift(newLesson);
    this.modalCustom.classList.remove('open');
    this.formCustomLesson.reset();
    this.renderLessonCards();
    this.loadLesson(newLesson);
  }

  setupSegmentPanel() {
    const panel = document.getElementById('segment-panel');
    const container = document.getElementById('segments-list');
    if (!panel || !container) return;

    panel.style.display = 'block';
    container.innerHTML = '';

    const segments = this.audioEngine.generateAudioSegments(4.0);
    if (segments.length === 0) return;

    segments.forEach((seg, idx) => {
      const chip = document.createElement('button');
      chip.className = `cat-chip ${idx === 0 ? 'active' : ''}`;
      chip.textContent = seg.label;
      chip.addEventListener('click', () => {
        container.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.segStartInput.value = seg.start;
        this.segEndInput.value = seg.end;
        this.elEchoStatusText.textContent = `切換至 ${seg.label}`;
      });
      container.appendChild(chip);
    });

    // 預設填入第一句區段
    this.segStartInput.value = segments[0].start;
    this.segEndInput.value = segments[0].end;
  }

  adjustTime(type, delta) {
    if (type === 'start') {
      let val = Math.max(0, (parseFloat(this.segStartInput.value) || 0) + delta);
      this.segStartInput.value = val.toFixed(1);
    } else {
      let val = Math.max(0, (parseFloat(this.segEndInput.value) || 0) + delta);
      this.segEndInput.value = val.toFixed(1);
    }
  }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EchoApp();
});
