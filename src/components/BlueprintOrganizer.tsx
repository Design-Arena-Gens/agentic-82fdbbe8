"use client";

import { type ChangeEvent, useState } from "react";
import type { KCSChunk, KCSFormat, ModelBlueprint } from "@/types";

type BlueprintOrganizerProps = {
  value: ModelBlueprint;
  onChange(value: ModelBlueprint): void;
};

const extractKeywords = (content: string, limit = 5) => {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => keyword);
};

const estimateTokens = (content: string) => Math.ceil(content.split(/\s+/).length * 1.3);

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

export const chunkKCS = (content: string, chunkSize: number): KCSChunk[] => {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chunks: KCSChunk[] = [];
  let buffer = "";
  let startOffset = 0;

  const flushBuffer = (index: number) => {
    if (!buffer.trim()) return;
    const chunkContent = buffer.trim();
    const endOffset = startOffset + chunkContent.length;
    chunks.push({
      id: generateId(),
      chunkIndex: index,
      content: chunkContent,
      tokenEstimate: estimateTokens(chunkContent),
      metadata: {
        startOffset,
        endOffset,
        keywords: extractKeywords(chunkContent),
      },
    });
    startOffset = endOffset + 1;
    buffer = "";
  };

  let index = 0;
  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length > chunkSize && buffer) {
      flushBuffer(index++);
    }
    buffer = buffer ? `${buffer} ${sentence}` : sentence;
    if (buffer.length >= chunkSize) {
      flushBuffer(index++);
    }
  }
  flushBuffer(index);

  return chunks;
};

