/**
 * 麥克風錄音與雙軌對比播放器
 */

export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedAudioUrl = null;
    this.recordedAudioElement = null;
    this.isRecording = false;
    this.onStateChange = null;
  }

  /**
   * 啟動麥克風錄音
   */
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        if (this.recordedAudioUrl) {
          URL.revokeObjectURL(this.recordedAudioUrl);
        }
        this.recordedAudioUrl = URL.createObjectURL(audioBlob);
        this.recordedAudioElement = new Audio(this.recordedAudioUrl);
        
        if (this.onStateChange) {
          this.onStateChange({ isRecording: false, hasRecording: true, audioUrl: this.recordedAudioUrl });
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      if (this.onStateChange) {
        this.onStateChange({ isRecording: true, hasRecording: false });
      }
    } catch (err) {
      console.error('麥克風存取失敗：', err);
      alert('請允許瀏覽器存取麥克風，以進行模仿錄音與對比功能！');
      throw err;
    }
  }

  /**
   * 停止錄音
   */
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
    }
  }

  /**
   * 播放使用者自己的錄音
   */
  playRecording() {
    if (this.recordedAudioElement) {
      this.recordedAudioElement.currentTime = 0;
      return this.recordedAudioElement.play();
    }
  }

  stopRecordingPlayback() {
    if (this.recordedAudioElement) {
      this.recordedAudioElement.pause();
      this.recordedAudioElement.currentTime = 0;
    }
  }
}
