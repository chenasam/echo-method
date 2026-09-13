/**
 * 回音法 (Echo Method) 精選練習教材庫
 * 涵蓋經典英語連音 (Linking)、弱化 (Reduction)、語調起伏 (Intonation) 與生活/商務會話
 */

export const LESSON_CATEGORIES = [
  { id: 'all', name: '全部教材', icon: 'sparkles' },
  { id: 'linking', name: '連音與變音特訓 (Linking)', icon: 'link' },
  { id: 'intonation', name: '自然語調與抑揚頓挫 (Intonation)', icon: 'activity' },
  { id: 'daily', name: '生活高頻實用會話 (Daily Conversation)', icon: 'message-circle' },
  { id: 'business', name: '商務溝通與簡報 (Business & Work)', icon: 'briefcase' }
];

export const PRESET_LESSONS = [
  {
    id: 'l-01',
    category: 'linking',
    title: 'What do you do? (連音與弱化特訓)',
    text: 'What do you do for a living?',
    ipa: '/wʌt də juː duː fər ə ˈlɪvɪŋ/',
    translation: '你是做什麼工作的？',
    tips: '【連音解析】What do you 經常弱讀並連音發成 /wʌdəjə/ 或 /wʌtʃə/，do 弱讀為 /də/，for a 發為 /fərə/。',
    highlights: [
      { word: 'What do you', type: 'linked', note: '發成 /wʌdəjə/' },
      { word: 'for a', type: 'reduced', note: '弱讀為 /fərə/' }
    ],
    difficulty: '入門',
    recommendedEchoPauseSec: 2.5
  },
  {
    id: 'l-02',
    category: 'linking',
    title: 'Check it out! (輔音+元音連音)',
    text: 'You should check it out right away.',
    ipa: '/juː ʃʊd tʃɛk ɪt aʊt raɪt əˈweɪ/',
    translation: '你應該立刻去看看。',
    tips: '【輔元連讀】check it out 三個字連續滑過：check_it (/tʃɛkɪt/) -> it_out (/ɪtaʊt/)，尾音 t 在元音間轉為彈舌音 /ɾ/ (Flap T)。',
    highlights: [
      { word: 'check it out', type: 'linked', note: 'check-i-tout 順暢連讀' },
      { word: 'right away', type: 'linked', note: 'right-a-way t 轉彈舌音' }
    ],
    difficulty: '入門',
    recommendedEchoPauseSec: 3.0
  },
  {
    id: 'l-03',
    category: 'intonation',
    title: 'Are you serious? (疑問句升調語調)',
    text: 'Are you really serious about quitting your job?',
    ipa: '/ɑːr juː ˈrɪəli ˈsɪəriəs əˈbaʊt ˈkwɪtɪŋ jʊər dʒɒb/',
    translation: '你真的是認真打算辭職嗎？',
    tips: '【語調起伏】Yes/No 疑問句在句尾 "job?" 需要明顯上升語調 (Rising Intonation)，著重強調 "really" 與 "serious"。',
    highlights: [
      { word: 'really', type: 'stress', note: '聲調拉高、音量加大' },
      { word: 'quitting your job?', type: 'rising', note: '句尾明顯上揚升調' }
    ],
    difficulty: '中級',
    recommendedEchoPauseSec: 3.5
  },
  {
    id: 'l-04',
    category: 'daily',
    title: 'Hold on a second! (日常生活短句)',
    text: 'Hold on a second, I need to tie my shoes.',
    ipa: '/hoʊld ɒn ə ˈsɛkənd aɪ niːd tuː taɪ maɪ ʃuːz/',
    translation: '等等我，我要綁一下鞋帶。',
    tips: '【口語節奏】Hold_on_a 發成 /hoʊldɒnə/，d 與 o、n 與 a 完全連在一起，整體節奏輕快。',
    highlights: [
      { word: 'Hold on a', type: 'linked', note: 'Hold-o-na 音節無縫滑過' }
    ],
    difficulty: '入門',
    recommendedEchoPauseSec: 3.0
  },
  {
    id: 'l-05',
    category: 'business',
    title: 'Let’s call it a day. (會議結束常用句)',
    text: 'We have covered everything, so let us call it a day.',
    ipa: '/wiː hæv ˈkʌvərd ˈɛvrɪθɪŋ soʊ lɛt ʌs kɔːl ɪt ə deɪ/',
    translation: '我們該討論的都討論完了，今天就到此為止吧。',
    tips: '【慣用語發音】call_it_a 形成三個字的連音串 /kɔːlɪtə/，句尾 a day 穩定降調 (Falling Intonation)。',
    highlights: [
      { word: 'call it a', type: 'linked', note: 'call-i-ta 音串' },
      { word: 'day.', type: 'falling', note: '句尾肯定降調' }
    ],
    difficulty: '中級',
    recommendedEchoPauseSec: 3.5
  },
  {
    id: 'l-06',
    category: 'intonation',
    title: 'I didn’t mean to hurt you. (情感語調展現)',
    text: 'I honestly did not mean to hurt your feelings.',
    ipa: '/aɪ ˈɒnɪstli dɪd nɒt miːn tuː hɜːt jʊər ˈfiːlɪŋz/',
    translation: '我誠心誠意地說，我並不是有意要傷害你的感受。',
    tips: '【情感重音】honestly 與 NOT 語調下沉並放慢，表現真誠歉意，feelings 句尾輕微下降。',
    highlights: [
      { word: 'honestly', type: 'stress', note: '情緒重點，放慢重讀' },
      { word: 'did not mean', type: 'stress', note: '強調否定意圖' }
    ],
    difficulty: '高級',
    recommendedEchoPauseSec: 4.0
  }
];
