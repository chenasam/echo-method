/**
 * Storage & Data Export/Import Module
 * Supports LocalStorage auto-save, JSON import/export compatible with manual,
 * and Anki Deck TSV export for spaced-repetition flashcards.
 */

const StorageManager = {
  getStorageKey(filename) {
    return `echo_trainer_project_${filename || 'default'}`;
  },

  /**
   * Save current project segments & metadata to LocalStorage
   */
  saveProject(filename, segments, settings = {}) {
    if (!filename) return false;
    try {
      const data = {
        filename,
        updatedAt: new Date().toISOString(),
        segments,
        settings
      };
      localStorage.setItem(this.getStorageKey(filename), JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
      return false;
    }
  },

  /**
   * Load saved project data by filename
   */
  loadProject(filename) {
    if (!filename) return null;
    try {
      const raw = localStorage.getItem(this.getStorageKey(filename));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
      return null;
    }
  },

  /**
   * Export segments as JSON (supports Web Share API on mobile & standard download fallback)
   */
  async exportJson(filename, segments) {
    if (!segments || !segments.length) {
      alert('目前沒有段落可匯出');
      return null;
    }

    const cleanSegments = segments.map(seg => ({
      start: parseFloat(seg.start.toFixed(2)),
      end: parseFloat(seg.end.toFixed(2)),
      jp: seg.jp || '',
      zh: seg.zh || '',
      enabled: seg.enabled !== false
    }));

    const jsonStr = JSON.stringify(cleanSegments, null, 2);
    const baseName = filename ? filename.replace(/\.[^/.]+$/, '') : '日文回音字卡';
    const finalName = `${baseName}_回音字卡.json`;
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

    // Try iOS / Mobile native Web Share API
    if (navigator.canShare) {
      try {
        const file = new File([blob], finalName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: finalName,
            files: [file]
          });
          return { shared: true, filename: finalName };
        }
      } catch (e) {
        if (e.name === 'AbortError') return { cancelled: true };
        console.warn('Web Share failed, falling back to download:', e);
      }
    }

    // Standard download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { shared: false, filename: finalName };
  },

  /**
   * Import JSON and parse segments
   */
  async importJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (Array.isArray(parsed)) {
            const validated = parsed.map(item => ({
              start: Number(item.start) || 0,
              end: Number(item.end) || 0,
              jp: item.jp || '',
              zh: item.zh || '',
              enabled: item.enabled !== false
            }));
            resolve(validated);
          } else {
            reject(new Error('JSON 格式不符：需為段落陣列'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  /**
   * Export to Anki Flashcards (Tab-separated values)
   * Front: Japanese with HTML Ruby
   * Back: Chinese translation + Audio Time Range
   */
  async exportAnkiTsv(filename, segments) {
    if (!segments || !segments.length) {
      alert('目前沒有段落可匯出');
      return null;
    }

    const rows = segments.map((seg, idx) => {
      const front = FuriganaParser.toRubyHtml(seg.jp || `第 ${idx + 1} 句`);
      const back = `${seg.zh || ''}<br><small style="color:#64748b">(${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s)</small>`;
      // TSV format: Front \t Back
      return `"${front.replace(/"/g, '""')}"\t"${back.replace(/"/g, '""')}"`;
    });

    const tsvContent = rows.join('\n');
    const baseName = filename ? filename.replace(/\.[^/.]+$/, '') : '日文回音字卡';
    const finalName = `${baseName}_Anki卡片.tsv`;
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });

    // Try iOS / Mobile native Web Share API
    if (navigator.canShare) {
      try {
        const file = new File([blob], finalName, { type: 'text/tab-separated-values' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: finalName,
            files: [file]
          });
          return { shared: true, filename: finalName };
        }
      } catch (e) {
        if (e.name === 'AbortError') return { cancelled: true };
        console.warn('Web Share failed, falling back to download:', e);
      }
    }

    // Standard download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { shared: false, filename: finalName };
  }
};

window.StorageManager = StorageManager;
