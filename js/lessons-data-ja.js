/**
 * 回音法 (Echo Method) 日文版精選練習教材庫 (Japanese Lesson Library)
 * 涵蓋日語高低音調 (Pitch Accent)、促音・撥音・長音、動漫經典台詞與敬語
 */

export const LESSON_CATEGORIES_JA = [
  { id: 'all', name: '全部日文教材', icon: 'sparkles' },
  { id: 'mora', name: '促音・撥音・長音節奏特訓', icon: 'zap' },
  { id: 'pitch', name: '高低音調 (Pitch Accent)', icon: 'trending-up' },
  { id: 'daily', name: '日常實用日語會話', icon: 'message-circle' },
  { id: 'anime', name: '動漫影集經典台詞', icon: 'tv' },
  { id: 'business', name: '商務禮儀與敬語', icon: 'briefcase' }
];

export const PRESET_LESSONS_JA = [
  {
    id: 'ja-01',
    category: 'pitch',
    title: '雨 (あめ) vs 飴 (あめ) - 音調型特訓',
    text: '雨が降っているから、飴をあげます。',
    romaji: 'Ame ga futte iru kara, ame o agemasu.',
    kana: 'あめ(頭高型)が ふっているから、あめ(平板型)を あげます。',
    translation: '因為正在下雨，所以我給你糖果。',
    tips: '【音調對比】「雨(あめ)」是頭高型 ①（高-低）；「飴(あめ)」是平板型 ⓪（低-高）。請精確模仿聲音的高低起伏！',
    highlights: [
      { word: '雨(あめ)', type: 'rising', note: '① 頭高型（高➔低）' },
      { word: '飴(あめ)', type: 'linked', note: '⓪ 平板型（低➔高）' }
    ],
    difficulty: '入門',
    recommendedEchoPauseSec: 3.0
  },
  {
    id: 'ja-02',
    category: 'mora',
    title: 'ちょっと待ってください (促音留白拍子)',
    text: 'ちょっと待ってください、すぐ戻ります。',
    romaji: 'Chotto matte kudasai, sugu modorimasu.',
    kana: 'ちょっと まってください、すぐ もどります。',
    translation: '請稍等一下，我馬上回來。',
    tips: '【促音拍子】「ちょっと」與「待って」包含小「っ」（促音），必須佔據一整拍的靜音停頓，不可快速縮短拍子。',
    highlights: [
      { word: 'ちょっと', type: 'stress', note: 'っ 停頓空一拍' },
      { word: '待って', type: 'stress', note: 'っ 促音拍子留白' }
    ],
    difficulty: '入門',
    recommendedEchoPauseSec: 2.8
  },
  {
    id: 'ja-03',
    category: 'anime',
    title: '諦めたらそこで試合終了ですよ (灌籃高手名言)',
    text: '諦めたら、そこで試合終了ですよ。',
    romaji: 'Akirametara, sokode shiai shūryō desu yo.',
    kana: 'あきらめたら、そこで しあい しゅうりょう ですよ。',
    translation: '要是現在放棄的話，比賽就到此結束了喔。（安西教練）',
    tips: '【情感與語調】「諦めたら」轉折點音調微微上揚，語尾「ですよ」溫和但堅定，節奏流暢沉穩。',
    highlights: [
      { word: '諦めたら', type: 'rising', note: '句中轉折上揚' },
      { word: '試合終了', type: 'stress', note: '長音 しゅうりょう 伸展' }
    ],
    difficulty: '中級',
    recommendedEchoPauseSec: 3.5
  },
  {
    id: 'ja-04',
    category: 'daily',
    title: 'お疲れ様でした！ (日本職場靈魂金句)',
    text: '今日も一日、お疲れ様でした！',
    romaji: 'Kyō mo ichinichi, otsukaresama deshita!',
    kana: 'きょうも いちにち、おつかれさまでした！',
    translation: '今天一整天大家辛苦了！',
    tips: '【語調韻律】「お疲れ様」音調從低到高再順暢下降，表現溫馨感激的語氣。',
    highlights: [
      { word: 'お疲れ様', type: 'linked', note: '連貫溫和下降調' }
    ],
    difficulty: '入門',
    recommendedEchoPauseSec: 2.5
  },
  {
    id: 'ja-05',
    category: 'business',
    title: 'いつもお世話になっております (商務敬語頭句)',
    text: '大変お世話になっております。よろしくお願い申し上げます。',
    romaji: 'Taihen osewa ni natte orimasu. Yoroshiku onegai mōshiagemasu.',
    kana: 'たいへん おせわに なっております。よろしく おねがい もうしあげます。',
    translation: '一直以來非常感謝您的照顧，今後也請多多指教。',
    tips: '【敬語語調】商務敬語節奏平穩、抑揚頓挫嚴謹，字字清晰，句尾「申し上げます」莊重降調。',
    highlights: [
      { word: 'お世話になっております', type: 'linked', note: '流暢敬語音節' },
      { word: '申し上げます', type: 'falling', note: '句尾肯定尊崇降調' }
    ],
    difficulty: '高級',
    recommendedEchoPauseSec: 4.0
  }
];
