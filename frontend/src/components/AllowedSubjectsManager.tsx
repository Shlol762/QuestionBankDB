import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Pencil, PlusCircle, Search, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';

interface AllowedSubject {
  allowed_subject_id: number;
  subject_name: string;
  recommendation_note?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AllowedSubjectsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AllowedSubject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['allowed-subjects', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '300');
      if (search) params.append('search', search);
      const res = await client.get(`/allowed-subjects/?${params.toString()}`);
      return res.data;
    },
  });

  const items: AllowedSubject[] = data?.items || [];

  const createMutation = useMutation({
    mutationFn: (payload: { subject_name: string; recommendation_note?: string; is_active: boolean }) =>
      client.post('/allowed-subjects/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-subjects'] });
      setSubjectName('');
      setNote('');
      setActive(true);
      toast.success('Allowed subject added');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to add allowed subject');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { subject_name?: string; recommendation_note?: string; is_active?: boolean } }) =>
      client.patch(`/allowed-subjects/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-subjects'] });
      setEditing(null);
      setSubjectName('');
      setNote('');
      setActive(true);
      toast.success('Allowed subject updated');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to update allowed subject');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.delete(`/allowed-subjects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-subjects'] });
      toast.success('Allowed subject removed');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to remove allowed subject');
    },
  });

  const isBusy = createMutation.isPending || updateMutation.isPending;

  const title = useMemo(() => (editing ? 'Edit Allowed Subject' : 'Create Allowed Subject'), [editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = subjectName.trim();
    if (!cleanName) {
      toast.error('Subject name is required');
      return;
    }

    const payload = {
      subject_name: cleanName,
      recommendation_note: note.trim() || undefined,
      is_active: active,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.allowed_subject_id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const startEdit = (item: AllowedSubject) => {
    setEditing(item);
    setSubjectName(item.subject_name);
    setNote(item.recommendation_note || '');
    setActive(item.is_active);
  };

  const cancelEdit = () => {
    setEditing(null);
    setSubjectName('');
    setNote('');
    setActive(true);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Allowed Subjects</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Soft governance catalog for recommended subject naming and onboarding consistency.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-500 mb-4">{title}</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Subject Name</label>
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold"
                placeholder="e.g. Mathematics"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Recommendation Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-medium min-h-28"
                placeholder="Optional guidance shown as recommendation"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active recommendation
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isBusy}
                className="px-4 py-2.5 rounded-xl bg-academy-600 hover:bg-academy-700 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {editing ? 'Update' : 'Add'}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-xs font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="xl:col-span-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-500">Catalog</h3>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subjects..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-academy-500" />
              </div>
            ) : items.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">No allowed subjects found</p>
            ) : (
              items.map((item) => (
                <div key={item.allowed_subject_id} className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-sm text-gray-900 dark:text-white">{item.subject_name}</p>
                      {item.recommendation_note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.recommendation_note}</p>
                      )}
                      <div className="mt-2 text-[10px] uppercase tracking-widest font-black">
                        {item.is_active ? (
                          <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                        ) : (
                          <span className="text-gray-500 inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(item)} className="p-2 rounded-lg hover:bg-academy-50 dark:hover:bg-academy-900/30 text-gray-500 hover:text-academy-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(item.allowed_subject_id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllowedSubjectsManager;
