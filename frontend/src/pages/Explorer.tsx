import React from 'react';
import { CurriculumTreePanel } from '../components/explorer/CurriculumTreePanel';
import { QuestionGridPanel } from '../components/explorer/QuestionGridPanel';

export const ExplorerPage: React.FC = () => {
  return (
    <div className="flex flex-1 gap-6 h-[calc(100vh-8rem)] min-h-[600px]">
      {/* Left Panel: Curriculum Tree (Drill-down) */}
      <CurriculumTreePanel />

      {/* Right Panel: Dynamic Question Grid */}
      <QuestionGridPanel />
    </div>
  );
};

export default ExplorerPage;
