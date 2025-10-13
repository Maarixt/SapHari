import React from "react";
import AppShell from "@/components/layout/AppShell";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { LibraryPanel } from "@/components/simulator/LibraryPanel";
import { CanvasPanel } from "@/components/simulator/CanvasPanel";
import { InspectorPanel } from "@/components/simulator/InspectorPanel";
import { ConsolePanel } from "@/components/simulator/ConsolePanel";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Simulator() {
  const navigate = useNavigate();

  return (
    <AppShell 
      title="Circuit Simulator" 
      actions={
        <button 
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-xl bg-white border border-ink-200 text-ink-900 hover:bg-[var(--surface)] transition flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      }
    >
      <div className="grid grid-cols-[280px_1fr_360px] grid-rows-[1fr_220px] gap-4 h-[calc(100vh-120px)]">
        <SurfaceCard className="overflow-hidden">
          <LibraryPanel />
        </SurfaceCard>
        <SurfaceCard className="overflow-hidden">
          <CanvasPanel />
        </SurfaceCard>
        <SurfaceCard className="overflow-hidden">
          <InspectorPanel />
        </SurfaceCard>
        <SurfaceCard className="overflow-hidden col-span-3">
          <ConsolePanel />
        </SurfaceCard>
      </div>
    </AppShell>
  );
}
