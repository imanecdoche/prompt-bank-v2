/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  Sparkles,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Platform } from '../types';

interface DashboardViewProps {
  platforms: Platform[];
  onSelectPlatform: (id: string) => void;
  onAddPlatform: () => void;
  onEditPlatform: (platform: Platform, e: React.MouseEvent) => void;
  onDeletePlatform: (id: string, e: React.MouseEvent) => void;
}

export function DashboardView({
  platforms,
  onSelectPlatform,
  onAddPlatform,
  onEditPlatform,
  onDeletePlatform
}: DashboardViewProps) {
  
  // Calculate total stats for the dashboard header
  const totalPlatforms = platforms.length;
  const totalProjects = platforms.reduce((acc, p) => acc + p.projects.length, 0);
  const totalPrompts = platforms.reduce((acc, p) => {
    return acc + p.projects.reduce((sum, proj) => sum + proj.prompts.length, 0);
  }, 0);

  // Animation variants for smooth stagger load
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Dashboard Headline Hero */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-all">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2.5 py-1 rounded-full">
            Beranda Utama
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug">
            Selamat Datang di Hub Prompt Anda
          </h2>
          <p className="text-xs text-neutral-500 max-w-xl leading-relaxed font-semibold">
            Kelola dan organisasikan berbagai platform kecerdasan buatan, proyek pengembangan pribadi, dan bank prompt rahasia Anda di satu tempat yang tersimpan lokal secara aman.
          </p>
        </div>

        {/* Dashboard Quick Statistics */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 shrink-0">
          <div className="bg-neutral-50 border border-neutral-150 rounded-2xl p-3 text-center min-w-[75px] md:min-w-[95px]">
            <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider mb-0.5">Platform</span>
            <strong className="text-base md:text-lg font-black text-neutral-900 font-mono">{totalPlatforms}</strong>
          </div>
          <div className="bg-neutral-50 border border-neutral-150 rounded-2xl p-3 text-center min-w-[75px] md:min-w-[95px]">
            <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider mb-0.5">Projects</span>
            <strong className="text-base md:text-lg font-black text-neutral-900 font-mono">{totalProjects}</strong>
          </div>
          <div className="bg-neutral-50 border border-neutral-150 rounded-2xl p-3 text-center min-w-[75px] md:min-w-[95px]">
            <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider mb-0.5">Prompts</span>
            <strong className="text-base md:text-lg font-black text-neutral-900 font-mono">{totalPrompts}</strong>
          </div>
        </div>
      </div>

      {/* Grid Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-neutral-700 animate-pulse" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Daftar Platform Tersimpan</h3>
        </div>
        <button
          id="dashboard-add-platform-btn"
          type="button"
          onClick={onAddPlatform}
          className="flex items-center justify-center rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold p-3 transition-all transform hover:scale-105 shadow-md border border-neutral-800 cursor-pointer active:scale-95"
          title="Tambah Platform"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Platforms Cards Grid */}
      {platforms.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          id="dashboard-platforms-grid"
        >
          {platforms.map((platform) => {
            // Count total prompts in this specific platform
            const platformPromptsCount = platform.projects.reduce((sum, proj) => {
              return sum + proj.prompts.length;
            }, 0);

            return (
              <motion.div
                key={platform.id}
                variants={cardVariants}
                id={`dashboard-platform-card-${platform.id}`}
                onClick={() => onSelectPlatform(platform.id)}
                className="group relative bg-white border border-neutral-200 hover:border-neutral-900 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer h-[190px]"
              >
                {/* 1. BACKGROUND PHOTO WITH 30% OPACITY (As requested: "background card foto yg diapload dg opacity 30%") */}
                {platform.image ? (
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
                    <img
                      src={platform.image}
                      alt=""
                      className="w-full h-full object-cover opacity-30 group-hover:scale-[1.03] transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  // Default aesthetic backdrop matching the design pattern if no image is uploaded
                  <div className="absolute inset-0 z-0 bg-linear-to-br from-neutral-50 to-neutral-100/50 opacity-30 pointer-events-none select-none" />
                )}

                {/* 2. Glassmorphic inner gradient overlay to ensure text contrast for readability */}
                <div className="absolute inset-0 z-1 bg-gradient-to-t from-white via-white/40 to-white/10 opacity-70 group-hover:opacity-60 transition-opacity pointer-events-none" />

                {/* 3. Card Contents (Placed on layer z-10 for pointer actions and full legibility) */}
                <div className="relative z-10 w-full height-full flex flex-col justify-between h-full">
                  
                  {/* Top Level Row: Icon/Name Badge & Control Actions */}
                  <div className="flex items-start justify-between">
                    {/* Tiny initial indicator or Platform logo */}
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 border border-white/20 flex items-center justify-center font-extrabold text-white text-xs shadow-sm shadow-black/10 shrink-0 overflow-hidden">
                      {platform.image && platform.image.startsWith('data:') ? (
                        <img 
                          src={platform.image} 
                          alt={platform.title} 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        platform.title.substring(0, 2).toUpperCase()
                      )}
                    </div>

                    {/* Operational Action Buttons (Edit & Delete) */}
                    <div className="flex items-center gap-1.5 bg-neutral-100 rounded-xl p-1 border border-neutral-300 shadow-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        id={`dashboard-edit-platform-${platform.id}`}
                        onClick={(e) => onEditPlatform(platform, e)}
                        className="rounded-lg p-1.5 text-neutral-800 hover:text-black hover:bg-white transition-all"
                        title="Edit Platform"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        id={`dashboard-del-platform-${platform.id}`}
                        onClick={(e) => onDeletePlatform(platform.id, e)}
                        className="rounded-lg p-1.5 text-red-650 hover:text-red-850 hover:bg-red-50 transition-all"
                        title="Hapus Platform"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Platform Identity & Stats Block */}
                  <div className="mt-4 space-y-2">
                    <h4 className="text-base font-extrabold text-neutral-900 group-hover:text-black transition-colors truncate">
                      {platform.title}
                    </h4>

                    {/* Tags array */}
                    {platform.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 leading-none">
                        {platform.tags.slice(0, 2).map((tg, i) => (
                          <span key={i} className="text-[9px] bg-neutral-900/5 text-neutral-600 rounded-full px-2 py-0.5 font-bold uppercase border border-neutral-150">
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats Metrics Display */}
                    <div className="flex items-center gap-3 pt-2 border-t border-neutral-150/50">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-600">
                        <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{platform.projects.length} Projects</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-600">
                        <BookOpen className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{platformPromptsCount} Prompts</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right chevron hover action indicator */}
                <div className="absolute bottom-5 right-5 z-10 bg-neutral-900 text-white rounded-xl p-1.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* Empty Dashboard State (Consistent helper screen) */
        <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center max-w-md mx-auto shadow-sm" id="dashboard-empty-state">
          <div className="h-14 w-14 rounded-2xl bg-neutral-50 border border-neutral-150 flex items-center justify-center text-neutral-400 mx-auto mb-4">
            <Layers className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-neutral-800 mb-1">Daftar Platform Masih Kosong</h4>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto mb-5">
            Mulai simpan prompt Anda dengan menambahkan platform pertama Anda (seperti ChatGPT, Claude, Midjourney) sekarang juga.
          </p>
          <button
            type="button"
            onClick={onAddPlatform}
            className="inline-flex items-center justify-center rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold p-4 transition-all hover:scale-110 cursor-pointer shadow-lg border border-neutral-800"
            title="Tambah Platform Pertama"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
