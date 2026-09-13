/**
 * 回音法 (Echo Method) 音訊引擎與 4 步驟流程自動化控制
 */

export class AudioEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    
    // Audio Context & Visualizer Nodes
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.animFrameId = null;

    // Callbacks
    this.onWorkflowStateChange = null;
    this.onTimerTick = null;

    this.initVoices();
  }

  initVoices() {
    const load = () => {
      this.voices = this.synth.getVoices();
      this.updateVoiceForLang(this.currentLang || 'en-US');
    };

    load();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = load;
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.updateVoiceForLang(lang);
  }

  updateVoiceForLang(lang) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    if (lang.startsWith('ja')) {
      this.selectedVoice = this.voices.find(v => v.lang.includes('ja') || v.lang.includes('JP')) 
        || this.voices.find(v => v.name.includes('Kyoko') || v.name.includes('Otoya') || v.name.includes('Japanese'))
        || this.voices[0];
    } else {
      this.selectedVoice = this.voices.find(v => v.lang.includes('en-US') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Alex'))) 
        || this.voices.find(v => v.lang.startsWith('en')) 
        || this.voices[0];
    }
  }

  /**
   * 載入自訂音檔 (MP3, WAV, M4A, OGG)
   */
  loadCustomAudioFile(file) {
    if (this.customAudioUrl) {
      URL.revokeObjectURL(this.customAudioUrl);
    }
    this.customAudioUrl = URL.createObjectURL(file);
    this.customAudioElement = new Audio(this.customAudioUrl);
    return this.customAudioElement;
  }

  /**
   * 播放音檔指定時間區段 [startTimeSec ~ endTimeSec]
   */
  playAudioSegment(startTimeSec = 0, endTimeSec = null, rate = 1.0) {
    return new Promise((resolve) => {
      if (!this.customAudioElement) {
        resolve();
        return;
      }

      this.stopSpeech();
      this.customAudioElement.playbackRate = rate;
      this.customAudioElement.currentTime = startTimeSec;

      const duration = endTimeSec ? (endTimeSec - startTimeSec) : (this.customAudioElement.duration - startTimeSec);
      const scaledDurationMs = (duration / rate) * 1000;

      const onTimeUpdate = () => {
        if (endTimeSec && this.customAudioElement.currentTime >= endTimeSec) {
          this.customAudioElement.pause();
          this.customAudioElement.removeEventListener('timeupdate', onTimeUpdate);
          resolve();
        }
      };

      this.customAudioElement.addEventListener('timeupdate', onTimeUpdate);

      this.customAudioElement.onended = () => {
        this.customAudioElement.removeEventListener('timeupdate', onTimeUpdate);
        resolve();
      };

      this.customAudioElement.play().catch(() => resolve());

      // 備用定時器防呆
      setTimeout(() => {
        if (!this.customAudioElement.paused && endTimeSec && this.customAudioElement.currentTime >= endTimeSec) {
          this.customAudioElement.pause();
          this.customAudioElement.removeEventListener('timeupdate', onTimeUpdate);
          resolve();
        }
      }, scaledDurationMs + 300);
    });
  }

  /**
   * 自動將長音檔切分成 3~5 秒的迴音分句區段清單
   */
  generateAudioSegments(segmentLengthSec = 4.0) {
    if (!this.customAudioElement || !this.customAudioElement.duration) return [];
    const totalDuration = this.customAudioElement.duration;
    const segments = [];
    let start = 0;
    let index = 1;

    while (start < totalDuration) {
      const end = Math.min(totalDuration, start + segmentLengthSec);
      segments.push({
        id: `seg-${index}`,
        label: `分句 ${index} (${start.toFixed(1)}s ~ ${end.toFixed(1)}s)`,
        start: parseFloat(start.toFixed(1)),
        end: parseFloat(end.toFixed(1))
      });
      start = end;
      index++;
    }

    return segments;
  }

  stopCustomAudio() {
    if (this.customAudioElement) {
      this.customAudioElement.pause();
      this.customAudioElement.currentTime = 0;
    }
  }

  /**
   * 使用 Web Speech Synthesis 發音朗讀句子
   * @param {string} text 英文句子
   * @param {number} rate 播放速率 (0.5 - 1.5)
   * @returns {Promise<number>} 朗讀歷時毫秒數
   */
  speakText(text, rate = 1.0) {
    return new Promise((resolve) => {
      this.synth.cancel(); // 停止目前所有朗讀

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      const startTime = performance.now();

      utterance.onend = () => {
        const durationMs = Math.max(1500, performance.now() - startTime);
        resolve(durationMs);
      };

      utterance.onerror = () => {
        resolve(2000);
      };

      this.synth.speak(utterance);
    });
  }

  stopSpeech() {
    this.synth.cancel();
  }

  /**
   * 繪製動態繪畫 / 音波 / 心裡迴音脈衝動畫
   */
  startWaveformVisualizer(canvas, mode = 'idle') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (mode === 'listen' || mode === 'record') {
        // 動態聲波
        ctx.lineWidth = 3;
        ctx.strokeStyle = mode === 'listen' ? '#8b5cf6' : '#ef4444';
        ctx.shadowColor = mode === 'listen' ? '#a78bfa' : '#f87171';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        const sliceWidth = width / 60;
        let x = 0;

        for (let i = 0; i < 60; i++) {
          const v = Math.sin(i * 0.2 + phase) * (mode === 'listen' ? 18 : 28) + (Math.random() * 6);
          const y = height / 2 + v;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        phase += 0.15;
      } else if (mode === 'echo') {
        // 心裡迴音脈衝波紋 (Mental Echo Pulse Animation)
        ctx.save();
        ctx.translate(width / 2, height / 2);
        const radius = (Math.sin(phase) * 0.3 + 0.7) * (height / 2.8);
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#06b6d4';
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 16;
        ctx.stroke();

        ctx.restore();
        phase += 0.08;
      } else {
        // 靜止狀態 - 質感基準線
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    render();
  }

  stopVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
