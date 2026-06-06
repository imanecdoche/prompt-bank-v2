/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Prompt {
  id: string;
  title: string;
  category: string; // Kategori label (e.g., POSE, OUTFIT, STYLE, etc.)
  description: string; // Deskripsi mendalam
  content: string; // Isi prompt utama
  tags: string[];
}

export interface Project {
  id: string;
  title: string;
  tags: string[];
  prompts: Prompt[];
  images?: string[]; // Base64 data URIs or image URLs uploaded by user
}

export interface Platform {
  id: string;
  title: string;
  tags: string[];
  image?: string; // Base64 data URI uploaded by user
  projects: Project[];
}

export type ActiveTab = 'platforms' | 'projects' | 'prompts';
