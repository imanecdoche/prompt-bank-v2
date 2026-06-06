/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Copy, Move, ArrowRight, Layers, FileCode, Check, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Platform, Project, Prompt } from '../types';

// Utility function to compress and resize images client-side to prevent Firestore 1MB document size limit issues
export function resizeAndCompressImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while preserving aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if context creation fails
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG format (usually MUCH smaller than PNG)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

// ==========================================
// 1. CONFIRMATION MODAL
// ==========================================
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-neutral-100 z-10"
          id="confirm-modal"
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-2 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-neutral-50 text-neutral-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-neutral-900" id="confirm-modal-title">{title}</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed" id="confirm-modal-message">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              id="confirm-modal-btn-cancel"
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              id="confirm-modal-btn-action"
              type="button"
              onClick={onConfirm}
              className={`rounded-xl px-5 py-2.5 text-xs font-medium text-white transition-all shadow-xs ${
                isDanger ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ==========================================
// 2. PLATFORM MODAL
// ==========================================
interface PlatformModalProps {
  isOpen: boolean;
  platform?: Platform | null; // If preset, editing mode
  onSave: (title: string, tags: string[], image?: string) => void;
  onClose: () => void;
}

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #f5f5f7 0%, #e5e5ea 100%)',
  'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
  'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
  'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
  'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
  'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
];

export function PlatformModal({ isOpen, platform, onSave, onClose }: PlatformModalProps) {
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (platform) {
        setTitle(platform.title);
        setTags([...platform.tags]);
        setImage(platform.image || '');
        setTagInput('');
      } else {
        setTitle('');
        setTags([]);
        setImage(PRESET_GRADIENTS[0]);
        setTagInput('');
      }
    }
  }, [isOpen, platform]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await resizeAndCompressImage(file, 600, 600, 0.7);
        setImage(compressed);
      } catch (err) {
        console.error("Failed to compress image", err);
      }
    }
  };

  const addTag = () => {
    const cleaned = tagInput.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const finalTags = [...tags];
    const cleanedInput = tagInput.trim().toLowerCase();
    if (cleanedInput && !finalTags.includes(cleanedInput)) {
      finalTags.push(cleanedInput);
    }
    onSave(title.trim(), finalTags, image);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl border border-neutral-100 z-10 flex flex-col max-h-[90vh]"
          id="platform-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 className="text-base font-semibold text-neutral-900" id="platform-modal-title">
              {platform ? 'Edit Platform' : 'Tambah Platform Baru'}
            </h3>
            <button
              id="platform-modal-close"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
            {/* Title */}
            <div>
              <label htmlFor="platform-title" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Nama Platform
              </label>
              <input
                id="platform-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: ChatGPT, Claude, Midjourney..."
                required
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition-all bg-white text-neutral-900"
              />
            </div>

            {/* Platform Visual representation */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Foto / Cover Platform
              </label>
              
              <div className="grid grid-cols-5 gap-3 items-center">
                {/* Current visual block */}
                <div 
                  className="col-span-2 h-16 rounded-xl border border-neutral-200 flex items-center justify-center relative overflow-hidden"
                  style={{ background: image && !image.startsWith('data:') ? image : 'transparent' }}
                >
                  {image && image.startsWith('data:') ? (
                    <img src={image} alt="Platform cover" className="h-full w-full object-cover" />
                  ) : !image ? (
                    <span className="text-xs text-neutral-400 font-medium">Baku</span>
                  ) : null}
                  <button
                    id="btn-trigger-upload"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-neutral-900/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1 font-medium"
                  >
                    <Upload className="h-3 w-3" /> Upload
                  </button>
                </div>
                
                {/* Upload Action */}
                <div className="col-span-3">
                  <input
                    ref={fileInputRef}
                    id="platform-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    id="platform-upload-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Ambil dari Storage
                  </button>
                </div>
              </div>

              {/* Preset cover items */}
              <div className="mt-3">
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2">Atau gunakan Preset Gradien:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GRADIENTS.map((gradient, idx) => (
                    <button
                      key={idx}
                      id={`preset-gradient-${idx}`}
                      type="button"
                      onClick={() => setImage(gradient)}
                      className="h-7 w-7 rounded-lg border border-neutral-200 transition-transform active:scale-95 cursor-pointer relative"
                      style={{ background: gradient }}
                    >
                      {image === gradient && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                          <Check className="h-3 w-3 text-neutral-700" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="platform-tags" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Tag Platform
              </label>
              <div className="flex gap-2">
                <input
                  id="platform-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Tambahkan tag (tekan Enter)"
                  className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900"
                />
                <button
                  id="platform-tag-add"
                  type="button"
                  onClick={addTag}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:border-neutral-300 transition-colors bg-white text-neutral-700"
                >
                  Tambah
                </button>
              </div>

              {/* Tag Chips */}
              {tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tg, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 border border-neutral-100"
                    >
                      #{tg}
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="rounded-full p-0.5 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2">
              <button
                id="platform-btn-cancel"
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                Batal
              </button>
              <button
                id="platform-btn-submit"
                type="submit"
                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-all px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
              >
                {platform ? 'Simpan Perubahan' : 'Buat Platform'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ==========================================
// 3. PROJECT MODAL
// ==========================================
interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null;
  onSave: (title: string, tags: string[], images: string[]) => void;
  onClose: () => void;
}

export function ProjectModal({ isOpen, project, onSave, onClose }: ProjectModalProps) {
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setTitle(project.title);
        setTags([...project.tags]);
        setImages(project.images ? [...project.images] : []);
        setTagInput('');
      } else {
        setTitle('');
        setTags([]);
        setImages([]);
        setTagInput('');
      }
    }
  }, [isOpen, project]);

  const addTag = () => {
    const cleaned = tagInput.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesArray = Array.from(files);
      try {
        const compressed = await Promise.all(
          filesArray.map((file) => resizeAndCompressImage(file as any, 600, 600, 0.75))
        );
        setImages((prev) => [...prev, ...compressed]);
      } catch (err) {
        console.error("Failed to compress project images", err);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const finalTags = [...tags];
    const cleanedInput = tagInput.trim().toLowerCase();
    if (cleanedInput && !finalTags.includes(cleanedInput)) {
      finalTags.push(cleanedInput);
    }
    onSave(title.trim(), finalTags, images);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-neutral-100 z-10 flex flex-col max-h-[90vh] overflow-hidden"
          id="project-modal"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 p-4 shrink-0">
            <h3 className="text-base font-semibold text-neutral-900" id="project-modal-title">
              {project ? 'Edit Judul & Foto Project' : 'Tambah Project Baru'}
            </h3>
            <button
              id="project-modal-close"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label htmlFor="project-title" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Nama / Judul Project
              </label>
              <input
                id="project-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Digital Copywriting, Refactoring Code..."
                required
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900"
              />
            </div>

            {/* Project Tags */}
            <div>
              <label htmlFor="project-tags" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Tag Project
              </label>
              <div className="flex gap-2">
                <input
                  id="project-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Contoh: seo, api (Enter)"
                  className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900"
                />
                <button
                  id="project-tag-add"
                  type="button"
                  onClick={addTag}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:border-neutral-300 transition-colors bg-white text-neutral-700"
                >
                  Tambah
                </button>
              </div>

              {tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tg, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 border border-neutral-100"
                    >
                      #{tg}
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="rounded-full p-0.5 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Multiple Project Images Uploder */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Foto Contoh Project (Bisa Lebih Dari Satu)
              </label>
              
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  id="project-image-files"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesUpload}
                  className="hidden"
                />
                <button
                  id="btn-upload-project-images"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-4 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-neutral-50 hover:border-neutral-400 transition-colors bg-white text-neutral-600 text-xs font-medium"
                >
                  <Upload className="h-4 w-4 text-neutral-400" />
                  <span>Klik untuk unggah foto contoh (JPG, PNG, GIF)</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Anda dapat memilih beberapa file sekaligus</span>
                </button>

                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg border border-neutral-100 overflow-hidden group">
                        <img src={img} alt={`Sample ${idx + 1}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700 transition-colors shadow-sm"
                            title="Hapus foto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2 shrink-0">
              <button
                id="project-btn-cancel"
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                Batal
              </button>
              <button
                id="project-btn-submit"
                type="submit"
                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-all px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
              >
                {project ? 'Simpan' : 'Buat Project'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ==========================================
// 4. PROMPT MODAL (ADD / EDIT)
// ==========================================
interface PromptModalProps {
  isOpen: boolean;
  prompt?: Prompt | null;
  onSave: (title: string, category: string, description: string, content: string, tags: string[]) => void;
  onClose: () => void;
}

const PRESET_CATEGORIES = [
  'POSE',
  'OUTFIT',
  'STYLE',
  'SUBJECT',
  'CAMERA',
  'ANGEL',
];

export function PromptModal({ isOpen, prompt, onSave, onClose }: PromptModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('POSE');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (prompt) {
        setTitle(prompt.title);
        setCategory(prompt.category || 'POSE');
        setDescription(prompt.description || '');
        setContent(prompt.content || '');
        setTags([...prompt.tags]);
        setTagInput('');
      } else {
        setTitle('');
        setCategory('POSE');
        setDescription('');
        setContent('');
        setTags([]);
        setTagInput('');
      }
    }
  }, [isOpen, prompt]);

  const addTag = () => {
    const cleaned = tagInput.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const finalTags = [...tags];
    const cleanedInput = tagInput.trim().toLowerCase();
    if (cleanedInput && !finalTags.includes(cleanedInput)) {
      finalTags.push(cleanedInput);
    }
    onSave(title.trim(), category, description.trim(), content.trim(), finalTags);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border border-neutral-100 z-10 flex flex-col max-h-[92vh]"
          id="prompt-modal"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 className="text-base font-semibold text-neutral-900" id="prompt-modal-title">
              {prompt ? 'Edit Prompt' : 'Tambah Prompt Baru'}
            </h3>
            <button
              id="prompt-modal-close"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
            {/* Title & Category layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="prompt-title" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Nama / Judul Prompt
                </label>
                <input
                  id="prompt-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Refactoring Python Core, Instagram Copywriting..."
                  required
                  className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900"
                />
              </div>

              <div>
                <label htmlFor="prompt-category" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Kategori Label
                </label>
                <select
                  id="prompt-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900 cursor-pointer"
                >
                  {PRESET_CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="prompt-description" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Deskripsi Mendalam
              </label>
              <textarea
                id="prompt-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan petunjuk penggunaan, parameter wajib, atau penjelasan detail prompt ini..."
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900 resize-y"
              />
            </div>

            {/* Main Prompt Content */}
            <div>
              <label htmlFor="prompt-content" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Isi / Teks Prompt Pendukung
              </label>
              <textarea
                id="prompt-content"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan prompt Anda di sini secara lengkap..."
                required
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-mono placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-neutral-50 text-neutral-900 resize-y"
              />
            </div>

            {/* Tags with Enter addition */}
            <div>
              <label htmlFor="prompt-tags" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Tag Prompt
              </label>
              <div className="flex gap-2">
                <input
                  id="prompt-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Contoh: seo, coding-assistant (Enter)"
                  className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white text-neutral-900"
                />
                <button
                  id="prompt-tag-add"
                  type="button"
                  onClick={addTag}
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold hover:bg-neutral-50 hover:border-neutral-300 transition-colors bg-white text-neutral-700"
                >
                  Tambah
                </button>
              </div>

              {tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tg, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 border border-neutral-100"
                    >
                      #{tg}
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="rounded-full p-0.5 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2">
              <button
                id="prompt-btn-cancel"
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                Batal
              </button>
              <button
                id="prompt-btn-submit"
                type="submit"
                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-all px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
              >
                {prompt ? 'Simpan' : 'Buat Prompt'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ==========================================
// 5. MOVE OR DUPLICATE MODAL (PROMPT & PROJECT)
// ==========================================
interface MoveDuplicateModalProps {
  isOpen: boolean;
  type: 'prompt' | 'project';
  targetItemName: string;
  platformsList: Platform[];
  currentPlatformId: string;
  currentProjectId?: string; // Optional for project move
  onClose: () => void;
  onExecute: (action: 'move' | 'duplicate', targetPlatformId: string, targetProjectId?: string) => void;
}

export function MoveDuplicateModal({
  isOpen,
  type,
  targetItemName,
  platformsList,
  currentPlatformId,
  currentProjectId,
  onClose,
  onExecute,
}: MoveDuplicateModalProps) {
  const [action, setAction] = useState<'move' | 'duplicate'>('move');
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Sync state initially
  useEffect(() => {
    if (isOpen) {
      setAction('move');
      setSelectedPlatformId(currentPlatformId);
      
      const defaultPlatform = platformsList.find(p => p.id === currentPlatformId);
      if (defaultPlatform && defaultPlatform.projects.length > 0) {
        // If type is prompt, try not to default to current project if possible, or just default to first
        const eligibleProjects = defaultPlatform.projects;
        const currentIdx = eligibleProjects.findIndex(pr => pr.id === currentProjectId);
        if (currentIdx !== -1 && eligibleProjects.length > 1) {
          // Select another project if available under same platform
          const otherIdx = currentIdx === 0 ? 1 : 0;
          setSelectedProjectId(eligibleProjects[otherIdx].id);
        } else if (eligibleProjects.length > 0) {
          setSelectedProjectId(eligibleProjects[0].id);
        } else {
          setSelectedProjectId('');
        }
      } else {
        setSelectedProjectId('');
      }
    }
  }, [isOpen, currentPlatformId, currentProjectId, platformsList]);

  // Adjust projects dropdown when selected Platform changes
  useEffect(() => {
    const plat = platformsList.find(p => p.id === selectedPlatformId);
    if (plat && plat.projects.length > 0) {
      // Pick first project, or if same platform look for difference if type matches
      setSelectedProjectId(plat.projects[0].id);
    } else {
      setSelectedProjectId('');
    }
  }, [selectedPlatformId, platformsList]);

  if (!isOpen) return null;

  const currentPlatform = platformsList.find(p => p.id === selectedPlatformId);
  const eligibleProjects = currentPlatform ? currentPlatform.projects : [];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'prompt' && !selectedProjectId) {
      return; // Need active project
    }
    onExecute(action, selectedPlatformId, type === 'prompt' ? selectedProjectId : undefined);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl border border-neutral-100 z-10 flex flex-col"
          id="move-duplicate-modal"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 className="text-base font-semibold text-neutral-900" id="move-duplicate-title">
              Organisasi & Duplikasi
            </h3>
            <button
              id="move-duplicate-close"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
            {/* Context Header */}
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wilder">
                {type === 'prompt' ? 'PROMPT YG DIPILIH:' : 'PROJECT YG DIPILIH:'}
              </span>
              <p className="text-xs font-semibold text-neutral-800 truncate mt-1">
                {targetItemName}
              </p>
            </div>

            {/* Action Selection */}
            <div>
              <span className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                Tindakan
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="action-btn-move"
                  type="button"
                  onClick={() => setAction('move')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold tracking-wide transition-all ${
                    action === 'move'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Move className="h-3.5 w-3.5" /> Pindahkan
                </button>
                <button
                  id="action-btn-duplicate"
                  type="button"
                  onClick={() => setAction('duplicate')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold tracking-wide transition-all ${
                    action === 'duplicate'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplikasikan
                </button>
              </div>
            </div>

            {/* Target Platform */}
            <div>
              <label htmlFor="target-platform" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Pilih Platform Tujuan
              </label>
              <select
                id="target-platform"
                value={selectedPlatformId}
                onChange={(e) => setSelectedPlatformId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white text-neutral-900 cursor-pointer"
              >
                {platformsList.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.id === currentPlatformId ? '(Sekarang)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Project (For prompts only) */}
            {type === 'prompt' && (
              <div>
                <label htmlFor="target-project" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Pilih Project Tujuan
                </label>
                {eligibleProjects.length > 0 ? (
                  <select
                    id="target-project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white text-neutral-900 cursor-pointer"
                  >
                    {eligibleProjects.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.title} {pr.id === currentProjectId ? '(Sekarang)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl bg-red-50 text-red-600 p-3 text-xs leading-5 border border-red-100 flex items-start gap-1.5">
                    <X className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Tidak ada Project di Platform ini. Silakan buat project terlebih dahulu di Platform terpilih.</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2">
              <button
                id="action-btn-cancel"
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                Batal
              </button>
              <button
                id="action-btn-execute"
                type="submit"
                disabled={type === 'prompt' && !selectedProjectId}
                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-all px-5 py-2.5 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5"
              >
                Eksekusi <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
