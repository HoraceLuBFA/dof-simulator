
import React from 'react';
import { Experience } from './components/Scene/Experience';
import { ControlPanel } from './components/Dashboard/ControlPanel';
import { SchematicView } from './components/Dashboard/SchematicView';
import { MathPanel } from './components/Dashboard/MathPanel';

function App() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-950 text-slate-200 overflow-x-hidden">
      
      {/* Top Section: Split View 
          Mobile: Stacked vertically.
          Desktop: Side-by-side (row).
      */}
      <div className="w-full flex flex-col lg:flex-row h-auto lg:h-[60vh] border-b border-slate-800 shrink-0">
        
        {/* Studio View (Left/Top) */}
        <div className="relative w-full lg:w-1/2 h-[350px] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-800">
           <Experience mode="studio" />
        </div>

        {/* Viewfinder View (Right/Bottom) */}
        <div className="relative w-full lg:w-1/2 h-[350px] lg:h-full bg-black">
           <Experience mode="viewfinder" />
        </div>

      </div>

      {/* Bottom Section: Lab Dashboard 
          Stacks vertically on mobile, Grid on desktop.
      */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 border-t border-slate-800 bg-slate-900">
        
        {/* Controls (Left) */}
        <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50 p-4 min-h-[300px]">
          <ControlPanel />
        </div>

        {/* Visualizer (Center) */}
        <div className="lg:col-span-6 bg-slate-950 p-4 relative border-b lg:border-b-0 lg:border-r border-slate-800 flex items-center justify-center min-h-[350px]">
          <SchematicView />
        </div>

        {/* Math (Right) */}
        <div className="lg:col-span-3 bg-slate-900/50 p-4 min-h-[300px]">
          <MathPanel />
        </div>

      </div>
    </div>
  );
}

export default App;
