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
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.userVoiceBlob = null;
    this.userVoiceUrl = null;
    this.micStream = null;
    this.micAnalyser = null;
    this.meterAnimationId = null;

    // Playback state
    this.isPlaying = false;
    this.playbackRate = 1.0;

    // HTML5 Audio element for background/mobile compatibility
    this.nativeAudio = new Audio();
    this.selfAudio = new Audio();

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
    return this.audioCtx;
  }

  /**
   * Decode an audio File or ArrayBuffer
   */
  async loadAudioFile(file) {
    await this.ensureAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

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
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

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
   */
  playSegment(start, end, rate = 1.0, onProgress = null, onEnded = null) {
    this.stopPlayback();
    this.isPlaying = true;
    this.playbackRate = rate;

    this.nativeAudio.playbackRate = rate;
    this.nativeAudio.currentTime = Math.max(0, start);

    let checkInterval = null;

    const cleanup = () => {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      this.nativeAudio.removeEventListener('ended', handleEnded);
      this.nativeAudio.removeEventListener('pause', handlePause);
    };

    const handleEnded = () => {
      cleanup();
      this.isPlaying = false;
      if (onEnded) onEnded();
    };

    const handlePause = () => {
      if (this.nativeAudio.currentTime >= end - 0.05) {
        cleanup();
        this.isPlaying = false;
        if (onEnded) onEnded();
      }
    };

    this.nativeAudio.addEventListener('ended', handleEnded);
    this.nativeAudio.addEventListener('pause', handlePause);

    checkInterval = setInterval(() => {
      if (!this.isPlaying) {
        cleanup();
        return;
      }
      const cur = this.nativeAudio.currentTime;
      if (onProgress) {
        onProgress(cur);
      }
      if (cur >= end) {
        this.nativeAudio.pause();
        cleanup();
        this.isPlaying = false;
        if (onEnded) onEnded();
      }
    }, 25);

    this.nativeAudio.play().catch(e => {
      console.warn('Playback interrupted or blocked:', e);
      cleanup();
      this.isPlaying = false;
      if (onEnded) onEnded();
    });
  }

  stopPlayback() {
    this.isPlaying = false;
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
      const type = this.mediaRecorder.mimeType || 'audio/webm';
      this.userVoiceBlob = new Blob(this.recordedChunks, { type });
      if (this.userVoiceUrl) {
        URL.revokeObjectURL(this.userVoiceUrl);
      }
      this.userVoiceUrl = URL.createObjectURL(this.userVoiceBlob);
      this.selfAudio.src = this.userVoiceUrl;
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
   * Stop recording
   */
  stopRecording() {
    if (this.meterAnimationId) {
      cancelAnimationFrame(this.meterAnimationId);
      this.meterAnimationId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Play user's recorded voice
   */
  playSelfVoice(onEnded = null) {
    if (!this.userVoiceUrl) return;
    this.stopPlayback();
    this.selfAudio.currentTime = 0;
    this.selfAudio.onended = () => {
      if (onEnded) onEnded();
    };
    this.selfAudio.play().catch(e => console.warn('Self audio playback error', e));
  }

  /**
   * Dual Sequential Playback: "Original -> Pause 350ms -> User Voice"
   */
  playCompareSequence(start, end, rate = 1.0, onStep = null, onFinish = null) {
    if (onStep) onStep('origin');
    this.playSegment(start, end, rate, null, () => {
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
