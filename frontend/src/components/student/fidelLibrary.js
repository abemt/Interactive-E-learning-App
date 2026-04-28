const FIDEL_AUDIO_BASE = '/assets/audio/fidel';

export const FIDEL_ACCENT_STYLES = {
  cyan: {
    badge: 'bg-cyan-100 text-cyan-800',
    header: 'bg-cyan-50 text-cyan-900',
    card: 'border-cyan-200',
    tile: 'border-cyan-100 bg-white text-slate-900 hover:border-cyan-300 hover:bg-cyan-50',
    active: 'border-cyan-500 bg-cyan-600 text-white shadow-md'
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-800',
    header: 'bg-emerald-50 text-emerald-900',
    card: 'border-emerald-200',
    tile: 'border-emerald-100 bg-white text-slate-900 hover:border-emerald-300 hover:bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-600 text-white shadow-md'
  },
  amber: {
    badge: 'bg-amber-100 text-amber-800',
    header: 'bg-amber-50 text-amber-900',
    card: 'border-amber-200',
    tile: 'border-amber-100 bg-white text-slate-900 hover:border-amber-300 hover:bg-amber-50',
    active: 'border-amber-500 bg-amber-500 text-white shadow-md'
  },
  rose: {
    badge: 'bg-rose-100 text-rose-800',
    header: 'bg-rose-50 text-rose-900',
    card: 'border-rose-200',
    tile: 'border-rose-100 bg-white text-slate-900 hover:border-rose-300 hover:bg-rose-50',
    active: 'border-rose-500 bg-rose-600 text-white shadow-md'
  },
  violet: {
    badge: 'bg-violet-100 text-violet-800',
    header: 'bg-violet-50 text-violet-900',
    card: 'border-violet-200',
    tile: 'border-violet-100 bg-white text-slate-900 hover:border-violet-300 hover:bg-violet-50',
    active: 'border-violet-500 bg-violet-600 text-white shadow-md'
  },
  indigo: {
    badge: 'bg-indigo-100 text-indigo-800',
    header: 'bg-indigo-50 text-indigo-900',
    card: 'border-indigo-200',
    tile: 'border-indigo-100 bg-white text-slate-900 hover:border-indigo-300 hover:bg-indigo-50',
    active: 'border-indigo-500 bg-indigo-600 text-white shadow-md'
  },
  teal: {
    badge: 'bg-teal-100 text-teal-800',
    header: 'bg-teal-50 text-teal-900',
    card: 'border-teal-200',
    tile: 'border-teal-100 bg-white text-slate-900 hover:border-teal-300 hover:bg-teal-50',
    active: 'border-teal-500 bg-teal-600 text-white shadow-md'
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700',
    header: 'bg-slate-50 text-slate-900',
    card: 'border-slate-200',
    tile: 'border-slate-100 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50',
    active: 'border-slate-500 bg-slate-900 text-white shadow-md'
  }
};

const FIDEL_ACCENT_CYCLE = ['cyan', 'emerald', 'amber', 'rose', 'violet', 'indigo', 'teal', 'slate'];

