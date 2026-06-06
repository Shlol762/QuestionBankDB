import React, { useState } from 'react';
import AllowedSubjectsManager from './AllowedSubjectsManager';
import AllowedGradesManager from './AllowedGradesManager';

const SystemConfigManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'grades'>('subjects');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">System Configuration</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Manage broad syllabi implications, including allowed subject naming and allowed grade structures.</p>
      </div>

      <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`pb-3 text-sm font-black tracking-widest uppercase transition-colors ${activeTab === 'subjects' ? 'text-academy-600 border-b-2 border-academy-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('subjects')}
        >
          Allowed Subjects
        </button>
        <button
          className={`pb-3 text-sm font-black tracking-widest uppercase transition-colors ${activeTab === 'grades' ? 'text-academy-600 border-b-2 border-academy-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('grades')}
        >
          Allowed Grades
        </button>
      </div>

      <div className="pt-2">
        {activeTab === 'subjects' && <AllowedSubjectsManager />}
        {activeTab === 'grades' && <AllowedGradesManager />}
      </div>
    </div>
  );
};

export default SystemConfigManager;
