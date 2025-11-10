"use client";

import { useMemo } from "react";
import type { EisenhowerQuadrant, Task } from "@/types";

const quadrantConfig: Record<
  EisenhowerQuadrant,
  {
    title: string;
    description: string;
    urgent: boolean;
    important: boolean;
    accent: string;
  }
> = {
  "do-now": {
    title: "Do Now",
    description: "Critical and urgent. Ship or unblock immediately.",
    urgent: true,
    important: true,
    accent: "border-rose-200 bg-rose-50",
  },
  schedule: {
    title: "Schedule",
    description: "Important but not urgent. Plan and protect time.",
    urgent: false,
    important: true,
    accent: "border-amber-200 bg-amber-50",
  },
  delegate: {
    title: "Delegate",
    description: "Urgent but less impactful. Assign or automate.",
    urgent: true,
    important: false,
    accent: "border-sky-200 bg-sky-50",
  },
  eliminate: {
    title: "Eliminate",
    description: "Neither urgent nor important. Drop or archive.",
    urgent: false,
    important: false,
    accent: "border-emerald-200 bg-emerald-50",
  },
};

export type EisenhowerMatrixProps = {
  tasks: Task[];
  onUpdate(task: Task): void;
  onRemove(id: string): void;
};

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const computeQuadrant = (task: Task): EisenhowerQuadrant => {
  if (task.urgent && task.important) return "do-now";
  if (!task.urgent && task.important) return "schedule";
  if (task.urgent && !task.important) return "delegate";
  return "eliminate";
};

export function EisenhowerMatrix({ tasks, onUpdate, onRemove }: EisenhowerMatrixProps) {
  const byQuadrant = useMemo(() => {
    return tasks.reduce<Record<EisenhowerQuadrant, Task[]>>(
      (acc, task) => {
        const bucket = computeQuadrant(task);
        acc[bucket].push(task);
        return acc;
      },
      { "do-now": [], schedule: [], delegate: [], eliminate: [] }
    );
  }, [tasks]);

  return (
    <section className="flex w-full flex-col">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-slate-900">Eisenhower Matrix</h2>
        <p className="text-sm text-slate-500">
          Prioritize by urgency and importance to keep the main thing the main thing.
        </p>
      </header>
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="relative flex items-stretch justify-center">
          <div className="grid h-full w-full max-w-4xl grid-cols-2 grid-rows-2 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
            {(Object.keys(quadrantConfig) as EisenhowerQuadrant[]).map((quadrant) => {
              const config = quadrantConfig[quadrant];
              const quadrantTasks = byQuadrant[quadrant];
              return (
                <div
                  key={quadrant}
                  className={`flex flex-col rounded-2xl border px-4 py-4 ${config.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {config.title}
                      </h3>
                      <p className="mt-1 text-xs leading-4 text-slate-600">
                        {config.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-inner">
                      {quadrantTasks.length}
                    </span>
                  </div>
                  <ul className="mt-4 flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto pr-1">
                    {quadrantTasks.map((task) => (
                      <li key={task.id} className="rounded-xl border border-white/60 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            {task.notes && (
                              <p className="mt-1 text-xs text-slate-600">{task.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => onRemove(task.id)}
                            className="text-xs font-medium text-slate-400 transition hover:text-rose-500"
                            type="button"
                            aria-label="Remove task"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
                          <span>
                            {task.urgent ? "Urgent" : "Not urgent"} · {task.important ? "Important" : "Not important"}
                          </span>
                          {formatDate(task.dueDate) && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                              Due {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate({
                                ...task,
                                status: task.status === "complete" ? "pending" : "complete",
                              })
                            }
                            className={`rounded-full px-3 py-1 font-medium transition ${
                              task.status === "complete"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {task.status === "complete" ? "Completed" : "Mark complete"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate({
                                ...task,
                                urgent: !task.urgent,
                              })
                            }
                            className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-200"
                          >
                            Toggle urgent
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate({
                                ...task,
                                important: !task.important,
                              })
                            }
                            className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-200"
                          >
                            Toggle important
                          </button>
                        </div>
                      </li>
                    ))}
                    {quadrantTasks.length === 0 && (
                      <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-xs text-slate-400">
                        No tasks yet
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

