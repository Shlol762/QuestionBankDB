import React from 'react';
import { useOutlet } from 'react-router-dom';
import { StickyTopNav } from '../components/layout/StickyTopNav';
import { useUIStore } from '../store/uiStore';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';

// This is the new overarching Dashboard layout wrapper
export const Dashboard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { openDrawer, openDialog } = useUIStore();
  const outlet = useOutlet();

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col relative">
      <StickyTopNav />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 flex flex-col">
        {/* Placeholder for router outlet or children */}
        {outlet || children || (
          <div className="flex-1 flex flex-col items-center justify-center glass rounded-2xl p-8 border border-white/5 bg-white/[0.01]">
            <div className="text-center max-w-2xl">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue-400 to-neon-fuchsia-400 mb-2">
                Unified Explorer Layout
              </h1>
              <p className="text-gray-400 text-sm mb-8">
                Phase 2 styling verification panel. Click the triggers below to interactively test the frosted glass components, responsive accordions, step wizard onboarding, and red-glowing safety verification dialogs.
              </p>

              {/* Grid of Interactive Trigger Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Drawers Section */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neon-blue-400">Right-Sliding Drawers</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openDrawer('CREATE_QUESTION', { preselectedTopicId: 1 })}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-neon-blue-500/20 hover:border-neon-blue-500/40 hover:text-neon-blue-300 transition-all duration-200"
                    >
                      ✦ Create Question (Accordion Form)
                    </button>
                    <button
                      onClick={() => openDrawer('CREATE_STAFF')}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-neon-emerald-500/20 hover:border-neon-emerald-500/40 hover:text-neon-emerald-300 transition-all duration-200"
                    >
                      ✦ Add Staff Member (Multi-step Wizard)
                    </button>
                  </div>
                </div>

                {/* Modals Section */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neon-fuchsia-400">Centered Dialogs / Modals</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openDialog('ADD_SYLLABUS')}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-neon-fuchsia-500/20 hover:border-neon-fuchsia-500/40 hover:text-neon-fuchsia-300 transition-all duration-200"
                    >
                      ✦ Standard Dialogue: Add Syllabus Form
                    </button>
                    <button
                      onClick={() => openDialog('EDIT_ALLOWED_SUBJECT', { 
                        allowedSubjectId: 12, 
                        currentName: 'Advanced Physics', 
                        currentNote: 'Recommended for high school STEM stream only.', 
                        isActive: true 
                      })}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-neon-blue-500/20 hover:border-neon-blue-500/40 hover:text-neon-blue-300 transition-all duration-200"
                    >
                      ✦ Config Dialogue: Edit Allowed Subject
                    </button>
                    <button
                      onClick={() => openDialog('DELETE_SYLLABUS', { syllabusName: 'Cambridge G9 2026' })}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 border border-red-500/10 text-red-400 hover:bg-neon-red-500/20 hover:border-neon-red-500/40 hover:text-red-300 transition-all duration-200"
                    >
                      ⚠️ Safety Modal: Delete Syllabus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Drawers and Dialogs Portals */}
      <Drawer />
      <Modal />
    </div>
  );
};

export default Dashboard;
