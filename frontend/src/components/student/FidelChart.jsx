import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * FidelChart Component
 * Interactive Ethiopian Amharic Fidel (Alphabet) learning interface
 * Grid layout matching standard Ethiopian classroom charts
 */
function FidelChart() {
  const navigate = useNavigate();
  // Simplified Amharic Fidel characters (Ge'ez script)
  // In production, this would include all 33 base characters x 7 orders = 231 characters
  const fidelData = [
    // First row - ሀ family
    { char: 'ሀ', pronunciation: 'hä', audio: 'ha.mp3', row: 0, col: 0 },
    { char: 'ሁ', pronunciation: 'hu', audio: 'hu.mp3', row: 0, col: 1 },
    { char: 'ሂ', pronunciation: 'hi', audio: 'hi.mp3', row: 0, col: 2 },
    { char: 'ሃ', pronunciation: 'ha', audio: 'haa.mp3', row: 0, col: 3 },
    { char: 'ሄ', pronunciation: 'he', audio: 'he.mp3', row: 0, col: 4 },
    { char: 'ህ', pronunciation: 'h', audio: 'hh.mp3', row: 0, col: 5 },
    { char: 'ሆ', pronunciation: 'ho', audio: 'ho.mp3', row: 0, col: 6 },
    
    // Second row - ለ family
    { char: 'ለ', pronunciation: 'lä', audio: 'la.mp3', row: 1, col: 0 },
    { char: 'ሉ', pronunciation: 'lu', audio: 'lu.mp3', row: 1, col: 1 },
    { char: 'ሊ', pronunciation: 'li', audio: 'li.mp3', row: 1, col: 2 },
    { char: 'ላ', pronunciation: 'la', audio: 'laa.mp3', row: 1, col: 3 },
    { char: 'ሌ', pronunciation: 'le', audio: 'le.mp3', row: 1, col: 4 },
    { char: 'ል', pronunciation: 'l', audio: 'll.mp3', row: 1, col: 5 },
    { char: 'ሎ', pronunciation: 'lo', audio: 'lo.mp3', row: 1, col: 6 },
    
    // Third row - መ family
    { char: 'መ', pronunciation: 'mä', audio: 'ma.mp3', row: 2, col: 0 },
    { char: 'ሙ', pronunciation: 'mu', audio: 'mu.mp3', row: 2, col: 1 },
    { char: 'ሚ', pronunciation: 'mi', audio: 'mi.mp3', row: 2, col: 2 },
    { char: 'ማ', pronunciation: 'ma', audio: 'maa.mp3', row: 2, col: 3 },
    { char: 'ሜ', pronunciation: 'me', audio: 'me.mp3', row: 2, col: 4 },
    { char: 'ም', pronunciation: 'm', audio: 'mm.mp3', row: 2, col: 5 },
    { char: 'ሞ', pronunciation: 'mo', audio: 'mo.mp3', row: 2, col: 6 },
    
    // Fourth row - ረ family
    { char: 'ረ', pronunciation: 'rä', audio: 'ra.mp3', row: 3, col: 0 },
    { char: 'ሩ', pronunciation: 'ru', audio: 'ru.mp3', row: 3, col: 1 },
    { char: 'ሪ', pronunciation: 'ri', audio: 'ri.mp3', row: 3, col: 2 },
    { char: 'ራ', pronunciation: 'ra', audio: 'raa.mp3', row: 3, col: 3 },
    { char: 'ሬ', pronunciation: 're', audio: 're.mp3', row: 3, col: 4 },
    { char: 'ር', pronunciation: 'r', audio: 'rr.mp3', row: 3, col: 5 },
    { char: 'ሮ', pronunciation: 'ro', audio: 'ro.mp3', row: 3, col: 6 },
    
    // Fifth row - ሰ family
    { char: 'ሰ', pronunciation: 'sä', audio: 'sa.mp3', row: 4, col: 0 },
    { char: 'ሱ', pronunciation: 'su', audio: 'su.mp3', row: 4, col: 1 },
    { char: 'ሲ', pronunciation: 'si', audio: 'si.mp3', row: 4, col: 2 },
    { char: 'ሳ', pronunciation: 'sa', audio: 'saa.mp3', row: 4, col: 3 },
    { char: 'ሴ', pronunciation: 'se', audio: 'se.mp3', row: 4, col: 4 },
    { char: 'ስ', pronunciation: 's', audio: 'ss.mp3', row: 4, col: 5 },
    { char: 'ሶ', pronunciation: 'so', audio: 'so.mp3', row: 4, col: 6 },
  ];

  const [selectedChar, setSelectedChar] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);

  const handleCharClick = (char) => {
    setSelectedChar(char);
    
    // Play audio pronunciation (if available)
    if (char.audio) {
      // In production, this would play actual audio files
      // For now, we'll just show the pronunciation
      setPlayingAudio(char.char);
      
      // Use Web Speech API for pronunciation (fallback)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(char.pronunciation);
        utterance.lang = 'am-ET'; // Amharic language code
        utterance.rate = 0.8; // Slower for learning
        window.speechSynthesis.speak(utterance);
      }
      
      // Reset playing state after animation
      setTimeout(() => setPlayingAudio(null), 600);
    }
  };

  const rows = 5; // Number of character families
  const cols = 7; // 7 orders per character

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-accent-50 to-success-50 p-6">      {/* Back Button */}
      <button
        onClick={() => navigate('/student/dashboard')}
        className="mb-4 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-gray-700 flex items-center gap-2"
      >
        ← Back to My Journey
      </button>      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🔤</div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-1">
                Amharic Fidel Chart
              </h1>
              <p className="text-lg text-gray-600">
                Click on any character to hear its pronunciation!
              </p>
            </div>
            {selectedChar && (
              <div className="bg-primary-100 rounded-xl p-4 text-center min-w-[120px]">
                <div className="text-5xl mb-2">{selectedChar.char}</div>
                <div className="text-xl font-bold text-primary-700">
                  {selectedChar.pronunciation}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fidel Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Column Headers (Orders) */}
          <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
            {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].map((order, idx) => (
              <div
                key={idx}
                className="text-center font-bold text-sm md:text-base text-gray-600 py-2"
              >
                {order}
              </div>
            ))}
          </div>

          {/* Character Grid */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 gap-2 md:gap-4 mb-2 md:mb-4">
              {fidelData
                .filter(char => char.row === rowIdx)
                .map((char, colIdx) => (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => handleCharClick(char)}
                    className={`
                      relative aspect-square rounded-2xl transition-all duration-300
                      flex flex-col items-center justify-center
                      text-4xl md:text-5xl lg:text-6xl font-bold
                      shadow-lg hover:shadow-2xl
                      ${
                        selectedChar?.char === char.char
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white scale-110 ring-4 ring-primary-300'
                          : 'bg-gradient-to-br from-white to-gray-50 text-gray-800 hover:scale-105 hover:bg-primary-50'
                      }
                      ${
                        playingAudio === char.char
                          ? 'animate-pulse ring-4 ring-accent-400'
                          : ''
                      }
                      active:scale-95
                      cursor-pointer
                    `}
                  >
                    {/* Character */}
                    <div className="mb-1">{char.char}</div>
                    
                    {/* Pronunciation hint */}
                    <div className="text-xs md:text-sm font-normal text-gray-500 absolute bottom-2">
                      {char.pronunciation}
                    </div>
                    
                    {/* Sound icon */}
                    <div className="absolute top-2 right-2 text-lg opacity-50">
                      🔊
                    </div>
                  </button>
                ))}
            </div>
          ))}
        </div>

        {/* Instructions Card */}
        <div className="mt-6 bg-gradient-to-r from-success-100 to-primary-100 rounded-2xl shadow-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                How to Learn the Fidel
              </h3>
              <ul className="text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-primary-600 font-bold">1.</span>
                  <span>Click any character to hear how it sounds</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-600 font-bold">2.</span>
                  <span>Each row is a character family (same consonant)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-600 font-bold">3.</span>
                  <span>Each column changes the vowel sound (7 orders)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-600 font-bold">4.</span>
                  <span>Practice reading each row from left to right!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Practice Mode Button */}
        <div className="mt-6 text-center">
          <button className="bg-gradient-to-r from-success-500 to-success-600 text-white px-12 py-4 rounded-xl text-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
            🎮 Start Practice Quiz →
          </button>
        </div>
      </div>
    </div>
  );
}

export default FidelChart;
