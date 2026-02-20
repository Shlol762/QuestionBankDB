import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import Modal from './Modal';

const CurriculumManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string[]>([]);
  
  // 1. Get Identity
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await client.get('/auth/me');
      return res.data;
    }
  });

  const isAdmin = user?.is_admin || false;
  const assignedSubjectIds = user?.subjects?.map((s: any) => s.subject_id) || [];
  const gradeLevels = user?.grade_levels || [];
  const hodSubjects = user?.hod_subject_names || [];

  // Modal State
  const [modalType, setModalType] = useState<'syllabus' | 'grade' | 'subject' | 'topic' | null>(null);
  const [modalData, setModalData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{type: string, id: number, name: string} | null>(null);

  const { data: rawHierarchy = [], isLoading, isRefetching } = useQuery({
    queryKey: ['curriculum-hierarchy'],
    queryFn: async () => {
      const res = await client.get('/curriculum/hierarchy');
      return res.data;
    }
  });

  // 2. Filter the tree based on permissions
  const hierarchy = useMemo(() => {
    if (isAdmin) return rawHierarchy;

    return rawHierarchy.map((syllabus: any) => {
      const filteredGrades = (syllabus.grades || []).map((grade: any) => {
        // If Grade Coordinator for this level, show ALL subjects in this grade
        const isCoordinator = gradeLevels.includes(grade.grade_level);
        
        const filteredSubjects = (grade.subjects || []).filter((subject: any) => {
          if (isCoordinator) return true;
          if (hodSubjects.includes(subject.subject_name)) return true;
          return assignedSubjectIds.includes(subject.subject_id);
        });

        return { ...grade, subjects: filteredSubjects, isCoordinator };
      }).filter((grade: any) => grade.subjects.length > 0);
      
      return { ...syllabus, grades: filteredGrades };
    }).filter((syllabus: any) => syllabus.grades.length > 0);
  }, [rawHierarchy, isAdmin, assignedSubjectIds, gradeLevels, hodSubjects]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint = '';
    let payload = {};
    const method = isEditing ? 'patch' : 'post';

    switch (modalType) {
      case 'syllabus':
        endpoint = `/curriculum/syllabuses${isEditing ? `/${modalData.id}` : ''}`;
        payload = { syllabus_name: modalData.name, academic_year: modalData.year };
        break;
      case 'grade':
        endpoint = `/curriculum/grades${isEditing ? `/${modalData.id}` : ''}`;
        payload = { syllabus_id: modalData.parentId, grade_level: parseInt(modalData.level) };
        break;
      case 'subject':
        endpoint = `/curriculum/subjects${isEditing ? `/${modalData.id}` : ''}`;
        payload = { config_id: modalData.parentId, subject_name: modalData.name };
        break;
      case 'topic':
        endpoint = `/curriculum/topics${isEditing ? `/${modalData.id}` : ''}`;
        payload = { subject_id: modalData.parentId, topic_name: modalData.name };
        break;
    }

    try {
      await (client as any)[method](endpoint, payload);
      queryClient.invalidateQueries({ queryKey: ['curriculum-hierarchy'] });
      setModalType(null);
      setModalData({});
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      let url = '';
      if (deleteTarget.type === 'syllabus') url = `/curriculum/syllabuses/${deleteTarget.id}`;
      if (deleteTarget.type === 'grade') url = `/curriculum/grades/${deleteTarget.id}`;
      if (deleteTarget.type === 'subject') url = `/curriculum/subjects/${deleteTarget.id}`;
      if (deleteTarget.type === 'topic') url = `/curriculum/topics/${deleteTarget.id}`;
      
      await client.delete(url);
      queryClient.invalidateQueries({ queryKey: ['curriculum-hierarchy'] });
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (type: any, item: any) => {
    setIsEditing(true);
    setModalType(type);
    setError('');
    if (type === 'syllabus') setModalData({ id: item.syllabus_id, name: item.syllabus_name, year: item.academic_year });
    if (type === 'grade') setModalData({ id: item.config_id, level: item.grade_level, parentId: item.syllabus_id });
    if (type === 'subject') setModalData({ id: item.subject_id, name: item.subject_name, parentId: item.config_id });
    if (type === 'topic') setModalData({ id: item.topic_id, name: item.topic_name, parentId: item.subject_id });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-academy-500" />
        <p className="font-medium">Loading school structure...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between mb-8 text-gray-900">
        <div>
          <h2 className="text-3xl font-extrabold">{isAdmin ? 'Curriculum Manager' : 'My Subjects'}</h2>
          <p className="text-gray-500">{isAdmin ? "Configure school syllabus, subjects, and topics." : "Manage topics for your assigned subjects."}</p>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['curriculum-hierarchy'] })} className="flex items-center gap-2 px-4 py-2 text-academy-600 hover:bg-academy-50 rounded-xl transition-all font-bold">
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-gray-900">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Organizational Tree</span>
          {isAdmin && (
            <button onClick={() => { setModalType('syllabus'); setModalData({}); setIsEditing(false); setError(''); }} className="bg-academy-600 hover:bg-academy-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Syllabus
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {hierarchy.length === 0 ? (
            <div className="text-center py-12 text-gray-400 italic">{isAdmin ? "No data found." : "No assigned subjects found."}</div>
          ) : (
            hierarchy.map((syllabus: any) => (
              <div key={`s-${syllabus.syllabus_id}`} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer group transition-colors" onClick={() => toggleExpand(`s-${syllabus.syllabus_id}`)}>
                  <div className="flex items-center gap-3">
                    {expanded.includes(`s-${syllabus.syllabus_id}`) ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    <div className="p-2 bg-academy-100 text-academy-700 rounded-lg"><FolderRoot className="w-5 h-5" /></div>
                    <div><h3 className="font-bold">{syllabus.syllabus_name}</h3><p className="text-xs text-gray-400 font-bold">{syllabus.academic_year}</p></div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); openEdit('syllabus', syllabus); }} className="p-2 hover:bg-white text-gray-400 hover:text-academy-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'syllabus', id: syllabus.syllabus_id, name: syllabus.syllabus_name}); }} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setModalType('grade'); setModalData({ parentId: syllabus.syllabus_id }); setIsEditing(false); }} className="ml-2 bg-academy-50 text-academy-700 px-3 py-1.5 rounded-lg text-xs font-bold">+ Grade</button>
                      </>
                    )}
                  </div>
                </div>

                {expanded.includes(`s-${syllabus.syllabus_id}`) && (
                  <div className="bg-gray-50/30 px-6 pb-4 space-y-2 border-t border-gray-50">
                    {(syllabus.grades || []).map((grade: any) => (
                      <div key={`g-${grade.config_id}`}>
                        <div className="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 group/grade shadow-sm" onClick={(e) => { e.stopPropagation(); toggleExpand(`g-${grade.config_id}`); }}>
                          <div className="flex items-center gap-3 ml-4">
                            {expanded.includes(`g-${grade.config_id}`) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <Layers className="w-4 h-4 text-amber-500" /><span className="font-bold text-sm tracking-tight text-gray-700">Grade {grade.grade_level}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/grade:opacity-100 transition-opacity">
                            {isAdmin && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); openEdit('grade', grade); }} className="p-1.5 text-gray-400 hover:text-academy-600"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'grade', id: grade.config_id, name: `Grade ${grade.grade_level}`}); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                            { (isAdmin || grade.isCoordinator) && (
                              <button onClick={(e) => { e.stopPropagation(); setModalType('subject'); setModalData({ parentId: grade.config_id }); setIsEditing(false); }} className="ml-2 text-[10px] font-black uppercase text-academy-600 border border-academy-100 px-2 py-1 rounded-md hover:bg-academy-600 hover:text-white transition-all">+ Subject</button>
                            )}
                          </div>
                        </div>

                        {expanded.includes(`g-${grade.config_id}`) && (
                          <div className="ml-12 mt-2 space-y-1">
                            {(grade.subjects || []).map((subject: any) => {
                              const canModifySubject = isAdmin || grade.isCoordinator;
                              const canModifyTopic = isAdmin || grade.isCoordinator || hodSubjects.includes(subject.subject_name) || assignedSubjectIds.includes(subject.subject_id);

                              return (
                                <div key={`sub-${subject.subject_id}`}>
                                  <div className="flex items-center justify-between p-2 hover:text-academy-700 transition-colors cursor-pointer group/sub" onClick={(e) => { e.stopPropagation(); toggleExpand(`sub-${subject.subject_id}`); }}>
                                    <div className="flex items-center gap-3 ml-4">
                                      <Book className="w-4 h-4 text-blue-500" /><span className="text-sm font-bold text-gray-600">{subject.subject_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                      {canModifySubject && (
                                        <>
                                          <button onClick={(e) => { e.stopPropagation(); openEdit('subject', subject); }} className="p-1 text-gray-400 hover:text-academy-600"><Pencil className="w-3 h-3" /></button>
                                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'subject', id: subject.subject_id, name: subject.subject_name}); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                        </>
                                      )}
                                      {canModifyTopic && (
                                        <button onClick={(e) => { e.stopPropagation(); setModalType('topic'); setModalData({ parentId: subject.subject_id }); setIsEditing(false); }} className="ml-2 text-[10px] font-black uppercase text-academy-600 hover:bg-academy-50 px-2 py-1 rounded">+ Topic</button>
                                      )}
                                    </div>
                                  </div>

                                  {expanded.includes(`sub-${subject.subject_id}`) && (
                                    <div className="ml-12 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3">
                                      {(subject.topics || []).map((topic: any) => (
                                        <div key={`t-${topic.topic_id}`} className="group/topic flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:border-academy-200 hover:text-academy-700 transition-all shadow-sm">
                                          <div className="flex items-center gap-2"><Tag className="w-3 h-3 text-emerald-500" />{topic.topic_name}</div>
                                          <div className="flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                            {canModifyTopic && (
                                              <>
                                                <button onClick={() => openEdit('topic', topic)} className="p-1 hover:text-academy-600"><Pencil className="w-3 h-3" /></button>
                                                <button onClick={() => setDeleteTarget({type:'topic', id: topic.topic_id, name: topic.topic_name})} className="p-1 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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

      {/* Forms Modal */}
      <Modal isOpen={modalType !== null} onClose={() => setModalType(null)} title={`${isEditing ? 'Update' : 'New'} ${modalType}`}>
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          {modalType === 'syllabus' && (
            <>
              <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500" placeholder="Name" value={modalData.name || ''} onChange={e => setModalData({...modalData, name: e.target.value})} />
              <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500" placeholder="Year" value={modalData.year || ''} onChange={e => setModalData({...modalData, year: e.target.value})} />
            </>
          )}
          {modalType === 'grade' && <input required type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Level" value={modalData.level || ''} onChange={e => setModalData({...modalData, level: e.target.value})} />}
          {(modalType === 'subject' || modalType === 'topic') && <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Name" value={modalData.name || ''} onChange={e => setModalData({...modalData, name: e.target.value})} />}
          <div className="pt-4 flex gap-3"><button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 font-bold text-gray-400">Cancel</button><button type="submit" className="flex-[2] bg-academy-700 text-white font-bold py-3 rounded-xl shadow-lg">{loading ? 'Saving...' : 'Save Changes'}</button></div>
        </form>
      </Modal>

      {/* Danger Modal */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Confirmation">
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100"><Trash2 className="w-10 h-10" /></div>
          <div><h4 className="text-xl font-black text-gray-900 mb-2">Delete "{deleteTarget?.name}"?</h4><p className="text-sm text-gray-500">This action cannot be undone and will delete all children.</p></div>
          <div className="flex gap-3"><button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 text-gray-400 font-bold">Cancel</button><button onClick={handleDelete} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20">{loading ? 'Deleting...' : 'Delete Permanently'}</button></div>
        </div>
      </Modal>
    </div>
  );
};

export default CurriculumManager;
