/**
 * Main Application Controller & Echo Method State Machine
 * Prof. Karen Chung Echo Method: Listen -> Silent Echo 2s -> Mimic (Rec) -> Reveal -> Compare
 */

class EchoTrainerApp {
  constructor() {
    this.audioEngine = new AudioEngine();
    this.waveform = null;

    // Project state
    this.currentFileName = '';
    this.segments = [];
    this.currentIdx = 0;
    this.currentLoop = 1;
    this.maxLoop = 3;
    this.autoAdvance = true; // Auto-flow vs Self-paced
    this.echoWaitDuration = 2.0;
    this.mimicTimeMode = '1.8'; // Mimic duration setting: '1.4' | '1.8' | '2.5' | 'manual'
    this.replayMode = 'autoCompare'; // Replay mode setting: 'autoCompare' | 'autoSelf' | 'manual'

    // State machine: 'IDLE' | 'LISTEN' | 'ECHO' | 'MIMIC' | 'REVEAL'
    this.state = 'IDLE';
    this.timerId = null;
    this.countdownInterval = null;
    this.editingIdx = -1;

    // DOM references
    this.dom = {};
    this.cacheDom();
    this.initWaveform();
    this.bindEvents();
    this.bindKeyboardShortcuts();
  }

  cacheDom() {
    this.dom.audioFileInput = document.getElementById('audioFileInput');
    this.dom.jsonFileInput = document.getElementById('jsonFileInput');
    this.dom.btnSelectAudio = document.getElementById('btnSelectAudio');
    this.dom.btnLoadDemo = document.getElementById('btnLoadDemo');
    this.dom.audioFileName = document.getElementById('audioFileName');
    this.dom.audioDuration = document.getElementById('audioDuration');

    // Steps
    this.dom.stepNodes = [
      document.getElementById('step1'),
      document.getElementById('step2'),
      document.getElementById('step3'),
      document.getElementById('step4'),
      document.getElementById('step5')
    ];

    // Hero Visuals
    this.dom.timerSvgCircle = document.getElementById('timerSvgCircle');
    this.dom.timerCenterText = document.getElementById('timerCenterText');
    this.dom.phaseTitle = document.getElementById('phaseTitle');
    this.dom.phaseInstruction = document.getElementById('phaseInstruction');
    this.dom.micMeterContainer = document.getElementById('micMeterContainer');
    this.dom.micMeterBar = document.getElementById('micMeterBar');

    // Reveal & Compare
    this.dom.revealContainer = document.getElementById('revealContainer');
    this.dom.revealJp = document.getElementById('revealJp');
    this.dom.revealZh = document.getElementById('revealZh');
    this.dom.compareActions = document.getElementById('compareActions');
    this.dom.btnPlayOrigin = document.getElementById('btnPlayOrigin');
    this.dom.btnPlaySelf = document.getElementById('btnPlaySelf');
    this.dom.btnCompareAll = document.getElementById('btnCompareAll');
    this.dom.btnFinishMimicEarly = document.getElementById('btnFinishMimicEarly');

    // Main training controls
    this.dom.btnStartTraining = document.getElementById('btnStartTraining');
    this.dom.btnPauseTraining = document.getElementById('btnPauseTraining');
    this.dom.btnPrevSeg = document.getElementById('btnPrevSeg');
    this.dom.btnNextSeg = document.getElementById('btnNextSeg');
    this.dom.btnRepeatSeg = document.getElementById('btnRepeatSeg');
    this.dom.loopDisplay = document.getElementById('loopDisplay');

    // Settings Drawer
    this.dom.settingsDrawerCard = document.getElementById('settingsDrawerCard');
    this.dom.settingsDrawerHeader = document.getElementById('settingsDrawerHeader');
    this.dom.btnCollapseDrawer = document.getElementById('btnCollapseDrawer');
    this.dom.autoFlowToggle = document.getElementById('autoFlowToggle');
    this.dom.thresholdSlider = document.getElementById('thresholdSlider');
    this.dom.thresholdValue = document.getElementById('thresholdValue');
    this.dom.minSilenceSlider = document.getElementById('minSilenceSlider');
    this.dom.minSilenceValue = document.getElementById('minSilenceValue');
    this.dom.btnRedetect = document.getElementById('btnRedetect');

    // Segment List
    this.dom.segCountBadge = document.getElementById('segCountBadge');
    this.dom.btnToggleAllSegs = document.getElementById('btnToggleAllSegs');
    this.dom.segmentItemsList = document.getElementById('segmentItemsList');

    // Export/Import
    this.dom.btnExportJson = document.getElementById('btnExportJson');
    this.dom.btnExportAnki = document.getElementById('btnExportAnki');

    // Modal
    this.dom.editModal = document.getElementById('editModal');
    this.dom.modalSegTitle = document.getElementById('modalSegTitle');
    this.dom.editJpInput = document.getElementById('editJpInput');
    this.dom.editZhInput = document.getElementById('editZhInput');
    this.dom.modalRubyPreview = document.getElementById('modalRubyPreview');
    this.dom.btnWrapRuby = document.getElementById('btnWrapRuby');
    this.dom.modalStartTime = document.getElementById('modalStartTime');
    this.dom.modalEndTime = document.getElementById('modalEndTime');
    this.dom.btnSaveModal = document.getElementById('btnSaveModal');
    this.dom.btnCancelModal = document.getElementById('btnCancelModal');
    this.dom.btnSplitCurrent = document.getElementById('btnSplitCurrent');

    // Mobile Bottom Bar
    this.dom.mobileBottomBar = document.getElementById('mobileBottomBar');
    this.dom.mobileMainActionBtn = document.getElementById('mobileMainActionBtn');
    this.dom.mobileBtnPrev = document.getElementById('mobileBtnPrev');
    this.dom.mobileBtnRepeat = document.getElementById('mobileBtnRepeat');
    this.dom.mobileBtnNext = document.getElementById('mobileBtnNext');

    // Toast
    this.dom.toastContainer = document.getElementById('toastContainer');
  }

  initWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    this.waveform = new WaveformCanvas(canvas, {
      onSegmentClick: (segIdx) => {
        this.selectSegment(segIdx, true);
      }
    });
  }

  bindEvents() {
    // Audio upload
    if (this.dom.btnSelectAudio) {
      this.dom.btnSelectAudio.addEventListener('click', () => {
        // Unlock AudioContext on direct user tap (critical for iOS Safari)
        this.audioEngine.ensureAudioContext().catch(() => {});
        if (this.dom.btnSelectAudio.tagName !== 'LABEL') {
          this.dom.audioFileInput.click();
        }
      });
    }
    this.dom.audioFileInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleAudioFile(e.target.files[0]);
      }
      this.dom.audioFileInput.value = '';
    };
    if (this.dom.btnLoadDemo) {
      this.dom.btnLoadDemo.onclick = () => this.loadDemoExperience();
    }

    // JSON upload
    this.dom.jsonFileInput.onchange = (e) => this.handleJsonImport(e.target.files[0]);

    // Main buttons
    this.dom.btnStartTraining.onclick = () => this.startTraining();
    this.dom.btnPauseTraining.onclick = () => this.pauseTraining();
    this.dom.btnPrevSeg.onclick = () => this.prevSegment();
    this.dom.btnNextSeg.onclick = () => this.nextSegment();
    this.dom.btnRepeatSeg.onclick = () => this.repeatCurrent();
    this.dom.btnFinishMimicEarly.onclick = () => this.endMimicPhaseEarly();

    // Mobile Bottom Bar buttons
    if (this.dom.mobileMainActionBtn) {
      this.dom.mobileMainActionBtn.onclick = () => this.handleMobileMainAction();
    }
    if (this.dom.mobileBtnPrev) {
      this.dom.mobileBtnPrev.onclick = () => this.prevSegment();
    }
    if (this.dom.mobileBtnRepeat) {
      this.dom.mobileBtnRepeat.onclick = () => this.repeatCurrent();
    }
    if (this.dom.mobileBtnNext) {
      this.dom.mobileBtnNext.onclick = () => this.nextSegment();
    }

    // Step 5 comparison buttons
    this.dom.btnPlayOrigin.onclick = () => this.playCurrentOrigin();
    this.dom.btnPlaySelf.onclick = () => this.audioEngine.playSelfVoice();
    this.dom.btnCompareAll.onclick = () => this.playSequentialCompare();

    // Export buttons with iPhone Share Sheet & guidance
    this.dom.btnExportJson.onclick = async () => {
      const res = await StorageManager.exportJson(this.currentFileName, this.segments);
      if (res && res.cancelled) return;
      if (res && res.shared) {
        this.showToast('✅ 已開啟分享面板！可直接儲存至【檔案】或傳送', 4000);
      } else {
        this.showToast('✅ 已匯出字卡！iPhone 請至【檔案】App 的【下載項目】查看', 4500);
      }
    };
    this.dom.btnExportAnki.onclick = async () => {
      const res = await StorageManager.exportAnkiTsv(this.currentFileName, this.segments);
      if (res && res.cancelled) return;
      if (res && res.shared) {
        this.showToast('✅ 已開啟分享面板！可直接儲存至【檔案】或傳送', 4000);
      } else {
        this.showToast('✅ 已匯出 Anki 卡片！iPhone 請至【檔案】App 的【下載項目】查看', 4500);
      }
    };
    if (this.dom.btnToggleAllSegs) {
      this.dom.btnToggleAllSegs.onclick = () => this.toggleAllSegments();
    }

    // Settings Drawer
    this.initSettingsDrawer();

    // Silence detection sliders & collapsible controls
    const btnToggleWaveformControls = document.getElementById('btnToggleWaveformControls');
    const waveformControls = document.getElementById('waveformControls');
    const toggleControlsArrow = document.getElementById('toggleControlsArrow');
    const waveformControlsSummary = document.getElementById('waveformControlsSummary');

    const updateControlsSummary = () => {
      if (waveformControlsSummary && this.dom.thresholdSlider && this.dom.minSilenceSlider) {
        waveformControlsSummary.innerText = `${this.dom.thresholdSlider.value} · ${this.dom.minSilenceSlider.value}s`;
      }
    };

    if (btnToggleWaveformControls && waveformControls) {
      btnToggleWaveformControls.onclick = () => {
        const isCollapsed = waveformControls.classList.toggle('collapsed');
        btnToggleWaveformControls.classList.toggle('active', !isCollapsed);
        if (toggleControlsArrow) {
          toggleControlsArrow.innerText = isCollapsed ? '▾' : '▴';
        }
      };
    }

    if (this.dom.thresholdSlider) {
      this.dom.thresholdSlider.oninput = (e) => {
        if (this.dom.thresholdValue) this.dom.thresholdValue.innerText = e.target.value;
        updateControlsSummary();
      };
    }
    if (this.dom.minSilenceSlider) {
      this.dom.minSilenceSlider.oninput = (e) => {
        if (this.dom.minSilenceValue) this.dom.minSilenceValue.innerText = `${e.target.value}s`;
        updateControlsSummary();
      };
    }
    if (this.dom.btnRedetect) {
      this.dom.btnRedetect.onclick = () => this.redetectSegments();
    }

    // Modal events
    this.dom.editJpInput.oninput = () => this.updateModalRubyPreview();
    this.dom.btnWrapRuby.onclick = () => this.wrapSelectionWithRuby();
    this.dom.btnCancelModal.onclick = () => this.closeEditModal();
    this.dom.btnSaveModal.onclick = () => this.saveEditModal();
    this.dom.btnSplitCurrent.onclick = () => this.splitSegmentFromModal();

    // Modal time nudge buttons
    document.getElementById('nudgeStartMinus').onclick = () => this.nudgeModalTime('start', -0.1);
    document.getElementById('nudgeStartPlus').onclick = () => this.nudgeModalTime('start', 0.1);
    document.getElementById('nudgeEndMinus').onclick = () => this.nudgeModalTime('end', -0.1);
    document.getElementById('nudgeEndPlus').onclick = () => this.nudgeModalTime('end', 0.1);
  }

  initSettingsDrawer() {
    const card = this.dom.settingsDrawerCard;
    const header = this.dom.settingsDrawerHeader;
    const collapseBtn = this.dom.btnCollapseDrawer;

    if (header && card) {
      header.onclick = () => {
        card.classList.toggle('is-open');
        const hint = document.getElementById('drawerToggleText');
        if (hint) hint.innerText = card.classList.contains('is-open') ? '收起 ▴' : '設定 ▾';
      };
    }
    if (collapseBtn && card) {
      collapseBtn.onclick = (e) => {
        e.stopPropagation();
        card.classList.remove('is-open');
        const hint = document.getElementById('drawerToggleText');
        if (hint) hint.innerText = '設定 ▾';
      };
    }

    // Bind all segmented pill buttons
    document.querySelectorAll('.pill-group').forEach(group => {
      const prefType = group.dataset.pref;
      const buttons = group.querySelectorAll('.pill-btn');

      buttons.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.dataset.val;

          if (prefType === 'repeat') {
            this.maxLoop = parseInt(val, 10);
            this.updateLoopDisplay();
            this.updateDrawerSummary();
            this.showToast(`已切換單句重複：${this.maxLoop} 次`);
          } else if (prefType === 'speed') {
            this.audioEngine.playbackRate = parseFloat(val);
            this.updateDrawerSummary();
            this.showToast(`已切換語速：${val}x`);
          } else if (prefType === 'echoWait') {
            this.echoWaitDuration = parseFloat(val);
            this.updateDrawerSummary();
            this.showToast(`已設定回音留白：${val} 秒`);
          } else if (prefType === 'mimicTime') {
            this.mimicTimeMode = val;
            this.updateDrawerSummary();
            const desc = val === 'manual' ? '手動結束模式（說完請按 Space 鍵或按鈕）' : `${val}x 倍率`;
            this.showToast(`已切換開口時長：${desc}`);
          } else if (prefType === 'replayMode') {
            this.replayMode = val;
            this.updateDrawerSummary();
            let desc = '⚡ 自動連續對比 (原音 ➔ 己音)';
            if (val === 'autoSelf') desc = '🎙️ 自動播己音 (我的錄音)';
            if (val === 'manual') desc = '✋ 手動點選回放';
            this.showToast(`已切換回放模式：${desc}`);
          }
          this.saveCurrentState();
        };
      });
    });

    // Auto Advance Next Segment Toggle (自動播放下一句)
    if (this.dom.autoFlowToggle) {
      this.dom.autoFlowToggle.onchange = (e) => {
        this.autoAdvance = e.target.checked;
        this.updateDrawerSummary();
        this.saveCurrentState();
        this.showToast(this.autoAdvance ? '已開啟「自動播放下一句」' : '已切換為「手動播放下一句」');
      };
    }

    this.updateDrawerSummary();
  }

  syncPillButtonsFromState() {
    document.querySelectorAll('.pill-group').forEach(group => {
      const pref = group.dataset.pref;
      const buttons = group.querySelectorAll('.pill-btn');
      let targetVal = null;
      if (pref === 'repeat') targetVal = String(this.maxLoop);
      if (pref === 'speed') targetVal = String(this.audioEngine.playbackRate);
      if (pref === 'echoWait') targetVal = String(this.echoWaitDuration);
      if (pref === 'mimicTime') targetVal = this.mimicTimeMode;
      if (pref === 'replayMode') targetVal = this.replayMode;

      if (targetVal) {
        buttons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === targetVal);
        });
      }
    });
    if (this.dom.autoFlowToggle) {
      this.dom.autoFlowToggle.checked = this.autoAdvance;
    }
  }

  updateDrawerSummary() {
    const pillRepeat = document.getElementById('pillSummaryRepeat');
    const pillSpeed = document.getElementById('pillSummarySpeed');
    const pillEcho = document.getElementById('pillSummaryEcho');
    const pillMimic = document.getElementById('pillSummaryMimic');
    const pillReplay = document.getElementById('pillSummaryReplay');
    const pillFlow = document.getElementById('pillSummaryFlow');

    if (pillRepeat) pillRepeat.innerText = `${this.maxLoop}次`;
    if (pillSpeed) pillSpeed.innerText = `${this.audioEngine.playbackRate}x`;
    if (pillEcho) pillEcho.innerText = `留白${this.echoWaitDuration}s`;
    if (pillMimic) pillMimic.innerText = this.mimicTimeMode === 'manual' ? '手動' : `摹${this.mimicTimeMode}x`;
    if (pillReplay) {
      if (this.replayMode === 'autoCompare') {
        pillReplay.innerText = '自動對比';
        pillReplay.className = 'mini-pill pill-replay-on';
      } else if (this.replayMode === 'autoSelf') {
        pillReplay.innerText = '自動己音';
        pillReplay.className = 'mini-pill pill-replay-on';
      } else {
        pillReplay.innerText = '手動回放';
        pillReplay.className = 'mini-pill';
      }
    }
    if (pillFlow) {
      pillFlow.innerText = this.autoAdvance ? '自動換句' : '手動換句';
      pillFlow.className = `mini-pill ${this.autoAdvance ? 'pill-flow-on' : 'pill-flow-off'}`;
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in modal input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'IDLE') {
          this.startTraining();
        } else if (this.state === 'MIMIC') {
          // In mimic stage, Space immediately finishes speaking and proceeds to reveal!
          this.endMimicPhaseEarly();
        } else if (this.state === 'REVEAL') {
          // In reveal stage, Space acts as next or repeat
          if (this.currentLoop < this.maxLoop) {
            this.repeatCurrent();
          } else {
            this.nextSegment();
          }
        } else {
          this.pauseTraining();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.repeatCurrent();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevSegment();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.nextSegment();
      } else if (e.key === '1') {
        e.preventDefault();
        this.playCurrentOrigin();
      } else if (e.key === '2') {
        e.preventDefault();
        this.audioEngine.playSelfVoice();
      } else if (e.key === '3') {
        e.preventDefault();
        this.playSequentialCompare();
      }
    });
  }

  /**
   * Handle loading MP3 file
   */
  async handleAudioFile(file) {
    if (!file) return;
    this.currentFileName = file.name;
    this.dom.audioFileName.innerText = file.name;
    this.dom.audioFileName.title = file.name;
    this.setPhaseHero('LOADING', '正在解碼音訊波形...', '請稍候，系統正透過 Web Audio API 進行高精準採樣');

    try {
      const buffer = await this.audioEngine.loadAudioFile(file);
      const minutes = Math.floor(buffer.duration / 60);
      const seconds = Math.floor(buffer.duration % 60);
      this.dom.audioDuration.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Check for saved project in LocalStorage first
      const savedProject = StorageManager.loadProject(file.name);
      if (savedProject && savedProject.segments && savedProject.segments.length > 0) {
        this.segments = savedProject.segments;
        if (savedProject.settings) {
          if (savedProject.settings.maxLoop) this.maxLoop = savedProject.settings.maxLoop;
          if (savedProject.settings.playbackRate) this.audioEngine.playbackRate = savedProject.settings.playbackRate;
          if (savedProject.settings.echoWaitDuration) this.echoWaitDuration = savedProject.settings.echoWaitDuration;
          if (savedProject.settings.mimicTimeMode) this.mimicTimeMode = savedProject.settings.mimicTimeMode;
          if (savedProject.settings.replayMode) this.replayMode = savedProject.settings.replayMode;
          if (typeof savedProject.settings.autoAdvance === 'boolean') this.autoAdvance = savedProject.settings.autoAdvance;
          this.syncPillButtonsFromState();
          this.updateDrawerSummary();
        }
        this.showToast('已從本機暫存載入先前練習紀錄！');
      } else {
        // Run auto silence detection
        const threshold = parseFloat(this.dom.thresholdSlider.value);
        const minSilence = parseFloat(this.dom.minSilenceSlider.value);
        this.segments = this.audioEngine.detectSegments(threshold, minSilence);
        this.showToast(`智慧斷句完成，偵測出 ${this.segments.length} 個發音段落！`);
      }

      // Generate Peaks for Waveform Canvas
      const peaks = this.audioEngine.getWaveformPeaks(1000);
      this.waveform.setData(peaks, buffer.duration, this.segments);

      this.currentIdx = 0;
      this.currentLoop = 1;
      this.renderSegmentList();
      this.dom.btnStartTraining.disabled = false;
      this.setPhaseHero('READY', '音檔準備完畢', '點擊「開始回音法訓練」或按空白鍵 Space 開始');
    } catch (err) {
      console.error(err);
      alert('音檔載入失敗，請確認檔案格式是否支援（建議 MP3 / M4A / WAV）');
      this.setPhaseHero('IDLE', '載入失敗', '請重新選取音檔');
    }
  }

  /**
   * Load built-in demo project
   */
  async loadDemoExperience() {
    this.currentFileName = 'sample_audio.wav';
    this.dom.audioFileName.innerText = '示範：日語自我介紹與重音訓練.wav';
    this.setPhaseHero('LOADING', '正在載入示範專案...', '系統正載入體驗音檔與字卡');

    try {
      const buffer = await this.audioEngine.loadAudioFromUrl('./sample_audio.wav');
      const minutes = Math.floor(buffer.duration / 60);
      const seconds = Math.floor(buffer.duration % 60);
      this.dom.audioDuration.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Load sample JSON
      const resp = await fetch('./sample_data.json');
      const sampleSegments = await resp.json();
      this.segments = sampleSegments;

      const peaks = this.audioEngine.getWaveformPeaks(1000);
      this.waveform.setData(peaks, buffer.duration, this.segments);

      this.currentIdx = 0;
      this.currentLoop = 1;
      this.renderSegmentList();
      this.dom.btnStartTraining.disabled = false;
      this.setPhaseHero('READY', '示範專案載入成功！', '請點擊「開始回音法訓練」或按空白鍵 Space 開始體驗');
      this.showToast('已載入示範音檔與字卡！');
    } catch (err) {
      console.error(err);
      this.showToast('載入範例失敗：' + err.message);
    }
  }

  /**
   * Re-run silence detection with current sliders
   */
  redetectSegments() {
    if (!this.audioEngine.audioBuffer) {
      alert('請先載入音檔！');
      return;
    }
    if (this.segments.some(s => s.jp || s.zh)) {
      if (!confirm('重新斷句將重置現有切點，已輸入的文字可能無法對應。是否確定重新斷句？')) {
        return;
      }
    }

    const threshold = parseFloat(this.dom.thresholdSlider.value);
    const minSilence = parseFloat(this.dom.minSilenceSlider.value);
    this.segments = this.audioEngine.detectSegments(threshold, minSilence);
    this.currentIdx = 0;
    this.waveform.setSegments(this.segments);
    this.renderSegmentList();
    this.saveCurrentState();
    this.showToast(`已套用新靈敏度，重新劃分 ${this.segments.length} 句`);
  }

  /**
   * Import JSON card file
   */
  async handleJsonImport(file) {
    if (!file) return;
    try {
      const imported = await StorageManager.importJsonFile(file);
      this.segments = imported;
      this.waveform.setSegments(this.segments);
      this.renderSegmentList();
      this.saveCurrentState();
      this.showToast(`成功匯入 ${imported.length} 句字卡！`);
    } catch (err) {
      alert('匯入失敗：' + err.message);
    }
  }

  hasAnyEnabledSegments() {
    return this.segments.some(s => s.enabled !== false);
  }

  getNextEnabledIndex(startIdx, forward = true) {
    if (forward) {
      for (let i = startIdx; i < this.segments.length; i++) {
        if (this.segments[i].enabled !== false) return i;
      }
    } else {
      for (let i = startIdx; i >= 0; i--) {
        if (this.segments[i].enabled !== false) return i;
      }
    }
    return -1;
  }

  /**
   * Main Training State Loop
   */
  async startTraining() {
    if (!this.audioEngine.audioBuffer) {
      alert('請先載入音檔才能開始訓練！');
      return;
    }
    if (!this.segments.length) {
      alert('請先載入音檔並完成斷句！');
      return;
    }
    if (!this.hasAnyEnabledSegments()) {
      alert('目前沒有勾選任何段落！請至少勾選 1 句進行練習。');
      return;
    }

    // Ensure AudioContext and HTML5 Audio are pre-unlocked on direct user gesture
    await this.audioEngine.ensureAudioContext();

    // Initialize microphone permissions
    const micOk = await this.audioEngine.setupMic();
    if (!micOk) {
      this.showToast('提示：未開啟麥克風權限，開口模仿將無法錄音對比。');
    }

    this.dom.btnStartTraining.style.display = 'none';
    this.dom.btnPauseTraining.style.display = 'inline-flex';

    // If current segment is disabled, start from first enabled segment
    if (this.currentIdx >= this.segments.length || this.segments[this.currentIdx].enabled === false) {
      const firstEnabled = this.getNextEnabledIndex(0, true);
      this.currentIdx = firstEnabled !== -1 ? firstEnabled : 0;
      this.currentLoop = 1;
    }

    this.runStep1Listen();
  }

  pauseTraining() {
    this.state = 'IDLE';
    this.clearTimers();
    this.audioEngine.stopPlayback();
    this.audioEngine.stopRecording();
    this.dom.micMeterContainer.style.display = 'none';

    this.dom.btnStartTraining.style.display = 'inline-flex';
    this.dom.btnPauseTraining.style.display = 'none';
    this.setPhaseHero('PAUSED', '訓練已暫停', '隨時點擊繼續或按 Space 鍵恢復訓練');
  }

  clearTimers() {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.timerId = null;
    this.countdownInterval = null;
  }

  /**
   * STEP 1: Listen (專注聆聽)
   */
  runStep1Listen() {
    this.state = 'LISTEN';
    this.clearTimers();
    this.updateStepIndicators(1);
    this.updateLoopDisplay();
    this.waveform.setActiveSegment(this.currentIdx);
    this.scrollSegmentIntoView(this.currentIdx);

    // Hide text and comparison bar
    this.dom.revealContainer.style.display = 'none';
    this.dom.compareActions.style.display = 'none';
    this.dom.micMeterContainer.style.display = 'none';
    this.dom.btnFinishMimicEarly.style.display = 'none';
    this.dom.btnCompareAll.innerHTML = '⚡ 連續對比 (原音 ➔ 己音)';
    this.dom.btnPlaySelf.innerText = '🎙 播放己音 (我的錄音)';

    const seg = this.segments[this.currentIdx];
    const duration = (seg.end - seg.start) / this.audioEngine.playbackRate;

    this.setPhaseHero(
      'LISTEN',
      `STEP 1：專注聆聽 (第 ${this.currentIdx + 1} 句)`,
      '耳朵專注捕捉母語發音、高低音起伏（Pitch Accent）與停頓長度'
    );

    // Animate circular ring during playback
    this.startRingCountdown(duration, () => {
      // Finished playing original -> Transition to STEP 2
      this.runStep2Echo();
    });

    this.audioEngine.playSegment(
      seg.start,
      seg.end,
      this.audioEngine.playbackRate,
      (currTime) => this.waveform.setCurrentTime(currTime)
    );
  }

  /**
   * STEP 2: Echo 2s (強制留白 2 秒・內心回放)
   */
  runStep2Echo() {
    this.state = 'ECHO';
    this.clearTimers();
    this.updateStepIndicators(2);

    this.setPhaseHero(
      'ECHO',
      'STEP 2：大腦回音中...',
      '嘴巴緊閉！讓剛才的聲音在腦海神經中自然共鳴迴響（Echoic Memory）'
    );

    const echoSec = this.echoWaitDuration;
    this.startRingCountdown(echoSec, () => {
      // Echo wait completed -> Transition to STEP 3
      this.runStep3Mimic();
    });
  }

  /**
   * STEP 3: Mimic & Record (開口模仿)
   */
  runStep3Mimic() {
    this.state = 'MIMIC';
    this.clearTimers();
    this.updateStepIndicators(3);

    const seg = this.segments[this.currentIdx];
    const duration = (seg.end - seg.start) / this.audioEngine.playbackRate;
    const isManual = this.mimicTimeMode === 'manual';

    this.setPhaseHero(
      'MIMIC',
      'STEP 3：換你開口模仿！',
      isManual
        ? '請從容模仿發音，說完請按【空白鍵 Space】或下方按鈕進入揭曉'
        : '依據剛才的大腦心像模仿發音（若提早說完可按 Space 提前揭曉）'
    );

    // Show mic meter & early finish button
    this.dom.micMeterContainer.style.display = 'block';
    this.dom.btnFinishMimicEarly.style.display = 'inline-flex';

    this.audioEngine.startRecording((level) => {
      this.dom.micMeterBar.style.width = `${level}%`;
    });

    if (isManual) {
      // Manual mode: displays elapsed time without rushing, with generous 45s safety limit
      this.startElapsedTimer(45.0, () => {
        this.endMimicPhaseEarly();
      });
    } else {
      const multiplier = parseFloat(this.mimicTimeMode) || 1.8;
      // Generous formula: minimum 4.5s, duration * multiplier + 2.0s buffer
      const mimicTime = Math.max(4.5, parseFloat((duration * multiplier + 2.0).toFixed(1)));
      this.startRingCountdown(mimicTime, () => {
        this.endMimicPhaseEarly();
      });
    }
  }

  startElapsedTimer(maxSeconds, onTimeout) {
    const circumference = 283;
    let elapsed = 0;
    const intervalMs = 100;

    this.dom.timerSvgCircle.style.strokeDashoffset = circumference;
    this.dom.timerCenterText.innerText = '0.0';

    this.countdownInterval = setInterval(() => {
      elapsed += intervalMs / 1000;
      this.dom.timerCenterText.innerText = elapsed.toFixed(1);
      // Gentle breathing pulse on ring
      const pulse = (Math.sin(elapsed * 3) + 1) / 2;
      this.dom.timerSvgCircle.style.strokeDashoffset = circumference * (0.8 - pulse * 0.4);

      if (elapsed >= maxSeconds) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        if (onTimeout) onTimeout();
      }
    }, intervalMs);
  }

  async endMimicPhaseEarly() {
    if (this.state !== 'MIMIC') return;
    this.clearTimers();
    this.dom.micMeterContainer.style.display = 'none';
    this.dom.btnFinishMimicEarly.style.display = 'none';
    await this.audioEngine.stopRecording();
    this.runStep4And5Reveal();
  }

  /**
   * STEP 4 & 5: Reveal & Compare (答案揭曉與雙音對比)
   */
  runStep4And5Reveal() {
    this.state = 'REVEAL';
    this.clearTimers();
    this.updateStepIndicators(4);

    const seg = this.segments[this.currentIdx];

    this.setPhaseHero(
      'REVEAL',
      'STEP 4 & 5：答案揭曉與雙音對比',
      this.replayMode === 'manual'
        ? '檢視振假名與文字，點選下方按鈕比對自己的發音與母語者的語調差異'
        : '檢視振假名與文字，系統正自動為您回放比對發音與母語者的語調差異'
    );

    // Reveal text
    const rubyHtml = FuriganaParser.toRubyHtml(seg.jp || '<span style="color:#64748b">(尚未標註日語文字)</span>');
    this.dom.revealJp.innerHTML = rubyHtml;
    this.dom.revealZh.innerText = seg.zh || '(尚未標註中譯)';
    this.dom.revealContainer.style.display = 'block';
    this.dom.compareActions.style.display = 'flex';

    // Highlight comparison node
    setTimeout(() => this.updateStepIndicators(5), 600);

    // Helper for scheduling next loop / segment
    const scheduleAutoAdvance = (delayMs = 2000) => {
      if (!this.autoAdvance) return;
      this.clearTimers();
      this.timerId = setTimeout(() => {
        if (this.state !== 'REVEAL') return;
        this.advanceLoopOrNext();
      }, delayMs);
    };

    // Execute configured replay mode
    if (this.replayMode === 'autoCompare') {
      // Auto sequential comparison: Original -> Pause 350ms -> User Voice
      this.timerId = setTimeout(() => {
        if (this.state !== 'REVEAL') return;
        this.playSequentialCompare(() => {
          scheduleAutoAdvance(2000);
        });
      }, 350);
    } else if (this.replayMode === 'autoSelf') {
      // Auto play user's voice
      this.timerId = setTimeout(() => {
        if (this.state !== 'REVEAL') return;
        this.dom.btnPlaySelf.innerText = '🎙 播放己音中...';
        this.audioEngine.playSelfVoice(() => {
          this.dom.btnPlaySelf.innerText = '🎙 播放己音 (我的錄音)';
          scheduleAutoAdvance(2000);
        });
      }, 350);
    } else {
      // Manual mode: wait for user action or default cruise advance
      if (this.autoAdvance) {
        const waitTime = Math.max(4500, (seg.end - seg.start) * 1000 + 3000);
        this.timerId = setTimeout(() => {
          if (this.state !== 'REVEAL') return;
          this.advanceLoopOrNext();
        }, waitTime);
      }
    }
  }

  advanceLoopOrNext() {
    if (this.currentLoop < this.maxLoop) {
      this.currentLoop++;
      this.runStep1Listen();
    } else {
      this.currentLoop = 1;
      const nextIdx = this.getNextEnabledIndex(this.currentIdx + 1, true);
      if (nextIdx !== -1) {
        this.currentIdx = nextIdx;
        this.runStep1Listen();
      } else {
        // Finished all selected sentences!
        this.state = 'IDLE';
        this.updateStepIndicators(0);
        this.setPhaseHero('DONE', '🎉 已完成所有勾選段落訓練！', '太棒了！您所選取的訓練段落已全數練習完畢。');
        this.dom.btnStartTraining.style.display = 'inline-flex';
        this.dom.btnPauseTraining.style.display = 'none';
      }
    }
  }

  repeatCurrent() {
    if (this.state === 'IDLE') {
      this.startTraining();
      return;
    }
    this.runStep1Listen();
  }

  prevSegment() {
    const prevIdx = this.getNextEnabledIndex(this.currentIdx - 1, false);
    if (prevIdx !== -1) {
      this.currentIdx = prevIdx;
      this.currentLoop = 1;
      this.runStep1Listen();
    } else {
      this.showToast('已經是第一個勾選的段落了！');
    }
  }

  nextSegment() {
    const nextIdx = this.getNextEnabledIndex(this.currentIdx + 1, true);
    if (nextIdx !== -1) {
      this.currentIdx = nextIdx;
      this.currentLoop = 1;
      this.runStep1Listen();
    } else {
      this.showToast('已經是最後一個勾選的段落了！');
    }
  }

  selectSegment(idx, autoPlay = false) {
    if (idx < 0 || idx >= this.segments.length) return;
    this.currentIdx = idx;
    this.currentLoop = 1;
    this.renderSegmentList();
    this.waveform.setActiveSegment(idx);

    if (autoPlay) {
      this.startTraining();
    }
  }

  /**
   * Comparison Playback Helpers
   */
  playCurrentOrigin() {
    const seg = this.segments[this.currentIdx];
    this.audioEngine.playSegment(seg.start, seg.end, this.audioEngine.playbackRate);
  }

  playSequentialCompare(onComplete = null) {
    const seg = this.segments[this.currentIdx];
    this.dom.btnCompareAll.innerText = '正在連續對比中...';
    this.audioEngine.playCompareSequence(
      seg.start,
      seg.end,
      this.audioEngine.playbackRate,
      (stage) => {
        if (stage === 'origin') this.dom.btnCompareAll.innerText = '🔊 播放原音中...';
        if (stage === 'gap') this.dom.btnCompareAll.innerText = '⏸ 短暫留白...';
        if (stage === 'self') this.dom.btnCompareAll.innerText = '🎙 播放己音中...';
      },
      () => {
        this.dom.btnCompareAll.innerHTML = '⚡ 連續對比 (原音 ➔ 己音)';
        if (onComplete) onComplete();
      },
      (currTime) => {
        if (this.waveform) this.waveform.setCurrentTime(currTime);
      }
    );
  }

  /**
   * Circular Timer Helper
   */
  startRingCountdown(totalSeconds, onFinished) {
    const circumference = 283; // 2 * pi * r (r=45)
    let elapsed = 0;
    const intervalMs = 50;

    this.dom.timerSvgCircle.style.strokeDashoffset = 0;
    this.dom.timerCenterText.innerText = totalSeconds.toFixed(1);

    this.countdownInterval = setInterval(() => {
      elapsed += intervalMs / 1000;
      const remaining = Math.max(0, totalSeconds - elapsed);
      const progressRatio = elapsed / totalSeconds;
      const offset = circumference * progressRatio;

      this.dom.timerSvgCircle.style.strokeDashoffset = Math.min(circumference, offset);
      this.dom.timerCenterText.innerText = remaining.toFixed(1);

      if (remaining <= 0.05) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.dom.timerSvgCircle.style.strokeDashoffset = circumference;
        if (onFinished) onFinished();
      }
    }, intervalMs);
  }

  setPhaseHero(stateKey, title, instruction) {
    this.dom.phaseTitle.innerText = title;
    this.dom.phaseInstruction.innerText = instruction;

    // Change circle color by state
    if (stateKey === 'LISTEN') {
      this.dom.timerSvgCircle.style.stroke = '#3b82f6';
    } else if (stateKey === 'ECHO') {
      this.dom.timerSvgCircle.style.stroke = '#f43f5e';
    } else if (stateKey === 'MIMIC') {
      this.dom.timerSvgCircle.style.stroke = '#10b981';
    } else {
      this.dom.timerSvgCircle.style.stroke = '#f59e0b';
    }

    this.syncMobileBarState();
  }

  syncMobileBarState() {
    if (!this.dom.mobileMainActionBtn) return;
    const btn = this.dom.mobileMainActionBtn;

    btn.classList.remove('btn-mimic-active');

    if (this.state === 'IDLE') {
      btn.innerText = '▶ 開始回音法訓練';
      btn.className = 'btn btn-primary mobile-main-btn';
    } else if (this.state === 'LISTEN') {
      btn.innerText = `⏸ 暫停 (第 ${this.currentIdx + 1} 句)`;
      btn.className = 'btn btn-secondary mobile-main-btn';
    } else if (this.state === 'ECHO') {
      btn.innerText = '⏳ 大腦回音中...';
      btn.className = 'btn btn-secondary mobile-main-btn';
    } else if (this.state === 'MIMIC') {
      btn.innerText = '🎙️ 我說完了（按此揭曉）';
      btn.className = 'btn mobile-main-btn btn-mimic-active';
    } else if (this.state === 'REVEAL') {
      if (this.currentLoop < this.maxLoop) {
        btn.innerText = `🔁 再練一次 (${this.currentLoop}/${this.maxLoop})`;
      } else {
        btn.innerText = '⏭ 下一句 (換句)';
      }
      btn.className = 'btn btn-primary mobile-main-btn';
    }
  }

  handleMobileMainAction() {
    if (this.state === 'IDLE') {
      this.startTraining();
    } else if (this.state === 'MIMIC') {
      // Replaces physical spacebar on mobile devices!
      this.endMimicPhaseEarly();
    } else if (this.state === 'REVEAL') {
      if (this.currentLoop < this.maxLoop) {
        this.repeatCurrent();
      } else {
        this.nextSegment();
      }
    } else if (this.state === 'LISTEN' || this.state === 'ECHO') {
      this.pauseTraining();
    }
  }

  updateStepIndicators(activeStepNum) {
    this.dom.stepNodes.forEach((node, index) => {
      const stepNum = index + 1;
      node.classList.remove('active', 'completed');
      if (stepNum === activeStepNum) {
        node.classList.add('active');
      } else if (stepNum < activeStepNum) {
        node.classList.add('completed');
      }
    });
  }

  updateLoopDisplay() {
    this.dom.loopDisplay.innerText = `${this.currentLoop} / ${this.maxLoop}`;
  }

  /**
   * Render Segments List
   */
  renderSegmentList() {
    const totalCount = this.segments.length;
    const enabledCount = this.segments.filter(s => s.enabled !== false).length;
    this.dom.segCountBadge.innerText = `${enabledCount} / ${totalCount} 句參與`;
    this.dom.segmentItemsList.innerHTML = '';

    this.segments.forEach((seg, idx) => {
      const isEnabled = seg.enabled !== false;
      const div = document.createElement('div');
      div.className = `segment-item ${idx === this.currentIdx ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`;

      const rubyHtml = seg.jp
        ? FuriganaParser.toRubyHtml(seg.jp)
        : '<span style="color:#64748b; font-style: italic;">(點擊右側鉛筆標註文字)</span>';

      div.innerHTML = `
        <div class="segment-body">
          <label class="seg-checkbox-wrapper" title="${isEnabled ? '已包含在練習中（點擊取消）' : '已略過此句（點擊加入練習）'}" onclick="event.stopPropagation()">
            <input type="checkbox" class="seg-checkbox" ${isEnabled ? 'checked' : ''} onchange="window.app.toggleSegmentEnabled(${idx}, event)">
          </label>
          <div class="segment-text-col" onclick="window.app.selectSegment(${idx}, false)">
            <div class="seg-meta">
              <span class="seg-index">#${idx + 1}</span>
              ${!isEnabled ? '<span class="seg-skip-badge">略過不練</span>' : ''}
              <span class="seg-tag">${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s</span>
              <span class="seg-tag" style="background: rgba(244,63,94,0.1); color:#fda4af;">${(seg.end - seg.start).toFixed(1)}s</span>
            </div>
            <div class="seg-text">${rubyHtml}</div>
            ${seg.zh ? `<div class="seg-zh">${seg.zh}</div>` : ''}
          </div>
        </div>
        <div class="seg-actions">
          <button class="btn btn-secondary btn-sm seg-action-btn" title="試聽此句" onclick="window.app.previewSegment(${idx})">▶ 試聽</button>
          <button class="btn btn-secondary btn-sm seg-action-btn" title="編輯文字與微調" onclick="window.app.openEditModal(${idx})">✏ 編輯</button>
          ${idx < this.segments.length - 1 ? `<button class="btn btn-secondary btn-sm seg-action-btn" title="與下一句合併" onclick="window.app.mergeWithNext(${idx})">🔗 合併</button>` : ''}
        </div>
      `;

      this.dom.segmentItemsList.appendChild(div);
    });
  }

  toggleSegmentEnabled(idx, event) {
    if (event) event.stopPropagation();
    const seg = this.segments[idx];
    seg.enabled = (seg.enabled === false) ? true : false;
    this.renderSegmentList();
    this.waveform.render();
    this.saveCurrentState();
  }

  toggleAllSegments() {
    const hasDisabled = this.segments.some(s => s.enabled === false);
    // If any are disabled, turn all ON. If all are enabled, turn all OFF.
    const targetState = hasDisabled ? true : false;
    this.segments.forEach(s => s.enabled = targetState);
    this.renderSegmentList();
    this.waveform.render();
    this.saveCurrentState();
    this.showToast(targetState ? '已勾選全部段落參與練習！' : '已取消勾選全部段落！');
  }

  scrollSegmentIntoView(idx) {
    const items = this.dom.segmentItemsList.children;
    if (items[idx]) {
      items[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  previewSegment(idx) {
    const seg = this.segments[idx];
    this.waveform.setActiveSegment(idx);
    this.audioEngine.playSegment(seg.start, seg.end, this.audioEngine.playbackRate, (t) => {
      this.waveform.setCurrentTime(t);
    });
  }

  mergeWithNext(idx) {
    if (idx >= this.segments.length - 1) return;
    const current = this.segments[idx];
    const next = this.segments[idx + 1];

    current.end = next.end;
    if (next.jp) current.jp = (current.jp ? current.jp + ' ' : '') + next.jp;
    if (next.zh) current.zh = (current.zh ? current.zh + ' ' : '') + next.zh;

    this.segments.splice(idx + 1, 1);
    this.waveform.setSegments(this.segments);
    this.renderSegmentList();
    this.saveCurrentState();
    this.showToast(`已成功合併第 ${idx + 1} 與第 ${idx + 2} 句`);
  }

  /**
   * Modal Segment Editor
   */
  openEditModal(idx) {
    this.editingIdx = idx;
    const seg = this.segments[idx];

    this.dom.modalSegTitle.innerText = `編輯第 ${idx + 1} 句時間與字卡`;
    // If it contains ruby tags, convert to friendly bracket format
    this.dom.editJpInput.value = FuriganaParser.toBracketFormat(seg.jp);
    this.dom.editZhInput.value = seg.zh || '';
    this.dom.modalStartTime.innerText = `${seg.start.toFixed(2)}s`;
    this.dom.modalEndTime.innerText = `${seg.end.toFixed(2)}s`;

    this.updateModalRubyPreview();
    this.dom.editModal.style.display = 'flex';
  }

  closeEditModal() {
    this.dom.editModal.style.display = 'none';
    this.editingIdx = -1;
  }

  updateModalRubyPreview() {
    const text = this.dom.editJpInput.value;
    const html = FuriganaParser.toRubyHtml(text);
    this.dom.modalRubyPreview.innerHTML = html || '<span style="color:#64748b">輸入例如「私[わたし]」即時呈現振假名</span>';
  }

  wrapSelectionWithRuby() {
    const input = this.dom.editJpInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.substring(start, end);

    if (!selected) {
      alert('請先在輸入框中選取漢字，再點選此按鈕！');
      return;
    }

    const replacement = `${selected}[ふりがな]`;
    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
    this.updateModalRubyPreview();
    input.focus();
    // Select the placeholder "ふりがな" so user can immediately type kana
    input.setSelectionRange(start + selected.length + 1, start + selected.length + 5);
  }

  nudgeModalTime(type, delta) {
    if (this.editingIdx === -1) return;
    const seg = this.segments[this.editingIdx];

    if (type === 'start') {
      const newStart = Math.max(0, seg.start + delta);
      if (newStart < seg.end - 0.2) {
        seg.start = parseFloat(newStart.toFixed(2));
      }
    } else if (type === 'end') {
      const newEnd = Math.min(this.audioEngine.audioBuffer.duration, seg.end + delta);
      if (newEnd > seg.start + 0.2) {
        seg.end = parseFloat(newEnd.toFixed(2));
      }
    }

    this.dom.modalStartTime.innerText = `${seg.start.toFixed(2)}s`;
    this.dom.modalEndTime.innerText = `${seg.end.toFixed(2)}s`;
    this.waveform.render();
  }

  splitSegmentFromModal() {
    if (this.editingIdx === -1) return;
    const seg = this.segments[this.editingIdx];
    const duration = seg.end - seg.start;
    if (duration < 1.0) {
      alert('此段落太短（小於1秒），無法拆分！');
      return;
    }

    const mid = parseFloat((seg.start + duration / 2).toFixed(2));
    const newSeg = {
      start: mid,
      end: seg.end,
      jp: '',
      zh: ''
    };
    seg.end = mid;

    this.segments.splice(this.editingIdx + 1, 0, newSeg);
    this.closeEditModal();
    this.waveform.setSegments(this.segments);
    this.renderSegmentList();
    this.saveCurrentState();
    this.showToast(`已拆分為兩段：${seg.start}s~${mid}s 與 ${mid}s~${newSeg.end}s`);
  }

  saveEditModal() {
    if (this.editingIdx === -1) return;
    const seg = this.segments[this.editingIdx];

    const rawJp = this.dom.editJpInput.value.trim();
    seg.jp = FuriganaParser.toRubyHtml(rawJp);
    seg.zh = this.dom.editZhInput.value.trim();

    this.closeEditModal();
    this.renderSegmentList();
    this.saveCurrentState();
    this.showToast('段落文字與時間已儲存！');
  }

  saveCurrentState() {
    if (!this.currentFileName) return;
    StorageManager.saveProject(this.currentFileName, this.segments, {
      maxLoop: this.maxLoop,
      playbackRate: this.audioEngine.playbackRate,
      echoWaitDuration: this.echoWaitDuration,
      mimicTimeMode: this.mimicTimeMode,
      replayMode: this.replayMode,
      autoAdvance: this.autoAdvance
    });
  }

  showToast(msg, duration = 2800) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new EchoTrainerApp();
});
