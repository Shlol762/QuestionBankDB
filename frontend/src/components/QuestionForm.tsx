import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import client from '../api/client';

interface QuestionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const [showTopicModal, setShowTopicModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    topic_id: '',
    question_text: '',
    answer_text: '',
    image_url: '',
    marks: 5,
    difficulty: 'Medium',
    q_type: 'MCQ'
  });

  // Load Topics on mount
  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await client.get('/curriculum/topics');
      setTopics(res.data); 
    } catch (e) {
      console.error("Error fetching topics", e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await client.post('/questions/upload-image', uploadData);
      setFormData({ ...formData, image_url: res.data.image_url });
    } catch (err) {
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic_id) {
      alert("Please select or create a topic first");
      return;
    }

    setLoading(true);
    try {
      await client.post('/questions/', {
        ...formData,
        topic_id: parseInt(formData.topic_id),
        marks: parseInt(formData.marks.toString())
      });
      onSuccess();
    } catch (err) {
      alert("Failed to save question");
    } finally {
      setLoading(false);
    }
  };

  // Helper to "Seed" a topic for testing if none exist
  const quickSeedTopic = async () => {
    if (topics.length > 0) {
      alert("Topics already exist! Just select one from the list.");
      return;
    }

    try {
      setLoading(true);
      // Create a dummy hierarchy: CBSE -> Class 10 -> General -> Testing
      const s = await client.post('/curriculum/syllabuses', { syllabus_name: "General", academic_year: "2025-26" });
      const g = await client.post('/curriculum/grades', { syllabus_id: s.data.syllabus_id, grade_level: 10 });
      const sub = await client.post('/curriculum/subjects', { config_id: g.data.config_id, subject_name: "General Science" });
      const t = await client.post('/curriculum/topics', { subject_id: sub.data.subject_id, topic_name: "General Knowledge" });
      
      const newTopic = t.data;
      setTopics([newTopic]);
      setFormData({ ...formData, topic_id: newTopic.topic_id.toString() });
      alert("Test Topic Created! You can now save your question.");
    } catch (e) {
      alert("Quick setup failed. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Create New Question</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Text Content */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Topic Assignment</label>
                <div className="flex gap-2">
                  <select 
                    value={formData.topic_id}
                    onChange={(e) => setFormData({...formData, topic_id: e.target.value})}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                    required
                  >
                    <option value="">Select a Topic...</option>
                    {topics.map(t => (
                      <option key={t.topic_id} value={t.topic_id}>{t.topic_name}</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={quickSeedTopic}
                    className="px-4 py-3 bg-academy-100 text-academy-700 rounded-xl hover:bg-academy-200 transition-colors flex items-center gap-2 font-medium"
                    title="Quickly setup a test topic"
                  >
                    <Plus className="w-5 h-5" />
                    Setup
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Question Text</label>
                <textarea 
                  value={formData.question_text}
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none min-h-[120px]"
                  placeholder="Enter the question here..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Correct Answer</label>
                <textarea 
                  value={formData.answer_text}
                  onChange={(e) => setFormData({...formData, answer_text: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none min-h-[80px]"
                  placeholder="Enter the correct answer or solution..."
                  required
                />
              </div>
            </div>

            {/* Right Column: Config & Media */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Question Type</label>
                  <select 
                    value={formData.q_type}
                    onChange={(e) => setFormData({...formData, q_type: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none font-medium"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="True/False">True / False</option>
                    <option value="Short Answer">Short Answer</option>
                    <option value="Long Answer">Long Answer</option>
                    <option value="Match the Following">Match the Following</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Difficulty</label>
                    <select 
                      value={formData.difficulty}
                      onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Marks</label>
                    <input 
                      type="number"
                      value={formData.marks}
                      onChange={(e) => setFormData({...formData, marks: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-indigo-900/70 uppercase tracking-wider">Diagram / Image</label>
                <div className="relative group">
                  <div className={`
                    border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all
                    ${formData.image_url ? 'border-academy-500 bg-academy-50/30' : 'border-gray-200 bg-gray-50 hover:border-academy-400'}
                  `}>
                    {uploading ? (
                      <Loader2 className="w-10 h-10 text-academy-500 animate-spin" />
                    ) : formData.image_url ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-academy-200 shadow-sm">
                        <img 
                          src={`http://localhost:8000${formData.image_url}`} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                        <button 
                          onClick={() => setFormData({...formData, image_url: ''})}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                          <ImageIcon className="w-8 h-8 text-academy-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Click to upload a diagram</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG or SVG up to 5MB</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
            <button 
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-500 font-semibold hover:text-gray-700 transition-colors"
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={loading || uploading}
              className="bg-academy-700 hover:bg-academy-800 text-white px-10 py-3 rounded-xl shadow-lg shadow-academy-700/20 font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;