export const convertIRToMarkdown = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const sections = trimmed.split(/\n{2,}/).map((block) => block.trim());
  return sections
    .map((section, sectionIndex) => {
      const lines = section.split(/\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return "";
      if (sectionIndex === 0) {
        const [first, ...rest] = lines;
        const heading = first.replace(/^#+\s*/, "");
        if (!rest.length) {
          return `# ${heading}`;
        }
        const blockquote = rest.map((line) => `> ${line}`).join("\n");
        return `# ${heading}\n${blockquote}`;
      }

      if (lines.length === 1) {
        return `## ${lines[0]}`;
      }

      const [heading, ...rest] = lines;
      const bullets = rest.map((line) => `- ${line}`).join("\n");
      return `## ${heading}\n${bullets}`;
    })
    .filter(Boolean)
    .join("\n\n");
};

const downloadFile = (filename: string, contents: string, type: string) => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const createKCSPayload = (chunks: KCSChunk[], format: KCSFormat) => {
  if (format === "json") {
    return JSON.stringify({ chunks }, null, 2);
  }

  return chunks.map((chunk) => JSON.stringify(chunk)).join("\n");
};

export function BlueprintOrganizer({ value, onChange }: BlueprintOrganizerProps) {
  const chunks = value.kcsChunks.length
    ? value.kcsChunks
    : chunkKCS(value.kcsRaw, value.chunkSize);

  const [uploadTarget, setUploadTarget] = useState<"ir" | "kcs">("ir");

  const chunkSummary = chunks
    .map((chunk) => `${chunk.chunkIndex + 1}. ${chunk.metadata.keywords.join(", ")}`)
    .join("\n");

  const averageTokens = chunks.length
    ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.tokenEstimate, 0) / chunks.length)
    : 0;

  const updateBlueprint = (partial: Partial<ModelBlueprint>) => {
    onChange({ ...value, ...partial });
  };

  const handleIRChange = (raw: string) => {
    updateBlueprint({
      irRaw: raw,
      irMarkdown: convertIRToMarkdown(raw),
    });
  };

  const handleKCSChange = (raw: string) => {
    updateBlueprint({
      kcsRaw: raw,
      kcsChunks: chunkKCS(raw, value.chunkSize),
    });
  };

  const handleChunkSizeChange = (size: number) => {
    updateBlueprint({
      chunkSize: size,
      kcsChunks: chunkKCS(value.kcsRaw, size),
    });
  };

  const handleFormatChange = (format: KCSFormat) => {
    updateBlueprint({ kcsFormat: format });
  };

  const handleProcess = () => {
    updateBlueprint({
      irMarkdown: convertIRToMarkdown(value.irRaw),
      kcsChunks: chunkKCS(value.kcsRaw, value.chunkSize),
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (uploadTarget === "kcs") {
      handleKCSChange(value.kcsRaw ? `${value.kcsRaw}\n\n${text}` : text);
    } else {
      handleIRChange(value.irRaw ? `${value.irRaw}\n\n${text}` : text);
    }
    event.target.value = "";
  };

  const handleExportIR = () => {
    const markdown = value.irMarkdown || convertIRToMarkdown(value.irRaw);
    if (!markdown) return;
    downloadFile("instructional-ruleset.md", markdown, "text/markdown");
  };

  const handleExportKCS = () => {
    const payload = createKCSPayload(chunks, value.kcsFormat);
    if (!payload) return;
    downloadFile(
      value.kcsFormat === "json" ? "knowledge-compendium.json" : "knowledge-compendium.jsonl",
      payload,
      "application/json"
    );
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-slate-900">Gemini / Custom GPT Blueprint</h2>
        <p className="text-sm text-slate-500">
          Capture persona and knowledge in structured formats ready for deployable AI agents.
        </p>
      </header>

      <div className="mt-6 space-y-6">
        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            Instructional Ruleset (IR)
            <span className="text-[10px] font-medium text-slate-400">auto-converted to Markdown</span>
          </label>
          <textarea
            value={value.irRaw}
            onChange={(event) => handleIRChange(event.target.value)}
            placeholder="Define the model persona, communication patterns, guardrails, and decision loops."
            className="mt-2 h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
          <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Markdown preview</span>
            <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
{value.irMarkdown || ""}
            </pre>
          </div>
        </div>

        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            Knowledge Compendium Synthesis (KCS)
            <span className="text-[10px] font-medium text-slate-400">chunked with metadata</span>
          </label>
          <textarea
            value={value.kcsRaw}
            onChange={(event) => handleKCSChange(event.target.value)}
            placeholder="Paste research, system facts, domain briefs, or structured notes to turn into retrieval-ready knowledge chunks."
            className="mt-2 h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
              <span>Chunk size</span>
              <input
                type="number"
                min={200}
                max={1200}
                step={100}
                value={value.chunkSize}
                onChange={(event) => handleChunkSizeChange(Number(event.target.value) || 600)}
                className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
              <span>Export as</span>
              <select
                value={value.kcsFormat}
                onChange={(event) => handleFormatChange(event.target.value as KCSFormat)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                <option value="json">JSON</option>
                <option value="jsonl">JSONL</option>
              </select>
            </label>
          </div>
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-600">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
              <span>{chunks.length} chunks</span>
              <span>avg {averageTokens} tokens</span>
            </div>
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
{chunkSummary || ""}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleProcess}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Snapshot Blueprint
          </button>
          <button
            type="button"
            onClick={handleExportIR}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Export IR Markdown
          </button>
          <button
            type="button"
            onClick={handleExportKCS}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Export KCS {value.kcsFormat.toUpperCase()}
          </button>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Upload to</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="blueprint-upload-target"
                value="ir"
                checked={uploadTarget === "ir"}
                onChange={() => setUploadTarget("ir")}
              />
              <span>IR</span>
            </label>
            <label className="ml-2 flex items-center gap-1">
              <input
                type="radio"
                name="blueprint-upload-target"
                value="kcs"
                checked={uploadTarget === "kcs"}
                onChange={() => setUploadTarget("kcs")}
              />
              <span>KCS</span>
            </label>
            <input
              type="file"
              accept=".txt,.md,.json,.jsonl"
              onChange={handleUpload}
              className="hidden"
              id="blueprint-upload"
            />
            <label
              htmlFor="blueprint-upload"
              className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Upload file
            </label>
          </div>
        </div>
        {value.lastUpdated && (
          <p className="text-right text-xs text-slate-400">
            Last snapshot {new Date(value.lastUpdated).toLocaleString()}
          </p>
        )}
      </div>
    </section>
  );
}