const FIDEL_FAMILY_ROWS = [
  ['h', 'ሀ', 'H family', ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'], ['hä', 'hu', 'hi', 'ha', 'he', 'h', 'ho']],
  ['l', 'ለ', 'L family', ['ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ'], ['lä', 'lu', 'li', 'la', 'le', 'l', 'lo']],
  ['h1', 'ሐ', 'Ḥ family', ['ሐ', 'ሑ', 'ሒ', 'ሓ', 'ሔ', 'ሕ', 'ሖ'], ['ḥä', 'ḥu', 'ḥi', 'ḥa', 'ḥe', 'ḥ', 'ḥo']],
  ['m', 'መ', 'M family', ['መ', 'ሙ', 'ሚ', 'ማ', 'ሜ', 'ም', 'ሞ'], ['mä', 'mu', 'mi', 'ma', 'me', 'm', 'mo']],
  ['s1', 'ሠ', 'Ś family', ['ሠ', 'ሡ', 'ሢ', 'ሣ', 'ሤ', 'ሥ', 'ሦ'], ['śä', 'śu', 'śi', 'śa', 'śe', 'ś', 'śo']],
  ['r', 'ረ', 'R family', ['ረ', 'ሩ', 'ሪ', 'ራ', 'ሬ', 'ር', 'ሮ'], ['rä', 'ru', 'ri', 'ra', 're', 'r', 'ro']],
  ['s', 'ሰ', 'S family', ['ሰ', 'ሱ', 'ሲ', 'ሳ', 'ሴ', 'ስ', 'ሶ'], ['sä', 'su', 'si', 'sa', 'se', 's', 'so']],
  ['sh', 'ሸ', 'Š family', ['ሸ', 'ሹ', 'ሺ', 'ሻ', 'ሼ', 'ሽ', 'ሾ'], ['šä', 'šu', 'ši', 'ša', 'še', 'š', 'šo']],
  ['q', 'ቀ', 'Q family', ['ቀ', 'ቁ', 'ቂ', 'ቃ', 'ቄ', 'ቅ', 'ቆ'], ['qä', 'qu', 'qi', 'qa', 'qe', 'q', 'qo']],
  ['b', 'በ', 'B family', ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ'], ['bä', 'bu', 'bi', 'ba', 'be', 'b', 'bo']],
  ['v', 'ቨ', 'V family', ['ቨ', 'ቩ', 'ቪ', 'ቫ', 'ቬ', 'ቭ', 'ቮ'], ['vä', 'vu', 'vi', 'va', 've', 'v', 'vo']],
  ['t', 'ተ', 'T family', ['ተ', 'ቱ', 'ቲ', 'ታ', 'ቴ', 'ት', 'ቶ'], ['tä', 'tu', 'ti', 'ta', 'te', 't', 'to']],
  ['ch', 'ቸ', 'Č family', ['ቸ', 'ቹ', 'ቺ', 'ቻ', 'ቼ', 'ች', 'ቾ'], ['čä', 'ču', 'či', 'ča', 'če', 'č', 'čo']],
  ['h2', 'ኀ', 'Ḫ family', ['ኀ', 'ኁ', 'ኂ', 'ኃ', 'ኄ', 'ኅ', 'ኆ'], ['ḫä', 'ḫu', 'ḫi', 'ḫa', 'ḫe', 'ḫ', 'ḫo']],
  ['n', 'ነ', 'N family', ['ነ', 'ኑ', 'ኒ', 'ና', 'ኔ', 'ን', 'ኖ'], ['nä', 'nu', 'ni', 'na', 'ne', 'n', 'no']],
  ['ny', 'ኘ', 'Ñ family', ['ኘ', 'ኙ', 'ኚ', 'ኛ', 'ኜ', 'ኝ', 'ኞ'], ['ñä', 'ñu', 'ñi', 'ña', 'ñe', 'ñ', 'ño']],
  ['glottal', 'አ', 'ʼ family', ['አ', 'ኡ', 'ኢ', 'ኣ', 'ኤ', 'እ', 'ኦ'], ['ʼä', 'ʼu', 'ʼi', 'ʼa', 'ʼe', 'ʼ', 'ʼo']],
  ['k', 'ከ', 'K family', ['ከ', 'ኩ', 'ኪ', 'ካ', 'ኬ', 'ክ', 'ኮ'], ['kä', 'ku', 'ki', 'ka', 'ke', 'k', 'ko']],
  ['x', 'ኸ', 'X family', ['ኸ', 'ኹ', 'ኺ', 'ኻ', 'ኼ', 'ኽ', 'ኾ'], ['xä', 'xu', 'xi', 'xa', 'xe', 'x', 'xo']],
  ['w', 'ወ', 'W family', ['ወ', 'ዉ', 'ዊ', 'ዋ', 'ዌ', 'ው', 'ዎ'], ['wä', 'wu', 'wi', 'wa', 'we', 'w', 'wo']],
  ['ayn', 'ዐ', 'ʽ family', ['ዐ', 'ዑ', 'ዒ', 'ዓ', 'ዔ', 'ዕ', 'ዖ'], ['ʽä', 'ʽu', 'ʽi', 'ʽa', 'ʽe', 'ʽ', 'ʽo']],
  ['z', 'ዘ', 'Z family', ['ዘ', 'ዙ', 'ዚ', 'ዛ', 'ዜ', 'ዝ', 'ዞ'], ['zä', 'zu', 'zi', 'za', 'ze', 'z', 'zo']],
  ['zh', 'ዠ', 'Ž family', ['ዠ', 'ዡ', 'ዢ', 'ዣ', 'ዤ', 'ዥ', 'ዦ'], ['žä', 'žu', 'ži', 'ža', 'že', 'ž', 'žo']],
  ['y', 'የ', 'Y family', ['የ', 'ዩ', 'ዪ', 'ያ', 'ዬ', 'ይ', 'ዮ'], ['yä', 'yu', 'yi', 'ya', 'ye', 'y', 'yo']],
  ['d', 'ደ', 'D family', ['ደ', 'ዱ', 'ዲ', 'ዳ', 'ዴ', 'ድ', 'ዶ'], ['dä', 'du', 'di', 'da', 'de', 'd', 'do']],
  ['j', 'ጀ', 'Ǧ family', ['ጀ', 'ጁ', 'ጂ', 'ጃ', 'ጄ', 'ጅ', 'ጆ'], ['ǧä', 'ǧu', 'ǧi', 'ǧa', 'ǧe', 'ǧ', 'ǧo']],
  ['g', 'ገ', 'G family', ['ገ', 'ጉ', 'ጊ', 'ጋ', 'ጌ', 'ግ', 'ጎ'], ['gä', 'gu', 'gi', 'ga', 'ge', 'g', 'go']],
  ['t2', 'ጠ', 'Ṭ family', ['ጠ', 'ጡ', 'ጢ', 'ጣ', 'ጤ', 'ጥ', 'ጦ'], ['ṭä', 'ṭu', 'ṭi', 'ṭa', 'ṭe', 'ṭ', 'ṭo']],
  ['ch2', 'ጨ', 'Č̣ family', ['ጨ', 'ጩ', 'ጪ', 'ጫ', 'ጬ', 'ጭ', 'ጮ'], ['č̣ä', 'č̣u', 'č̣i', 'č̣a', 'č̣e', 'č̣', 'č̣o']],
  ['p2', 'ጰ', 'P̣ family', ['ጰ', 'ጱ', 'ጲ', 'ጳ', 'ጴ', 'ጵ', 'ጶ'], ['p̣ä', 'p̣u', 'p̣i', 'p̣a', 'p̣e', 'p̣', 'p̣o']],
  ['s2', 'ጸ', 'Ṣ family', ['ጸ', 'ጹ', 'ጺ', 'ጻ', 'ጼ', 'ጽ', 'ጾ'], ['ṣä', 'ṣu', 'ṣi', 'ṣa', 'ṣe', 'ṣ', 'ṣo']],
  ['s3', 'ፀ', 'Ṣ́ family', ['ፀ', 'ፁ', 'ፂ', 'ፃ', 'ፄ', 'ፅ', 'ፆ'], ['ṣ́ä', 'ṣ́u', 'ṣ́i', 'ṣ́a', 'ṣ́e', 'ṣ́', 'ṣ́o']],
  ['f', 'ፈ', 'F family', ['ፈ', 'ፉ', 'ፊ', 'ፋ', 'ፌ', 'ፍ', 'ፎ'], ['fä', 'fu', 'fi', 'fa', 'fe', 'f', 'fo']],
  ['p', 'ፐ', 'P family', ['ፐ', 'ፑ', 'ፒ', 'ፓ', 'ፔ', 'ፕ', 'ፖ'], ['pä', 'pu', 'pi', 'pa', 'pe', 'p', 'po']]
];

function buildFidelFamily([id, glyph, title, letters, pronunciations], index) {
  const accent = FIDEL_ACCENT_CYCLE[index % FIDEL_ACCENT_CYCLE.length];
  const description = 'Seven-order core family from the Amharic syllabary.';

  return {
    id,
    glyph,
    title,
    accent,
    description,
    letters: letters.map((letterGlyph, letterIndex) => ({
      id: `${id}-${letterIndex + 1}`,
      familyId: id,
      familyGlyph: glyph,
      familyTitle: title,
      familyDescription: description,
      accent,
      glyph: letterGlyph,
      pronunciation: pronunciations[letterIndex],
      audioFile: `${id}-${letterIndex + 1}.mp3`,
      audioPath: `${FIDEL_AUDIO_BASE}/${id}-${letterIndex + 1}.mp3`
    }))
  };
}

export const FIDEL_FAMILIES = FIDEL_FAMILY_ROWS.map(buildFidelFamily);
