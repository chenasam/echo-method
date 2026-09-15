/**
 * Interactive Waveform Canvas Renderer
 * Renders audio peaks, segment regions, active segment highlight,
 * and real-time playback cursor with Retina display crispness.
 */

class WaveformCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.peaks = [];
    this.duration = 0;
    this.segments = [];
    this.currentIdx = -1;
    this.currentTime = 0;
    this.onSegmentClick = options.onSegmentClick || null;

    this.initEvents();
  }

  setData(peaks, duration, segments = []) {
    this.peaks = peaks;
    this.duration = duration;
    this.segments = segments;
    this.render();
  }

  setSegments(segments) {
    this.segments = segments;
    this.render();
  }

  setActiveSegment(index) {
    this.currentIdx = index;
    this.render();
  }

  setCurrentTime(time) {
    this.currentTime = time;
    this.render();
  }

  initEvents() {
    this.canvas.addEventListener('click', (e) => {
      if (!this.duration || !this.segments.length) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickRatio = clickX / rect.width;
      const targetTime = clickRatio * this.duration;

      // Find which segment was clicked
      const foundIdx = this.segments.findIndex(seg => targetTime >= seg.start && targetTime <= seg.end);
      if (foundIdx !== -1 && this.onSegmentClick) {
        this.onSegmentClick(foundIdx, targetTime);
      }
    });

    // Resize observer for crisp canvas
    const resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.render();
    });
    resizeObserver.observe(this.canvas);
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  render() {
    if (!this.width || !this.height) {
      this.resizeCanvas();
    }
    const { ctx, width, height, peaks, duration, segments, currentIdx, currentTime } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    if (!peaks || peaks.length === 0) {
      // Empty placeholder
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('載入音檔後將在此繪製音波與斷句切點', width / 2, height / 2);
      return;
    }

    const midY = height / 2;

    // 1. Draw Segment Backgrounds
    if (duration > 0 && segments) {
      segments.forEach((seg, idx) => {
        const startX = (seg.start / duration) * width;
        const endX = (seg.end / duration) * width;
        const segWidth = Math.max(2, endX - startX);

        const isEnabled = seg.enabled !== false;

        if (idx === currentIdx) {
          // Active segment: Sakura glow
          ctx.fillStyle = isEnabled ? 'rgba(244, 63, 94, 0.22)' : 'rgba(100, 116, 139, 0.25)';
          ctx.fillRect(startX, 0, segWidth, height);

          ctx.strokeStyle = isEnabled ? '#f43f5e' : '#64748b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(startX, 0, segWidth, height);
        } else if (!isEnabled) {
          // Disabled segment: Muted dark grey
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(startX, 0, segWidth, height);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, height);
          ctx.stroke();
        } else {
          // Alternate subtle tint
          ctx.fillStyle = idx % 2 === 0 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.03)';
          ctx.fillRect(startX, 0, segWidth, height);

          // Boundary line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, height);
          ctx.stroke();
        }

        // Segment Index Tag
        ctx.fillStyle = idx === currentIdx ? '#fda4af' : (isEnabled ? '#64748b' : '#334155');
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        if (segWidth > 18) {
          ctx.fillText(`${idx + 1}${!isEnabled ? '✕' : ''}`, startX + 3, 4);
        }
      });
    }

    // 2. Draw Waveform Peaks
    const barWidth = width / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const peakTime = (i / peaks.length) * duration;
      const peak = peaks[i];

      const top = midY - (Math.abs(peak.max) * (height * 0.42));
      const bot = midY + (Math.abs(peak.min) * (height * 0.42));
      const barHeight = Math.max(1.5, bot - top);

      // Check if current peak falls inside active segment
      let isPeakInActiveSeg = false;
      if (currentIdx >= 0 && segments[currentIdx]) {
        const activeSeg = segments[currentIdx];
        if (peakTime >= activeSeg.start && peakTime <= activeSeg.end) {
          isPeakInActiveSeg = true;
        }
      }

      if (isPeakInActiveSeg) {
        ctx.fillStyle = '#fb7185';
      } else {
        ctx.fillStyle = '#475569';
      }

      ctx.fillRect(x, top, Math.max(1, barWidth - 0.5), barHeight);
    }

    // 3. Draw Real-time Playback Cursor
    if (duration > 0 && currentTime > 0) {
      const cursorX = (currentTime / duration) * width;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();

      // Top indicator triangle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cursorX - 4, 0);
      ctx.lineTo(cursorX + 4, 0);
      ctx.lineTo(cursorX, 6);
      ctx.closePath();
      ctx.fill();
    }
  }
}

window.WaveformCanvas = WaveformCanvas;
