"use client";

import { BlueprintOrganizer } from "@/components/BlueprintOrganizer";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { TaskForm } from "@/components/TaskForm";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { ModelBlueprint, Task } from "@/types";

const defaultBlueprint: ModelBlueprint = {
  irRaw: "",
  irMarkdown: "",
  kcsRaw: "",
  kcsFormat: "json",
  chunkSize: 600,
  kcsChunks: [],
  lastUpdated: undefined,
};

const heroStats = [
  { label: "Focus Zones", value: "4" },
  { label: "Blueprint Slots", value: "2" },
  { label: "Local Save", value: "Auto" },
];

export default function Home() {
  const [tasks, setTasks, tasksReady] = usePersistentState<Task[]>("agentic-matrix:v1", []);
  const [blueprint, setBlueprint, blueprintReady] = usePersistentState<ModelBlueprint>(
    "agentic-blueprint:v1",
    defaultBlueprint
  );

  const hydrated = tasksReady && blueprintReady;

  const handleCreateTask = (task: Task) => {
    setTasks((previous) => [task, ...previous]);
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks((previous) => previous.map((task) => (task.id === updated.id ? updated : task)));
  };

  const handleRemoveTask = (id: string) => {
    setTasks((previous) => previous.filter((task) => task.id !== id));
  };

  const handleBlueprintChange = (value: ModelBlueprint) => {
    setBlueprint(value);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Agentic Ops Console</p>
          <p className="text-lg font-semibold">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-16">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Agent Alignment Board</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">
                Task flow + AI blueprinting in one command center
              </h1>
              <p className="text-sm text-slate-600 lg:text-base">
                Capture what matters, prioritize by impact, and continuously synthesize the knowledge your
                custom model depends on.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <dt className="text-[10px] text-slate-400">{stat.label}</dt>
                  <dd className="mt-1 text-lg text-slate-900">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <TaskForm onCreate={handleCreateTask} />
            <EisenhowerMatrix tasks={tasks} onUpdate={handleUpdateTask} onRemove={handleRemoveTask} />
          </div>
          <BlueprintOrganizer value={blueprint} onChange={handleBlueprintChange} />
        </section>
      </main>
    </div>
  );
}
