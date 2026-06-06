import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { ExternalLink, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectCardProps {
  proj: Project;
  onClick: () => void;
  onMoveDuplicate: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  key?: React.Key;
}

export function ProjectCard({ proj, onClick, onMoveDuplicate, onEdit, onDelete }: ProjectCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = proj.images || [];

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  const hasImages = images.length > 0;

  return (
    <div
      id={`platform-project-card-${proj.id}`}
      onClick={onClick}
      className="group relative bg-white border border-neutral-200 hover:border-neutral-900 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer min-h-[160px] overflow-hidden"
    >
      {/* Background Slideshow if there are images */}
      {hasImages ? (
        <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl pointer-events-none select-none">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }} // Matching the platform card's 30% opacity exactly
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
            />
          </AnimatePresence>
          {/* Glassmorphic inner gradient overlay matching the platform card exactly */}
          <div className="absolute inset-0 z-1 bg-gradient-to-t from-white via-white/40 to-white/10 opacity-70 group-hover:opacity-60 transition-opacity duration-350 pointer-events-none" />
        </div>
      ) : (
        // Default aesthetic backdrop matching the design pattern if no image is uploaded
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-neutral-50 to-neutral-100/50 opacity-30 pointer-events-none select-none rounded-3xl" />
      )}

      {/* Content wrapper staying above background */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="h-9 w-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 font-extrabold text-xs border border-neutral-200 shrink-0 overflow-hidden">
            {hasImages ? (
              <img 
                src={images[0]} 
                alt="Thumbnail" 
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              `P${proj.title.substring(0, 1).toUpperCase()}`
            )}
          </div>

          {/* Project Action Panel (Edit/Del/Organize) */}
          <div className="flex items-center gap-1.5 bg-neutral-50/90 backdrop-blur-xs rounded-xl p-1 border border-neutral-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onMoveDuplicate}
              title="Pindahkan / Duplikat Project"
              className="rounded-lg p-1.5 text-neutral-800 hover:text-black hover:bg-white transition-all font-bold"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onEdit}
              title="Edit Project"
              className="rounded-lg p-1.5 text-neutral-800 hover:text-black hover:bg-white transition-all"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Hapus Project"
              className="rounded-lg p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 transition-all font-bold"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <h4 className="text-sm font-extrabold text-neutral-900 truncate group-hover:text-black pt-1">
          {proj.title}
        </h4>

        {proj.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 leading-none">
            {proj.tags.slice(0, 2).map((tg, i) => (
              <span key={i} className="text-[8px] bg-neutral-100/90 backdrop-blur-xs text-neutral-600 rounded-full px-2 py-0.5 font-bold uppercase border border-neutral-200/55">
                #{tg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats inside Project Card */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-150 mt-4 relative z-10">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
          Total Prompts
        </span>
        <span className="text-xs font-bold text-neutral-700 bg-neutral-100/95 backdrop-blur-xs rounded-full px-2 py-0.5 border border-neutral-200/50">
          {proj.prompts.length} Prompts
        </span>
      </div>

      <div className="absolute bottom-5 right-5 z-10 bg-neutral-900 text-white rounded-xl p-1.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}
