/**
 * Furigana Parser & Ruby Utility
 * Allows user to type "私[わたし]" or "日本(にほん)" and transforms to HTML5 <ruby> tags.
 * Also reverses <ruby> into friendly bracket format for editing.
 */
const FuriganaParser = {
  /**
   * Convert friendly bracket notation to HTML <ruby> tags
   * Supports:
   * 1. 漢字[かんじ] -> <ruby>漢字<rt>かんじ</rt></ruby>
   * 2. 漢字(かんじ) -> <ruby>漢字<rt>かんじ</rt></ruby>
   * 3. Already existing <ruby>...</ruby> tags are preserved
   */
  toRubyHtml(text) {
    if (!text) return '';
    let processed = text;

    // First check if it already contains <ruby> tags
    if (processed.includes('<ruby>') && processed.includes('</ruby>')) {
      return processed;
    }

    // Pattern 1: Kanji followed by [kana] e.g. 日本[にほん] or 私[わたし]
    // Matches Kanji / Kana base followed by [bracket]
    processed = processed.replace(/([一-龯々ヶ]+)\[([ぁ-んァ-ヶー\s]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

    // Pattern 2: Kanji followed by (kana) e.g. 日本(にほん)
    processed = processed.replace(/([一-龯々ヶ]+)\(([ぁ-んァ-ヶー\s]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');

    // Pattern 3: Full-width parenthesis （kana）
    processed = processed.replace(/([一-龯々ヶ]+)（([ぁ-んァ-ヶー\s]+)）/g, '<ruby>$1<rt>$2</rt></ruby>');

    return processed;
  },

  /**
   * Convert <ruby> tags back to friendly bracket syntax for easy textarea editing
   * <ruby>初<rt>はじ</rt></ruby>めまして -> 初[はじ]めまして
   */
  toBracketFormat(html) {
    if (!html) return '';
    let text = html;
    // Replace <ruby>Base<rt>Furigana</rt></ruby> with Base[Furigana]
    text = text.replace(/<ruby>\s*([^<]+)\s*<rt>\s*([^<]+)\s*<\/rt>\s*<\/ruby>/gi, '$1[$2]');
    // Strip any remaining unwanted HTML tags
    text = text.replace(/<[^>]*>/g, '');
    return text.trim();
  },

  /**
   * Strip furigana to get plain text (e.g. for speech recognition or search)
   */
  toPlainText(textOrHtml) {
    if (!textOrHtml) return '';
    let text = textOrHtml;
    // Strip <rt>...</rt>
    text = text.replace(/<rt>.*?<\/rt>/gi, '');
    // Strip <ruby> and other tags
    text = text.replace(/<[^>]*>/g, '');
    // Strip bracket notation [xxx] or (xxx)
    text = text.replace(/\[[ぁ-んァ-ヶー\s]+\]/g, '');
    text = text.replace(/\([ぁ-んァ-ヶー\s]+\)/g, '');
    text = text.replace(/（[ぁ-んァ-ヶー\s]+）/g, '');
    return text.trim();
  }
};

window.FuriganaParser = FuriganaParser;
