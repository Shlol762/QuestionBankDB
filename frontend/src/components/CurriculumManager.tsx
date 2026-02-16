import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Book, 
  Layers, 
  FolderRoot, 
  Tag, 
  Plus, 
  MoreVertical,
  Loader2,
  RefreshCw,
  Save,
  AlertCircle
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import Modal from './Modal';

const CurriculumManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string[]>([]);
  
  // Modal State
  const [modalType, setModalType] = useState<'syllabus' | 'grade' | 'subject' | 'topic' | null>(null);
  const [modalData, setModalData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: hierarchy = [], isLoading, isRefetching } = useQuery({
    queryKey: ['curriculum-hierarchy'],
    queryFn: async () => {
      const res = await client.get('/curriculum/hierarchy');
      return res.data;
    }
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint = '';
    let payload = {};

    switch (modalType) {
      case 'syllabus':
        endpoint = '/curriculum/syllabuses';
        payload = { syllabus_name: modalData.name, academic_year: modalData.year };
        break;
      case 'grade':
        endpoint = '/curriculum/grades';
        payload = { syllabus_id: modalData.parentId, grade_level: parseInt(modalData.level) };
        break;
      case 'subject':
        endpoint = '/curriculum/subjects';
        payload = { config_id: modalData.parentId, subject_name: modalData.name };
        break;
      case 'topic':
        endpoint = '/curriculum/topics';
        payload = { subject_id: modalData.parentId, topic_name: modalData.name };
        break;
    }

    try {
      await client.post(endpoint, payload);
      queryClient.invalidateQueries({ queryKey: ['curriculum-hierarchy'] });
      setModalType(null);
      setModalData({});
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-medium">Loading school structure...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Curriculum Manager</h2>
          <p className="text-gray-500">Configure your school's syllabus, subjects, and topics.</p>
        </div>
        
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['curriculum-hierarchy'] })}
          className="flex items-center gap-2 px-4 py-2 text-academy-600 hover:bg-academy-50 rounded-xl transition-all font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Organizational Tree</span>
          <button 
            onClick={() => { setModalType('syllabus'); setModalData({}); setError(''); }}
            className="bg-academy-600 hover:bg-academy-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Syllabus
          </button>
        </div>

        <div className="p-6 space-y-4">
          {hierarchy.length === 0 ? (
            <div className="text-center py-12 text-gray-400 italic">
              No data found. Start by creating a new Syllabus.
            </div>
          ) : (
            hierarchy.map((syllabus: any) => (
              <div key={`s-${syllabus.syllabus_id}`} className="border border-gray-100 rounded-2xl overflow-hidden">
                {/* Syllabus Level */}
                <div 
                  className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(`s-${syllabus.syllabus_id}`)}
                >
                  <div className="flex items-center gap-3">
                    {expanded.includes(`s-${syllabus.syllabus_id}`) ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    <div className="p-2 bg-academy-100 text-academy-700 rounded-lg">
                      <FolderRoot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{syllabus.syllabus_name}</h3>
                      <p className="text-xs text-gray-400">Academic Year {syllabus.academic_year}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModalType('grade'); setModalData({ parentId: syllabus.syllabus_id }); setError(''); }}
                    className="p-2 hover:bg-academy-100 text-academy-600 rounded-lg transition-colors"
                    title="Add Grade"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Grades Level */}
                {expanded.includes(`s-${syllabus.syllabus_id}`) && (
                  <div className="bg-gray-50/30 px-6 pb-4 space-y-2 border-t border-gray-50">
                    {(syllabus.grades || []).length === 0 && <p className="text-xs text-gray-400 py-4 ml-12">No grades added yet.</p>}
                    {(syllabus.grades || []).map((grade: any) => (
                      <div key={`g-${grade.config_id}`} className="mt-2">
                        <div 
                          className="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 shadow-sm shadow-transparent hover:shadow-gray-200/50"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(`g-${grade.config_id}`); }}
                        >
                          <div className="flex items-center gap-3 ml-4">
                            {expanded.includes(`g-${grade.config_id}`) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <Layers className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold text-gray-700 text-sm">Grade {grade.grade_level}</span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setModalType('subject'); setModalData({ parentId: grade.config_id }); setError(''); }}
                            className="text-xs font-bold text-academy-600 hover:text-academy-700 px-2 py-1"
                          >
                            Add Subject
                          </button>
                        </div>

                        {/* Subjects Level */}
                        {expanded.includes(`g-${grade.config_id}`) && (
                          <div className="ml-12 mt-2 space-y-1">
                            {(grade.subjects || []).length === 0 && <p className="text-xs text-gray-400 py-2 ml-8">No subjects added.</p>}
                            {(grade.subjects || []).map((subject: any) => (
                              <div key={`sub-${subject.subject_id}`}>
                                <div 
                                  className="flex items-center justify-between p-2 hover:text-academy-700 transition-colors cursor-pointer group"
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(`sub-${subject.subject_id}`); }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-academy-400" />
                                    <Book className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{subject.subject_name}</span>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setModalType('topic'); setModalData({ parentId: subject.subject_id }); setError(''); }}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] font-black uppercase text-academy-600 tracking-tighter hover:bg-academy-50 px-2 py-1 rounded transition-all"
                                  >
                                    New Topic
                                  </button>
                                </div>

                                {/* Topics Level */}
                                {expanded.includes(`sub-${subject.subject_id}`) && (
                                  <div className="ml-8 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3">
                                    {(subject.topics || []).length === 0 && <p className="text-[10px] text-gray-400 ml-4">Empty topic list.</p>}
                                    {(subject.topics || []).map((topic: any) => (
                                      <div key={`t-${topic.topic_id}`} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded-lg text-xs font-medium text-gray-500 hover:border-academy-200 hover:text-academy-700 transition-all shadow-sm">
                                        <Tag className="w-3 h-3 text-emerald-500" />
                                        {topic.topic_name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Modal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)}
        title={
          modalType === 'syllabus' ? 'Create New Syllabus' :
          modalType === 'grade' ? 'Add Grade Level' :
          modalType === 'subject' ? 'Add New Subject' : 'Create New Topic'
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {modalType === 'syllabus' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Syllabus Name</label>
                <input 
                  autoFocus
                  required
                  placeholder="e.g. CBSE, ICSE"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                  value={modalData.name || ''}
                  onChange={e => setModalData({...modalData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Academic Year</label>
                <input 
                  required
                  placeholder="e.g. 2025-26"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                  value={modalData.year || ''}
                  onChange={e => setModalData({...modalData, year: e.target.value})}
                />
              </div>
            </>
          )}

          {modalType === 'grade' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Grade Level (Number)</label>
              <input 
                autoFocus
                required
                type="number"
                placeholder="e.g. 10"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                value={modalData.level || ''}
                onChange={e => setModalData({...modalData, level: e.target.value})}
              />
            </div>
          )}

          {(modalType === 'subject' || modalType === 'topic') && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Name</label>
              <input 
                autoFocus
                required
                placeholder={modalType === 'subject' ? "e.g. Physics, History" : "e.g. Algebra, WWII"}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none"
                value={modalData.name || ''}
                onChange={e => setModalData({...modalData, name: e.target.value})}
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setModalType(null)}
              className="flex-1 px-4 py-3 text-gray-500 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] bg-academy-700 hover:bg-academy-800 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save {modalType === 'syllabus' ? 'Syllabus' : modalType === 'grade' ? 'Grade' : modalType === 'subject' ? 'Subject' : 'Topic'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CurriculumManager;
