"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Task } from "@/types";

const URGENCY_KEYWORDS = [
  "today",
  "now",
  "asap",
  "urgent",
  "immediately",
  "soon",
  "deadline",
];

const IMPORTANCE_KEYWORDS = [
  "strategy",
  "critical",
  "important",
  "impact",
  "key",
  "goal",
  "milestone",
];

export type TaskFormProps = {
  onCreate(task: Task): void;
};

type InferredSignals = {
  urgent: boolean;
  important: boolean;
};

const inferSignals = (input: string): InferredSignals => {
  const normalized = input.toLowerCase();

  const urgent = URGENCY_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  const important = IMPORTANCE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  return {
    urgent,
    important: important || /\b(okr|roadmap|research|customer)\b/.test(normalized),
  };
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const newTask = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? generateId(),
  title: overrides.title ?? "",
  notes: overrides.notes,
  urgent: overrides.urgent ?? false,
  important: overrides.important ?? false,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  dueDate: overrides.dueDate,
  status: overrides.status ?? "pending",
});

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [urgentManual, setUrgentManual] = useState(false);
  const [importantManual, setImportantManual] = useState(false);
  const inferred = useMemo(() => inferSignals(title + "\n" + notes), [title, notes]);

  const applyInference = (nextTitle: string, nextNotes: string) => {
    const signals = inferSignals(nextTitle + "\n" + nextNotes);
    if (!urgentManual) setUrgent(signals.urgent);
    if (!importantManual) setImportant(signals.important);
  };

  const canSubmit = title.trim().length > 0;

  const reset = () => {
    setTitle("");
    setNotes("");
    setDueDate("");
    setUrgent(false);
    setImportant(false);
    setUrgentManual(false);
    setImportantManual(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onCreate(
      newTask({
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate: dueDate || undefined,
        urgent,
        important,
      })
    );
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">Add a Task</h2>
      <p className="mt-1 text-sm text-slate-500">
        Signals for urgency and importance are inferred automatically; adjust if
        needed.
      </p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-600">
          Task title
          <input
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              applyInference(nextTitle, notes);
            }}
            placeholder="Summarize the task"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Notes
          <textarea
            value={notes}
            onChange={(event) => {
              const nextNotes = event.target.value;
              setNotes(nextNotes);
              applyInference(title, nextNotes);
            }}
            placeholder="Add context, expectations, or desired outcomes"
            className="mt-1 h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-600">
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              <span>Urgent</span>
              <input
                type="checkbox"
                checked={urgent}
                onChange={(event) => {
                  setUrgent(event.target.checked);
                  setUrgentManual(true);
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              <span>Important</span>
              <input
                type="checkbox"
                checked={important}
                onChange={(event) => {
                  setImportant(event.target.checked);
                  setImportantManual(true);
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
            </label>
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Add to Matrix
      </button>
      <button
        type="button"
        onClick={() => {
          setUrgentManual(false);
          setImportantManual(false);
          setUrgent(inferred.urgent);
          setImportant(inferred.important);
        }}
        className="mt-2 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
      >
        Reset to inferred priority
      </button>
    </form>
  );
}
