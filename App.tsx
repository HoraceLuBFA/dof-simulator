
import React from 'react';
import { Experience } from './components/Scene/Experience';
import { ControlPanel } from './components/Dashboard/ControlPanel';
import { SchematicView } from './components/Dashboard/SchematicView';
import { MathPanel } from './components/Dashboard/MathPanel';

function App() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-950 text-slate-200 overflow-x-hidden overflow-y-auto">
      
      {/* Two-row layout: top (experience) and bottom (dashboard).
          On large screens we stay in desktop layout based on width only; height squeezes just introduce scroll.
      */}
    <div className="flex-1 flex flex-col lg:grid lg:grid-rows-[auto_auto] lg:content-start">
        {/* Top Section: Split View 
            Mobile: Stacked vertically.
            Desktop: Side-by-side (row).
        */}
        <div className="w-full flex flex-col lg:grid lg:grid-cols-2 border-b border-slate-800 shrink-0">
          
          {/* Studio View (Left/Top) */}
          <div className="relative w-full lg:min-w-0 aspect-video border-b lg:border-b-0 lg:border-r border-slate-800">
            <Experience mode="studio" />
          </div>

          {/* Viewfinder View (Right/Bottom) */}
          <div className="relative w-full lg:min-w-0 aspect-video bg-black">
            <Experience mode="viewfinder" />
          </div>

        </div>

        {/* Bottom Section: Lab Dashboard 
            Stacks vertically on mobile, Grid on desktop.
            Removed fixed height constraint to allow scaling.
        */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:items-start border-t border-slate-800 bg-slate-900">
          
          {/* Visualizer (Left) - Swapped Position 
              Added aspect ratio to force height scaling on wide screens.
          */}
          <div className="lg:col-span-6 bg-slate-900/50 relative border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col lg:aspect-[2.2/1] self-start lg:h-auto">
            <SchematicView />
          </div>

          {/* Controls (Center) - Swapped Position */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50 flex flex-col h-full min-h-[400px] lg:min-h-0 lg:max-h-[calc(100vw/2.2)] lg:overflow-y-auto">
            <ControlPanel />
          </div>

          {/* Math (Right) */}
          <div className="lg:col-span-3 bg-slate-900/50 flex flex-col h-full min-h-[400px] lg:min-h-0 lg:max-h-[calc(100vw/2.2)] lg:overflow-y-auto">
            <MathPanel />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
