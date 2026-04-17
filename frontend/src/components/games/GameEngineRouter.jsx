import DragAndDropTemplate from './DragAndDropTemplate';
import FallingBlocksGame from './FallingBlocksGame';

/**
 * GameEngineRouter Component
 * Routes course data to appropriate game template based on subject
 * Ensures large text and high contrast UI throughout
 */
function GameEngineRouter({ courseData }) {
  // Validate courseData
  if (!courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
          <div className="text-8xl mb-6">⚠️</div>
          <h1 className="text-5xl font-bold text-red-600 mb-4">
            No Course Data
          </h1>
          <p className="text-2xl text-gray-600">
            Please select a course to start playing!
          </p>
        </div>
      </div>
    );
  }

  // Route to appropriate game template based on subject
  const subject = courseData.subject?.toLowerCase() || '';

  // Science courses -> Drag and Drop
  if (subject.includes('science') || subject.includes('biology') || subject.includes('chemistry')) {
    return <DragAndDropTemplate courseData={courseData} />;
  }

  // Math courses -> Falling Blocks Game
  if (subject.includes('math') || subject.includes('arithmetic') || subject.includes('algebra')) {
    return <FallingBlocksGame courseData={courseData} />;
  }

  // Language courses -> Custom game (can be extended)
  if (subject.includes('language') || subject.includes('amharic') || subject.includes('english')) {
    // For language courses, we could add a word matching game
    // For now, use drag and drop as default
    return <DragAndDropTemplate courseData={courseData} />;
  }

  // Default: Use drag and drop template for unknown subjects
  return <DragAndDropTemplate courseData={courseData} />;
}

export default GameEngineRouter;
