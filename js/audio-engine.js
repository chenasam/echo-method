/**
 * Audio Engine: Web Audio API & MediaRecorder Integration
 * Handles audio decoding, waveform extraction, adaptive silence detection,
 * cross-platform microphone recording, and dual-track comparison playback.
 */

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.audioBuffer = null;
    this.audioSourceNode = null;
    this.currentSourceNode = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingMimeType = '';
    this.userVoiceBlob = null;
    this.userVoiceUrl = null;
    this.userVoiceBuffer = null;
    this.currentSelfSourceNode = null;
    this.micStream = null;
    this.micAnalyser = null;
    this.meterAnimationId = null;

    // Playback state
    this.isPlaying = false;
    this.playbackRate = 1.0;
    this.micGainMode = '2.0'; // '1.0' | '1.5' | '2.0' (default) | 'auto'

    // HTML5 Audio element for background/mobile compatibility
    this.nativeAudio = new Audio();
    this.selfAudio = new Audio();
    this.selfAudioUnlocked = false;

    // Silence detection default settings
    this.settings = {
      silenceThreshold: 0.015,
      minSilenceSec: 0.55,
      minSpeechSec: 0.6,
      echoWaitSec: 2.0
    };
  }

  /**
   * Unlock AudioContext on user gesture (crucial for iOS Safari)
   */
  async ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    // Warm up selfAudio to unlock iOS Safari autoplay restrictions
    try {
      if (!this.selfAudioUnlocked) {
        // Unlock HTML5 Audio autoplay policy across iOS Safari and Chrome
        // Using a 1-sample silent WAV data URI so it doesn't make any sound but fully unlocks playback
        this.selfAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const p = this.selfAudio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.selfAudio.pause();
            this.selfAudio.currentTime = 0;
            this.selfAudioUnlocked = true;
          }).catch(() => {});
        } else {
          this.selfAudio.pause();
          this.selfAudioUnlocked = true;
        }
      }
    } catch (e) {}
    return this.audioCtx;
  }

  /**
   * Safe ArrayBuffer reader (supporting FileReader fallback for older iOS Safari)
   */
  async readFileAsArrayBuffer(file) {
    if (typeof file.arrayBuffer === 'function') {
      try {
        return await file.arrayBuffer();
      } catch (e) {
        console.warn('file.arrayBuffer failed, falling back to FileReader:', e);
      }
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(new Error('讀取音訊檔案失敗: ' + (e.message || 'FileReader error')));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Cross-browser decodeAudioData wrapper for WebKit / iOS Safari compatibility
   */
  decodeAudioDataCompat(arrayBuffer) {
    return new Promise((resolve, reject) => {
      // Create a copy of the buffer in case WebKit detaches the original
      const bufferCopy = arrayBuffer.slice(0);
      try {
        const res = this.audioCtx.decodeAudioData(
          bufferCopy,
          (decoded) => resolve(decoded),
          (err) => reject(err)
        );
        if (res && typeof res.then === 'function') {
          res.then(resolve).catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Decode an audio File or ArrayBuffer
   */
  async loadAudioFile(file) {
    await this.ensureAudioContext();
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    this.audioBuffer = await this.decodeAudioDataCompat(arrayBuffer);

    // Setup native audio source for smooth seeking
    if (this.nativeAudio.src && this.nativeAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.nativeAudio.src);
    }
    this.nativeAudio.src = URL.createObjectURL(file);
    return this.audioBuffer;
  }

  /**
   * Decode audio directly from a URL (e.g. built-in demo)
   */
  async loadAudioFromUrl(url) {
    await this.ensureAudioContext();
    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    this.audioBuffer = await this.decodeAudioDataCompat(arrayBuffer);

    if (this.nativeAudio.src && this.nativeAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.nativeAudio.src);
    }
    this.nativeAudio.src = url;
    return this.audioBuffer;
  }

  /**
   * Adaptive Silence & Energy Detection for Auto-Segmentation
   * Scans amplitude envelope and detects pauses
   */
  detectSegments(customThreshold, customMinSilence) {
    if (!this.audioBuffer) return [];

    const threshold = customThreshold !== undefined ? customThreshold : this.settings.silenceThreshold;
    const minSilence = customMinSilence !== undefined ? customMinSilence : this.settings.minSilenceSec;
    const minSpeech = this.settings.minSpeechSec;

    const data = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    const duration = this.audioBuffer.duration;
    const step = 0.04; // 40ms analysis window

    let inSpeech = false;
    let start = 0;
    let silenceDuration = 0;
    const rawSegments = [];

    for (let t = 0; t < duration; t += step) {
      let sum = 0;
      let count = 0;
      const startIdx = Math.floor(t * sampleRate);
      const endIdx = Math.min(Math.floor((t + step) * sampleRate), data.length);

      for (let i = startIdx; i < endIdx; i++) {
        sum += Math.abs(data[i]);
        count++;
      }
      const amp = count ? sum / count : 0;

      if (amp > threshold) {
        if (!inSpeech) {
          inSpeech = true;
          start = Math.max(0, t - 0.08); // Slight pre-roll
        }
        silenceDuration = 0;
      } else {
        if (inSpeech) {
          silenceDuration += step;
          if (silenceDuration >= minSilence) {
            inSpeech = false;
            let end = t - silenceDuration + 0.15; // Small post-roll
            if (end - start >= minSpeech) {
              rawSegments.push({
                start: parseFloat(start.toFixed(2)),
                end: parseFloat(Math.min(duration, end).toFixed(2)),
                jp: '',
                zh: ''
              });
            }
          }
        }
      }
    }

    // Capture tail if speech continues to end of file
    if (inSpeech && duration - start >= minSpeech) {
      rawSegments.push({
        start: parseFloat(start.toFixed(2)),
        end: parseFloat(duration.toFixed(2)),
        jp: '',
        zh: ''
      });
    }

    return rawSegments;
  }

  /**
   * Get downsampled waveform peaks for HTML5 Canvas rendering
   */
  getWaveformPeaks(targetPoints = 800) {
    if (!this.audioBuffer) return [];
    const rawData = this.audioBuffer.getChannelData(0);
    const step = Math.floor(rawData.length / targetPoints);
    const peaks = [];

    for (let i = 0; i < targetPoints; i++) {
      let min = 1.0;
      let max = -1.0;
      const start = i * step;
      const end = Math.min(start + step, rawData.length);

      for (let j = start; j < end; j++) {
        const val = rawData[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      peaks.push({ min, max });
    }
    return peaks;
  }

  /**
   * Play specific slice of the original audio
   * Uses Web Audio API AudioBufferSourceNode as primary engine for sample-accurate, zero-latency playback
   * with HTML5 Audio as a safe fallback.
   */
  playSegment(start, end, rate = 1.0, onProgress = null, onEnded = null) {
    this.stopPlayback();
    this.isPlaying = true;
    this.playbackRate = rate;

    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(safeStart + 0.05, end);
    const duration = (safeEnd - safeStart) / rate;

    // 1. Primary Engine: Web Audio API (zero seeking latency, no race conditions)
    if (this.audioCtx && this.audioBuffer) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      let source = null;
      try {
        source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffer;
        source.playbackRate.value = rate;
        source.connect(this.audioCtx.destination);
        this.currentSourceNode = source;
      } catch (err) {
        console.warn('Failed to create buffer source node:', err);
        source = null;
        this.currentSourceNode = null;
      }

      if (source) {
        const ctxStartTime = this.audioCtx.currentTime;
        let animFrameId = null;
        let endedCalled = false;

        const finish = () => {
          if (endedCalled) return;
          endedCalled = true;
          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
          this.isPlaying = false;
          this.currentSourceNode = null;
          if (onEnded) onEnded();
        };

        source.onended = () => {
          if (this.isPlaying && !endedCalled) {
            finish();
          }
        };

        try {
          source.start(0, safeStart, duration);
        } catch (err) {
          console.warn('Web Audio source.start failed, will use fallback:', err);
          this.currentSourceNode = null;
        }

        if (this.currentSourceNode) {
          if (onProgress) {
            const updateProgress = () => {
              if (!this.isPlaying || endedCalled) return;
              const elapsed = (this.audioCtx.currentTime - ctxStartTime) * rate;
              const curTime = Math.min(safeEnd, safeStart + elapsed);
              onProgress(curTime);
              if (curTime < safeEnd) {
                animFrameId = requestAnimationFrame(updateProgress);
              }
            };
            animFrameId = requestAnimationFrame(updateProgress);
          }
          return;
        }
      }
    }

    // 2. Fallback Engine: HTML5 Audio with bulletproof seeked & error guard
    let checkInterval = null;
    let endedCalled = false;

    const cleanup = () => {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      this.nativeAudio.removeEventListener('ended', handleEnded);
    };

    const finish = () => {
      if (endedCalled) return;
      endedCalled = true;
      cleanup();
      this.isPlaying = false;
      if (onEnded) onEnded();
    };

    const handleEnded = () => finish();
    this.nativeAudio.addEventListener('ended', handleEnded);

    this.nativeAudio.playbackRate = rate;
    let seekComplete = false;

    const onSeeked = () => {
      seekComplete = true;
      this.nativeAudio.removeEventListener('seeked', onSeeked);
    };
    this.nativeAudio.addEventListener('seeked', onSeeked);

    try {
      this.nativeAudio.currentTime = safeStart;
      if (Math.abs(this.nativeAudio.currentTime - safeStart) < 0.1) {
        seekComplete = true;
      }
    } catch (e) {}

    checkInterval = setInterval(() => {
      if (!this.isPlaying || endedCalled) {
        cleanup();
        return;
      }
      // Wait for seek to complete before evaluating end time
      if (!seekComplete && Math.abs(this.nativeAudio.currentTime - safeStart) > 0.3) {
        return;
      }
      seekComplete = true;
      const cur = this.nativeAudio.currentTime;
      if (onProgress) onProgress(cur);
      if (cur >= safeEnd - 0.03) {
        try { this.nativeAudio.pause(); } catch (e) {}
        finish();
      }
    }, 25);

    this.nativeAudio.play().catch(e => {
      console.warn('Native audio playback interrupted or blocked:', e);
      finish();
    });
  }

  stopPlayback() {
    this.isPlaying = false;
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.onended = null;
        this.currentSourceNode.stop();
      } catch (e) {}
      this.currentSourceNode = null;
    }
    if (this.currentSelfSourceNode) {
      try {
        this.currentSelfSourceNode.onended = null;
        this.currentSelfSourceNode.stop();
      } catch (e) {}
      this.currentSelfSourceNode = null;
    }
    try {
      this.nativeAudio.pause();
    } catch (e) {}
    try {
      this.selfAudio.pause();
    } catch (e) {}
  }

  /**
   * Initialize Microphone with cross-platform MediaRecorder MIME type
   */
  async setupMic() {
    if (this.micStream) return true;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Connect to Web Audio Analyser for volume metering
      await this.ensureAudioContext();
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.audioCtx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      source.connect(this.micAnalyser);

      return true;
    } catch (err) {
      console.error('Microphone permission denied or unavailable:', err);
      return false;
    }
  }

  /**
   * Start recording user voice
   */
  startRecording(onMeterUpdate = null) {
    if (!this.micStream) return false;

    this.recordedChunks = [];
    this.userVoiceBuffer = null;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'; // iOS Safari
      } else {
        mimeType = '';
      }
    }
    this.recordingMimeType = mimeType;

    const options = mimeType ? { mimeType } : {};
    try {
      this.mediaRecorder = new MediaRecorder(this.micStream, options);
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.micStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const type = this.recordingMimeType || this.mediaRecorder.mimeType || 'audio/webm';
      this.userVoiceBlob = new Blob(this.recordedChunks, { type });
      if (this.userVoiceUrl) {
        URL.revokeObjectURL(this.userVoiceUrl);
      }
      this.userVoiceUrl = URL.createObjectURL(this.userVoiceBlob);
      this.selfAudio.src = this.userVoiceUrl;
      try {
        this.selfAudio.load();
      } catch (e) {}
    };

    this.mediaRecorder.start(100);

    // Start Metering loop
    if (this.micAnalyser && onMeterUpdate) {
      const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
      const updateMeter = () => {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
        this.micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        onMeterUpdate(normalized);
        this.meterAnimationId = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    }

    return true;
  }

  /**
   * Decode recorded user voice Blob to AudioBuffer for Web Audio API gain processing
   */
  async decodeUserVoiceBlob() {
    this.userVoiceBuffer = null;
    if (!this.userVoiceBlob || !this.audioCtx) return null;
    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(this.userVoiceBlob);
      this.userVoiceBuffer = await this.decodeAudioDataCompat(arrayBuffer);
      return this.userVoiceBuffer;
    } catch (err) {
      console.warn('Could not decode user voice Blob to AudioBuffer, will fallback to HTML5 Audio:', err);
      return null;
    }
  }

  /**
   * Stop recording - returns Promise resolving when userVoiceBlob & userVoiceUrl are ready
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (this.meterAnimationId) {
        cancelAnimationFrame(this.meterAnimationId);
        this.meterAnimationId = null;
      }
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        const existingOnStop = this.mediaRecorder.onstop;
        this.mediaRecorder.onstop = async (e) => {
          if (existingOnStop) {
            try { existingOnStop(e); } catch (err) { console.error(err); }
          }
          await this.decodeUserVoiceBlob();
          resolve(this.userVoiceUrl);
        };
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          resolve(this.userVoiceUrl);
        }
      } else {
        resolve(this.userVoiceUrl);
      }
    });
  }

  /**
   * Play user's recorded voice with Web Audio API Gain Boost & Limiter (Fallback to HTML5 Audio)
   */
  playSelfVoice(onEnded = null) {
    if (!this.userVoiceUrl && !this.userVoiceBuffer) {
      if (onEnded) onEnded();
      return;
    }
    this.stopPlayback();
    this.isPlaying = true;

    // 1. Primary Engine: Web Audio API (Boosted gain + transparent compressor/limiter)
    if (this.audioCtx && this.userVoiceBuffer) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      try {
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.userVoiceBuffer;

        // Calculate gain multiplier based on micGainMode
        let gainVal = 2.0; // Default: 2.0x boost
        if (this.micGainMode === 'auto') {
          // Scan peak amplitude of the user recording
          let peak = 0.05;
          for (let ch = 0; ch < this.userVoiceBuffer.numberOfChannels; ch++) {
            const data = this.userVoiceBuffer.getChannelData(ch);
            const step = Math.max(1, Math.floor(data.length / 5000));
            for (let i = 0; i < data.length; i += step) {
              const val = Math.abs(data[i]);
              if (val > peak) peak = val;
            }
          }
          // Target peak around 0.88 with safe 1.2x ~ 3.5x bounds
          gainVal = Math.min(3.5, Math.max(1.2, 0.88 / peak));
        } else {
          const parsed = parseFloat(this.micGainMode);
          if (!isNaN(parsed) && parsed > 0) {
            gainVal = parsed;
          }
        }

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = gainVal;

        // Broadcast-quality transparent limiter/compressor to eliminate clipping
        const compressor = this.audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -3.0; // dB
        compressor.knee.value = 10.0;
        compressor.ratio.value = 12.0;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;

        source.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(this.audioCtx.destination);

        this.currentSelfSourceNode = source;

        let endedCalled = false;
        const finish = () => {
          if (endedCalled) return;
          endedCalled = true;
          this.isPlaying = false;
          this.currentSelfSourceNode = null;
          if (onEnded) onEnded();
        };

        source.onended = () => {
          if (this.isPlaying && !endedCalled) {
            finish();
          }
        };

        source.start(0);
        return;
      } catch (err) {
        console.warn('Web Audio playback of user voice failed, falling back to HTML5 Audio:', err);
        this.currentSelfSourceNode = null;
      }
    }

    // 2. Fallback Engine: HTML5 selfAudio
    let finished = false;
    let safetyTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      this.selfAudio.removeEventListener('ended', handleEnded);
      this.selfAudio.removeEventListener('error', handleError);
      this.isPlaying = false;
      if (onEnded) onEnded();
    };

    const handleEnded = () => finish();
    const handleError = (e) => {
      console.warn('Self audio playback error or unsupported format:', e);
      finish();
    };

    this.selfAudio.addEventListener('ended', handleEnded);
    this.selfAudio.addEventListener('error', handleError);

    try {
      this.selfAudio.currentTime = 0;
    } catch (e) {}

    // Safety timeout: prevents hang if audio playback does not trigger onended
    safetyTimer = setTimeout(() => {
      console.warn('Self audio playback safety timeout fired');
      finish();
    }, 25000);

    const playPromise = this.selfAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.warn('Self audio playback rejected by browser:', e);
        finish();
      });
    }
  }

  /**
   * Dual Sequential Playback: "Original -> Pause 350ms -> User Voice"
   */
  playCompareSequence(start, end, rate = 1.0, onStep = null, onFinish = null, onProgress = null) {
    if (onStep) onStep('origin');
    this.playSegment(start, end, rate, onProgress, () => {
      if (onStep) onStep('gap');
      setTimeout(() => {
        if (this.userVoiceUrl) {
          if (onStep) onStep('self');
          this.playSelfVoice(() => {
            if (onFinish) onFinish();
          });
        } else {
          if (onFinish) onFinish();
        }
      }, 350);
    });
  }
}

window.AudioEngine = AudioEngine;
