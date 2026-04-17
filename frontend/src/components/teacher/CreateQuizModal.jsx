import { useState } from 'react';

/**
 * CreateQuizModal Component
 * Modal form for creating a new quiz question with file uploads
 */
function CreateQuizModal({ isOpen, onClose, onSubmit, moduleId }) {
  const [formData, setFormData] = useState({
    questionText: '',
    questionType: 'MultipleChoice',
    correctAnswer: '',
    distractor1: '',
    distractor2: '',
    distractor3: '',
    points: 10,
    sequenceOrder: 1
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      
      // Append form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Append files
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      if (audioFile) {
        formDataToSend.append('audio', audioFile);
      }
      
      await onSubmit(formDataToSend);
      
      // Reset form
      setFormData({
        questionText: '',
        questionType: 'MultipleChoice',
        correctAnswer: '',
        distractor1: '',
        distractor2: '',
        distractor3: '',
        points: 10,
        sequenceOrder: 1
      });
      setImageFile(null);
      setAudioFile(null);
      setImagePreview(null);
      onClose();
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-2xl font-bold">Create New Quiz Question</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-3xl leading-none transition-colors"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question Text */}
          <div>
            <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              id="questionText"
              name="questionText"
              value={formData.questionText}
              onChange={handleInputChange}
              required
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter your quiz question here..."
            />
          </div>

          {/* Question Type */}
          <div>
            <label htmlFor="questionType" className="block text-sm font-medium text-gray-700 mb-2">
              Question Type
            </label>
            <select
              id="questionType"
              name="questionType"
              value={formData.questionType}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="MultipleChoice">Multiple Choice</option>
              <option value="TrueFalse">True/False</option>
              <option value="ShortAnswer">Short Answer</option>
            </select>
          </div>

          {/* Correct Answer */}
          <div>
            <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer *
            </label>
            <input
              type="text"
              id="correctAnswer"
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter the correct answer"
            />
          </div>

          {/* Distractors (Wrong Answers) */}
          {formData.questionType === 'MultipleChoice' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="distractor1" className="block text-sm font-medium text-gray-700 mb-2">
                  Wrong Answer 1
                </label>
                <input
                  type="text"
                  id="distractor1"
                  name="distractor1"
                  value={formData.distractor1}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Distractor 1"
                />
              </div>
              <div>
                <label htmlFor="distractor2" className="block text-sm font-medium text-gray-700 mb-2">
                  Wrong Answer 2
                </label>
                <input
                  type="text"
                  id="distractor2"
                  name="distractor2"
                  value={formData.distractor2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Distractor 2"
                />
              </div>
              <div>
                <label htmlFor="distractor3" className="block text-sm font-medium text-gray-700 mb-2">
                  Wrong Answer 3
                </label>
                <input
                  type="text"
                  id="distractor3"
                  name="distractor3"
                  value={formData.distractor3}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Distractor 3"
                />
              </div>
            </div>
          )}

          {/* Points and Sequence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-2">
                Points
              </label>
              <input
                type="number"
                id="points"
                name="points"
                value={formData.points}
                onChange={handleInputChange}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="sequenceOrder" className="block text-sm font-medium text-gray-700 mb-2">
                Question Order
              </label>
              <input
                type="number"
                id="sequenceOrder"
                name="sequenceOrder"
                value={formData.sequenceOrder}
                onChange={handleInputChange}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Attachments (Optional)</h3>
            
            {/* Image Upload */}
            <div className="mb-4">
              <label htmlFor="imageUpload" className="block text-sm font-medium text-gray-700 mb-2">
                📷 Upload Image
              </label>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
              {imagePreview && (
                <div className="mt-3">
                  <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg shadow-md" />
                </div>
              )}
            </div>

            {/* Audio Upload */}
            <div>
              <label htmlFor="audioUpload" className="block text-sm font-medium text-gray-700 mb-2">
                🔊 Upload Amharic Audio
              </label>
              <input
                type="file"
                id="audioUpload"
                accept="audio/*"
                onChange={handleAudioChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-success-50 file:text-success-700 hover:file:bg-success-100 cursor-pointer"
              />
              {audioFile && (
                <p className="mt-2 text-sm text-success-600">✓ {audioFile.name}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary px-6 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateQuizModal;
