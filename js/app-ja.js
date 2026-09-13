/**
 * 回音法 (Echo Method) 日文版主程式 (app-ja.js)
 */

import { PRESET_LESSONS_JA, LESSON_CATEGORIES_JA } from './lessons-data-ja.js';
import { AudioEngine } from './audio-engine.js';
import { VoiceRecorder } from './recorder.js';
import { StorageManager } from './storage.js';

class EchoAppJA {
  constructor() {
    this.audioEngine = new AudioEngine();
    this.audioEngine.setLanguage('ja-JP');
    this.recorder = new VoiceRecorder();

    this.lessonsList = [...PRESET_LESSONS_JA];
    this.currentLesson = PRESET_LESSONS_JA[0];
    this.currentCategory = 'all';

    this.workflowState = 'IDLE';
    this.echoTimer = null;
    this.echoRemainingSec = 0;
    this.playbackRate = 1.0;
    this.showSubtitles = false;

    this.initElements();
    this.bindEvents();
    this.renderHeaderStats();
    this.renderLessonCards();
    this.loadLesson(this.currentLesson);
  }

  initElements() {
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
    this.elTextKana = document.getElementById('lesson-kana');
    this.elTextRomaji = document.getElementById('lesson-romaji');
    this.elTextTranslation = document.getElementById('lesson-translation');
    this.elTextTips = document.getElementById('lesson-tips');
    this.elHighlightsContainer = document.getElementById('lesson-highlights');

    this.btnStartWorkflow = document.getElementById('btn-start-workflow');
    this.btnPlayOriginal = document.getElementById('btn-play-original');
    this.btnToggleRecord = document.getElementById('btn-toggle-record');
    this.btnPlayRecording = document.getElementById('btn-play-recording');
    this.btnToggleSubtitles = document.getElementById('btn-toggle-subtitles');
    this.speedSelector = document.getElementById('speed-selector');

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

    this.ratingButtons = document.querySelectorAll('.btn-rating');
  }

  bindEvents() {
    this.btnStartWorkflow.addEventListener('click', () => this.startWorkflow());
    this.btnPlayOriginal.addEventListener('click', () => this.playOriginalAudio());
    this.btnToggleRecord.addEventListener('click', () => this.toggleRecording());
    this.btnPlayRecording.addEventListener('click', () => this.recorder.playRecording());
    
    this.btnToggleSubtitles.addEventListener('click', () => {
      this.showSubtitles = !this.showSubtitles;
      this.updateSubtitleVisibility();
    });

    this.speedSelector.addEventListener('change', (e) => {
      this.playbackRate = parseFloat(e.target.value);
    });

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

          alert(`🎵 已成功載入日文音檔：${file.name}\n已在上方為您自動切分分句，您也可自行微調播放區段！`);
          this.elEchoStatusText.textContent = `已載入自訂日文音檔：${file.name}`;
        }
      });
    }

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

    this.categoryFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-chip');
      if (!btn) return;
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      this.currentCategory = btn.dataset.cat;
      this.renderLessonCards();
    });

    this.btnCustomLesson.addEventListener('click', () => this.modalCustom.classList.add('open'));
    this.btnCloseModal.addEventListener('click', () => this.modalCustom.classList.remove('open'));
    this.formCustomLesson.addEventListener('submit', (e) => this.handleCustomLessonSubmit(e));

    this.btnHistory.addEventListener('click', () => {
      this.renderHistoryModal();
      this.modalHistory.classList.add('open');
    });
    this.btnCloseHistory.addEventListener('click', () => this.modalHistory.classList.remove('open'));

    this.ratingButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        StorageManager.recordPractice(this.currentLesson.id, rating);
        this.renderHeaderStats();
        alert('🎉 日文迴音練習紀錄成功！音意合一繼續保持！');
      });
    });

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
    this.elTextKana.textContent = lesson.kana ? `假名：${lesson.kana}` : '';
    this.elTextRomaji.textContent = lesson.romaji ? `羅馬字：${lesson.romaji}` : '';
    this.elTextTranslation.textContent = lesson.translation || '';
    this.elTextTips.innerHTML = lesson.tips ? `<strong>💡 日文迴音心法：</strong>${lesson.tips}` : '';

    this.elHighlightsContainer.innerHTML = '';
    if (lesson.highlights) {
      lesson.highlights.forEach(h => {
        const tag = document.createElement('span');
        tag.className = `hl-tag hl-${h.type}`;
        tag.innerHTML = `<strong>${h.word}</strong>: ${h.note}`;
        this.elHighlightsContainer.appendChild(tag);
      });
    }

    this.updateSubtitleVisibility();
    this.btnPlayRecording.disabled = true;
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'idle');
    this.elEchoStatusText.textContent = '準備就緒，點擊「開始一鍵日文迴音特訓」';
    this.elEchoCountdown.textContent = '';
  }

  updateSubtitleVisibility() {
    if (this.showSubtitles) {
      this.elTextSubMask.classList.add('revealed');
      this.btnToggleSubtitles.innerHTML = `<svg class="icon"><use href="#icon-eye-off"/></svg> 隱藏假名與日文字幕`;
    } else {
      this.elTextSubMask.classList.remove('revealed');
      this.btnToggleSubtitles.innerHTML = `<svg class="icon"><use href="#icon-eye"/></svg> 顯示日文字幕`;
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

  async startWorkflow() {
    this.audioEngine.ensureAudioContext();

    this.setStepActive('STEP1_LISTEN');
    this.elEchoStatusText.textContent = this.hasCustomAudio
      ? `【Step 1 仔細聽】播放載入的日文音檔 (${this.customAudioName})...`
      : '【Step 1 仔細聽】聆聽日語原音的高低音型 (Pitch Accent)...';
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

    this.setStepActive('STEP2_ECHO');
    this.elEchoStatusText.textContent = '【Step 2 心裡迴音】閉眼重現剛剛的高低降型與促音拍子...';
    this.audioEngine.startWaveformVisualizer(this.elCanvas, 'echo');

    const pauseSec = Math.ceil((durationMs / 1000) * (this.currentLesson.recommendedEchoPauseSec || 1.2));
    await this.runEchoCountdown(pauseSec);

    this.setStepActive('STEP3_RECORD');
    this.elEchoStatusText.textContent = '【Step 3 大聲模仿】請開啟麥克風模仿日語音調！';

    try {
      await this.recorder.startRecording();
      setTimeout(() => {
        if (this.recorder.isRecording) {
          this.recorder.stopRecording();
          this.elEchoStatusText.textContent = '【Step 4 比對與自評】點擊按鈕比對您的日語錄音！';
        }
      }, Math.max(3000, durationMs * 1.5));
    } catch (e) {
      this.elEchoStatusText.textContent = '麥克風權限未開啟，請手動練習';
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
    const cat = LESSON_CATEGORIES_JA.find(c => c.id === catId);
    return cat ? cat.name.split(' ')[0] : '一般';
  }

  handleCustomLessonSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('custom-title').value.trim() || '自訂日文迴音句';
    const text = document.getElementById('custom-text').value.trim();
    const translation = document.getElementById('custom-translation').value.trim();

    if (!text) return;

    const newLesson = {
      id: 'custom-ja-' + Date.now(),
      category: 'daily',
      title,
      text,
      kana: text,
      romaji: '',
      translation,
      tips: '【自訂日文句】練習時仔細注意這句話的假名拍子與音型上揚/下降。',
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

document.addEventListener('DOMContentLoaded', () => {
  window.appJA = new EchoAppJA();
});
