import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * FallingBlocksGame Component
 * Math-focused game similar to Tetris but with math problems
 * Uses large text and high contrast for accessibility
 */
function FallingBlocksGame({ courseData }) {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [fallingBlock, setFallingBlock] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);

  // Parse course data into game format
  const gameData = {
    title: courseData?.title || 'Math Adventure',
    description: courseData?.description || 'Catch the correct answer!',
    difficulty: courseData?.difficulty || 'easy',
    problems: courseData?.problems || []
  };

  // Generate random math problem
  const generateProblem = useCallback(() => {
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1, num2, answer;
    
    // Adjust difficulty based on level
    const maxNumber = 10 + (level * 5);
    
    num1 = Math.floor(Math.random() * maxNumber) + 1;
    num2 = Math.floor(Math.random() * maxNumber) + 1;
    
    switch (operation) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        // Ensure positive result
        if (num1 < num2) [num1, num2] = [num2, num1];
        answer = num1 - num2;
        break;
      case '×':
        answer = num1 * num2;
        break;
      default:
        answer = num1 + num2;
    }
    
    // Generate wrong answers
    const wrongAnswers = [];
    while (wrongAnswers.length < 3) {
      const wrong = answer + (Math.floor(Math.random() * 10) - 5);
      if (wrong !== answer && !wrongAnswers.includes(wrong) && wrong > 0) {
        wrongAnswers.push(wrong);
      }
    }
    
    // Shuffle answers
    const allAnswers = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    
    return {
      num1,
      num2,
      operation,
      answer,
      display: `${num1} ${operation} ${num2} = ?`
    };
  }, [level]);

  // Generate answer options
  const generateAnswers = useCallback((correctAnswer) => {
    const options = [];
    options.push(correctAnswer);
    
    while (options.length < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const wrong = correctAnswer + offset;
      if (wrong > 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }
    
    return options.sort(() => Math.random() - 0.5).map((ans, idx) => ({
      id: idx,
      value: ans,
      position: idx * 25 // Percentage position
    }));
  }, []);

  // Start new round
  const startNewRound = useCallback(() => {
    const problem = generateProblem();
    setCurrentProblem(problem);
    setAnswers(generateAnswers(problem.answer));
    setFallingBlock({ top: 0, speed: 1 + (level * 0.2) });
    setFeedback('');
  }, [generateProblem, generateAnswers, level]);

  // Start game
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setLevel(1);
    setLives(3);
    startNewRound();
  };

  // Handle answer click
  const handleAnswerClick = (answer) => {
    if (!currentProblem || !gameActive) return;
    
    if (answer.value === currentProblem.answer) {
      // Correct answer
      setScore(prev => prev + (10 * level));
      setFeedback('✅ Correct!');
      
      // Level up every 50 points
      if ((score + (10 * level)) % 50 === 0) {
        setLevel(prev => prev + 1);
        setFeedback('🎉 Level Up!');
      }
      
      // Speech feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Correct!');
        window.speechSynthesis.speak(utterance);
      }
      
      setTimeout(() => startNewRound(), 1000);
    } else {
      // Wrong answer
      setLives(prev => prev - 1);
      setFeedback(`❌ Wrong! The answer was ${currentProblem.answer}`);
      
      if (lives <= 1) {
        setGameActive(false);
        setFeedback('💔 Game Over!');
      } else {
        setTimeout(() => startNewRound(), 2000);
      }
    }
  };

  // Falling animation
  useEffect(() => {
    if (!gameActive || !fallingBlock) return;
    
    const interval = setInterval(() => {
      setFallingBlock(prev => {
        if (!prev) return null;
        
        const newTop = prev.top + prev.speed;
        
        if (newTop >= 70) {
          // Block reached bottom - lose a life
          setLives(prev => prev - 1);
          setFeedback('⏰ Too slow!');
          
          if (lives <= 1) {
            setGameActive(false);
            setFeedback('💔 Game Over!');
            return null;
          }
          
          setTimeout(() => startNewRound(), 1500);
          return null;
        }
        
        return { ...prev, top: newTop };
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [gameActive, fallingBlock, lives, startNewRound]);

  if (!gameActive && lives > 0 && score === 0) {
    // Start screen
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-accent-50 to-success-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
          <div className="text-8xl mb-6">🔢</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            {gameData.title}
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Solve the math problem and click the correct answer before it falls!
          </p>
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-16 py-6 rounded-2xl text-3xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            🚀 Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-accent-50 to-success-50 p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/student/dashboard')}
        className="mb-4 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-gray-700 flex items-center gap-2"
      >
        ← Back to My Journey
      </button>
      
      {/* Header with Score and Lives */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Level {level}</div>
              <div className="text-4xl font-bold text-primary-600">Score: {score}</div>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`text-5xl ${idx < lives ? 'opacity-100' : 'opacity-20'}`}
                >
                  ❤️
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Bar */}
      {feedback && (
        <div className={`max-w-7xl mx-auto mb-6 ${
          feedback.startsWith('✅') || feedback.startsWith('🎉')
            ? 'bg-success-100 text-success-800'
            : 'bg-red-100 text-red-800'
        } rounded-2xl p-4 text-center text-3xl font-bold shadow-lg`}>
          {feedback}
        </div>
      )}

      {/* Game Area */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 min-h-[600px] relative overflow-hidden">
          {/* Math Problem (Falling Block) */}
          {currentProblem && fallingBlock && gameActive && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2 transition-all duration-100"
              style={{ top: `${fallingBlock.top}%` }}
            >
              <div className="bg-gradient-to-br from-accent-400 to-accent-600 text-white rounded-3xl px-12 py-8 shadow-2xl border-8 border-accent-700">
                <div className="text-6xl font-bold text-center">
                  {currentProblem.display}
                </div>
              </div>
            </div>
          )}

          {/* Answer Buttons */}
          {gameActive && (
            <div className="absolute bottom-8 left-0 right-0 px-8">
              <div className="grid grid-cols-4 gap-4">
                {answers.map((answer) => (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswerClick(answer)}
                    className="bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl py-8 text-5xl font-bold shadow-xl hover:scale-110 active:scale-95 transition-all"
                  >
                    {answer.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {!gameActive && score > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-12 text-center max-w-xl">
                <div className="text-8xl mb-6">
                  {lives === 0 ? '💔' : '🏆'}
                </div>
                <h2 className="text-5xl font-bold text-gray-800 mb-4">
                  {lives === 0 ? 'Game Over!' : 'Great Job!'}
                </h2>
                <div className="text-3xl text-gray-600 mb-2">Final Score</div>
                <div className="text-7xl font-bold text-primary-600 mb-8">{score}</div>
                <div className="text-2xl text-gray-600 mb-8">Level Reached: {level}</div>
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-success-500 to-success-600 text-white px-12 py-4 rounded-2xl text-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  🔄 Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FallingBlocksGame;
