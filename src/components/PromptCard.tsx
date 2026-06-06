/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Edit2, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Tag, FolderSync, Check } from 'lucide-react';
import { Prompt } from '../types';

export function highlightText(text: string, query?: string): React.ReactNode {
  if (!query || !query.trim()) return text;
  
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-neutral-950 font-bold px-0.5 rounded-sm shadow-xs border border-yellow-300">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

interface PromptCardProps {
  prompt: Prompt;
  index: number;
  totalCount: number;
  onCopy: (content: string) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (promptId: string) => void;
  onMoveDuplicate: (prompt: Prompt) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  searchQuery?: string;
  key?: React.Key;
}

export function PromptCard({
  prompt,
  index,
  totalCount,
  onCopy,
  onEdit,
  onDelete,
  onMoveDuplicate,
  onReorder,
  searchQuery = '',
}: PromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateSnippet = (text: string, maxLen = 140) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      id={`prompt-card-${prompt.id}`}
    >
      {/* Upper header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          {/* Category Label badge */}
          <span className="inline-flex rounded-full bg-neutral-900 text-white text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
            {prompt.category || 'General'}
          </span>
          <span className="text-[10px] font-medium text-neutral-400">
            Prompt #{index + 1}
          </span>
        </div>

        {/* Quick action controls */}
        <div className="flex items-center gap-1 bg-neutral-50 px-1 py-1 rounded-xl border border-neutral-100">
          {/* Reordering indicators */}
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onReorder(index, 'up');
            }}
            title="Pindahkan Ke Atas"
            className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalCount - 1}
            onClick={(e) => {
              e.stopPropagation();
              onReorder(index, 'down');
            }}
            title="Pindahkan Ke Bawah"
            className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <div className="h-3 w-px bg-neutral-200 mx-0.5" />
          {/* Organization */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDuplicate(prompt);
            }}
            title="Pindahkan / Duplikasi ke Project Lain"
            className="rounded-lg p-1 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
          >
            <FolderSync className="h-3.5 w-3.5" />
          </button>
          {/* Edit */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt);
            }}
            title="Edit Prompt"
            className="rounded-lg p-1 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(prompt.id);
            }}
            title="Hapus Prompt"
            className="rounded-lg p-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-base font-bold text-neutral-900 leading-snug mb-1">
        {highlightText(prompt.title, searchQuery)}
      </h4>

      {/* Deep Description */}
      {prompt.description && (
        <p className="text-xs text-neutral-500 leading-relaxed mb-3.5">
          {highlightText(prompt.description, searchQuery)}
        </p>
      )}

      {/* Snippet / Expanded Content */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-neutral-100/50 transition-colors p-3.5 cursor-pointer text-xs mb-3 font-mono leading-relaxed text-neutral-800 whitespace-pre-wrap select-text relative group"
      >
        {isExpanded ? highlightText(prompt.content, searchQuery) : highlightText(truncateSnippet(prompt.content), searchQuery)}
        
        {prompt.content.length > 140 && (
          <span className="absolute bottom-2 right-3 bg-neutral-900/5 backdrop-blur-xs text-[10px] text-neutral-500 px-2 py-0.5 rounded-md font-sans">
            {isExpanded ? 'Tutup full' : 'Klik utk lihat-semua'}
          </span>
        )}
      </div>

      {/* Tags & Action Container */}
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-100 flex-wrap">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 items-center max-w-[70%]">
          {prompt.tags && prompt.tags.length > 0 ? (
            prompt.tags.map((tg, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-0.5 rounded-full bg-neutral-50 border border-neutral-150 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 uppercase"
              >
                <Tag className="h-2 w-2 text-neutral-400" />
                {tg}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-neutral-400 font-medium italic">Tidak ada tag</span>
          )}
        </div>

        {/* Copy trigger button */}
        <button
          id={`copy-prompt-btn-${prompt.id}`}
          onClick={handleCopyClick}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold tracking-wide transition-all ${
            copied 
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm col-span-1'
              : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50 shadow-xs'
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Tersalin!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Salin Prompt
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
