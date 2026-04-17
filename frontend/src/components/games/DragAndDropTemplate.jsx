import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * DragAndDropTemplate Component
 * Interactive drag-and-drop game for Science subjects
 * Uses large text and high contrast for accessibility
 */
function DragAndDropTemplate({ courseData }) {
  const navigate = useNavigate();
  const [draggedItem, setDraggedItem] = useState(null);
  const [droppedItems, setDroppedItems] = useState({});
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Parse course data into game format
  const gameData = {
    title: courseData?.title || 'Science Sorting Game',
    description: courseData?.description || 'Drag items to their correct categories!',
    categories: courseData?.categories || [
      { id: 1, name: 'Living Things', color: 'success', emoji: '🌱' },
      { id: 2, name: 'Non-Living Things', color: 'primary', emoji: '🪨' }
    ],
    items: courseData?.items || [
      { id: 1, text: 'Tree', category: 1, emoji: '🌳' },
      { id: 2, text: 'Rock', category: 2, emoji: '🪨' },
      { id: 3, text: 'Dog', category: 1, emoji: '🐕' },
      { id: 4, text: 'Water', category: 2, emoji: '💧' },
      { id: 5, text: 'Bird', category: 1, emoji: '🐦' },
      { id: 6, text: 'Cloud', category: 2, emoji: '☁️' }
    ]
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    setFeedback('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, categoryId) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const isCorrect = draggedItem.category === categoryId;
    
    if (isCorrect) {
      // Correct placement
      setDroppedItems(prev => ({
        ...prev,
        [draggedItem.id]: categoryId
      }));
      setScore(prev => prev + 10);
      setFeedback(`✅ Excellent! ${draggedItem.text} is correct!`);
      
      // Play success sound
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Correct!');
        window.speechSynthesis.speak(utterance);
      }
    } else {
      setFeedback(`❌ Oops! Try again with ${draggedItem.text}`);
    }
    
    setDraggedItem(null);
  };

  const availableItems = gameData.items.filter(item => !droppedItems[item.id]);
  const isGameComplete = Object.keys(droppedItems).length === gameData.items.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 via-primary-50 to-accent-50 p-6">      {/* Back Button */}
      <button
        onClick={() => navigate('/student/dashboard')}
        className="mb-4 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-gray-700 flex items-center gap-2"
      >
        ← Back to My Journey
      </button>      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                {gameData.title}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600">
                {gameData.description}
              </p>
            </div>
            <div className="bg-accent-100 rounded-2xl p-4 text-center min-w-[120px]">
              <div className="text-sm font-semibold text-gray-600">Score</div>
              <div className="text-5xl font-bold text-accent-600">{score}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Bar */}
      {feedback && (
        <div className={`max-w-7xl mx-auto mb-6 ${
          feedback.startsWith('✅') ? 'bg-success-100 text-success-800' : 'bg-red-100 text-red-800'
        } rounded-2xl p-4 text-center text-2xl font-bold shadow-lg animate-pulse`}>
          {feedback}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Items to Drag */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <span>📦</span> Items to Sort
            </h2>
            
            {availableItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-7xl mb-4">🎉</div>
                <p className="text-3xl font-bold text-success-600">All Done!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {availableItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 cursor-move hover:shadow-xl hover:scale-105 transition-all active:scale-95 border-4 border-dashed border-gray-300"
                  >
                    <div className="text-6xl text-center mb-2">{item.emoji}</div>
                    <div className="text-2xl font-bold text-center text-gray-800">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drop Zones */}
          <div className="space-y-6">
            {gameData.categories.map(category => {
              const itemsInCategory = gameData.items.filter(
                item => droppedItems[item.id] === category.id
              );
              
              return (
                <div
                  key={category.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category.id)}
                  className={`bg-gradient-to-br from-${category.color}-100 to-${category.color}-200 rounded-2xl p-6 min-h-[250px] border-4 border-dashed border-${category.color}-400 transition-all ${
                    draggedItem ? 'ring-4 ring-' + category.color + '-400 scale-105' : ''
                  }`}
                >
                  <h3 className={`text-3xl font-bold text-${category.color}-800 mb-4 flex items-center gap-3`}>
                    <span className="text-5xl">{category.emoji}</span>
                    {category.name}
                  </h3>
                  
                  {itemsInCategory.length === 0 ? (
                    <div className="text-center py-8 text-2xl text-gray-500 font-semibold">
                      Drop items here ⬇️
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {itemsInCategory.map(item => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl p-4 shadow-md"
                        >
                          <div className="text-4xl text-center mb-1">{item.emoji}</div>
                          <div className="text-lg font-bold text-center text-gray-800">
                            {item.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Button */}
        {isGameComplete && (
          <div className="mt-8 text-center">
            <button className="bg-gradient-to-r from-success-500 to-success-600 text-white px-12 py-6 rounded-2xl text-3xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all">
              🏆 Finish & See Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DragAndDropTemplate;
