/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  ArrowLeft,
  Tag,
  Copy,
  Check,
  FolderOpen,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  X,
  FileCode,
  BookOpen,
  ArrowUpDown,
  ClipboardCheck,
  Undo,
  Edit2,
  Trash2,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut
} from 'lucide-react';
import { Platform, Project, Prompt } from './types';
import {
  ConfirmModal,
  PlatformModal,
  ProjectModal,
  PromptModal,
  MoveDuplicateModal
} from './components/Dialogs';
import { AuthModal, ProfileModal } from './components/AuthAndProfileModals';
import { ToastContainer, ToastType } from './components/Toast';
import { PromptCard, highlightText } from './components/PromptCard';
import { DashboardView } from './components/DashboardView';
import { ProjectCard } from './components/ProjectCard';

import {
  db,
  auth,
  googleProvider,
  OperationType,
  handleFirestoreError
} from './lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  writeBatch
} from 'firebase/firestore';

// Utility for generating short random unique IDs
const generateId = () => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export default function App() {
  // --- Core State ---
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [activePlatformId, setActivePlatformId] = useState<string>('');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  
  // --- Firebase & Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ uid: string; email: string; displayName: string; username: string; photoURL: string; provider: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // --- View Control ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'platform' | 'prompts'>('dashboard');

  
  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // --- UI Toast Notifications ---
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

  // --- Confirmation Modal State ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // --- Form Modal States ---
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // --- Move & Duplicate State ---
  const [isMoveDuplicateOpen, setIsMoveDuplicateOpen] = useState(false);
  const [moveDuplicateDetails, setMoveDuplicateDetails] = useState<{
    type: 'prompt' | 'project';
    item: any;
    currentPlatformId: string;
    currentProjectId?: string;
  } | null>(null);

  // --- Database Sync Helpers ---
  const ensureCompressedImage = (urlOrBase64: string): Promise<string> => {
    if (!urlOrBase64 || !urlOrBase64.startsWith('data:image/') || urlOrBase64.length < 100000) {
      return Promise.resolve(urlOrBase64);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 500;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(urlOrBase64);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => {
        resolve(urlOrBase64);
      };
      img.src = urlOrBase64;
    });
  };

  const dbUpdatePlatform = async (p: Platform) => {
    if (!auth.currentUser) return;
    try {
      const platformRef = doc(db, 'platforms', p.id);
      
      const compressedImage = await ensureCompressedImage(p.image || '');
      const compressedProjects = await Promise.all(
        (p.projects || []).map(async (proj) => {
          const compressedProjImages = await Promise.all(
            (proj.images || []).map((img) => ensureCompressedImage(img))
          );
          return {
            id: proj.id,
            title: proj.title,
            tags: proj.tags || [],
            images: compressedProjImages,
            prompts: proj.prompts.map(prm => ({
              id: prm.id,
              title: prm.title,
              category: prm.category,
              description: prm.description,
              content: prm.content,
              tags: prm.tags || []
            }))
          };
        })
      );

      const cleanedPlatform = {
        id: p.id,
        title: p.title,
        tags: p.tags || [],
        image: compressedImage,
        projects: compressedProjects,
        ownerId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      const docSnap = await getDoc(platformRef);
      if (!docSnap.exists()) {
        await setDoc(platformRef, {
          ...cleanedPlatform,
          createdAt: new Date().toISOString()
        });
      } else {
        const existingData = docSnap.data();
        await setDoc(platformRef, {
          ...cleanedPlatform,
          createdAt: existingData.createdAt || new Date().toISOString()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `platforms/${p.id}`);
    }
  };

  const dbDeletePlatform = async (platformId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'platforms', platformId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `platforms/${platformId}`);
    }
  };

  // --- Auth & Firestore Subscription Loop ---
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const emailKey = currentUser.email?.toLowerCase();
        if (emailKey) {
          const userDocRef = doc(db, 'users', emailKey);
          try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const sessionProviderId = currentUser.providerData[0]?.providerId;
              const isSessionGoogle = sessionProviderId === 'google.com';
              const isSessionEmail = sessionProviderId === 'password';

              if (data.provider === 'google' && isSessionEmail) {
                await signOut(auth);
                triggerToast('Email ini terdaftar via Google. Silakan masuk menggunakan Google.', 'error');
                setUser(null);
                setUserProfile(null);
                setAuthLoading(false);
                return;
              } else if (data.provider === 'password' && isSessionGoogle) {
                await signOut(auth);
                triggerToast('Email ini terdaftar via Email/Password. Silakan masuk menggunakan form masuk email.', 'error');
                setUser(null);
                setUserProfile(null);
                setAuthLoading(false);
                return;
              }

              setUserProfile(data as any);
            } else {
              const sessionProviderId = currentUser.providerData[0]?.providerId;
              const isSessionGoogle = sessionProviderId === 'google.com';
              
              const newProfile = {
                uid: currentUser.uid,
                email: emailKey,
                displayName: currentUser.displayName || emailKey.split('@')[0],
                username: '',
                photoURL: currentUser.photoURL || '',
                provider: isSessionGoogle ? 'google' : 'password',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            }
          } catch (profileErr) {
            console.warn('Error fetching user profile doc:', profileErr);
            triggerToast('Gagal memuat profil sinkronisasi cloud. Menggunakan profil lokal.', 'info');
          }
        }

        setUser(currentUser);
        setAuthLoading(false);

        const q = query(
          collection(db, 'platforms'),
          where('ownerId', '==', currentUser.uid)
        );

        unsubscribeFirestore = onSnapshot(q, async (snapshot) => {
          const loaded: Platform[] = [];
          snapshot.forEach((doc) => {
            loaded.push(doc.data() as Platform);
          });

          // Sort by creation date
          loaded.sort((a: any, b: any) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          });

          // Check if local has data but cloud is empty -> Automigrate users to the cloud
          const localSaved = localStorage.getItem('prompt_bank_data');
          if (snapshot.empty && localSaved) {
            try {
              const parsed: Platform[] = JSON.parse(localSaved);
              if (parsed.length > 0) {
                setIsSyncing(true);
                const batch = writeBatch(db);
                parsed.forEach((plat) => {
                  const platformRef = doc(db, 'platforms', plat.id);
                  const cleanedVal = {
                    id: plat.id,
                    title: plat.title,
                    tags: plat.tags || [],
                    image: plat.image || '',
                    projects: plat.projects.map(proj => ({
                      id: proj.id,
                      title: proj.title,
                      tags: proj.tags || [],
                      images: proj.images || [],
                      prompts: proj.prompts.map(prm => ({
                        id: prm.id,
                        title: prm.title,
                        category: prm.category,
                        description: prm.description,
                        content: prm.content,
                        tags: prm.tags || []
                      }))
                    })),
                    ownerId: currentUser.uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  batch.set(platformRef, cleanedVal);
                });
                await batch.commit();
                triggerToast('Data lokal berhasil disinkronisasi ke Google Account Anda!', 'success');
              }
            } catch (migErr) {
              console.error('Auto migration failed:', migErr);
            } finally {
              setIsSyncing(false);
            }
            return;
          }

          setPlatforms(loaded);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'platforms');
        });

      } else {
        setUserProfile(null);
        setAuthLoading(false);
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }

        // Guest local storage fallback
        const saved = localStorage.getItem('prompt_bank_data');
        if (saved) {
          try {
            setPlatforms(JSON.parse(saved));
          } catch (e) {
            setPlatforms([]);
          }
        } else {
          setPlatforms([]);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // --- Auto-select active indices on data update ---
  useEffect(() => {
    if (platforms.length > 0) {
      if (!activePlatformId || !platforms.some((p) => p.id === activePlatformId)) {
        setActivePlatformId(platforms[0].id);
        if (platforms[0].projects.length > 0) {
          setActiveProjectId(platforms[0].projects[0].id);
        } else {
          setActiveProjectId('');
        }
      } else {
        const currentPlat = platforms.find((p) => p.id === activePlatformId);
        if (currentPlat) {
          if (!activeProjectId || !currentPlat.projects.some((pr) => pr.id === activeProjectId)) {
            if (currentPlat.projects.length > 0) {
              setActiveProjectId(currentPlat.projects[0].id);
            } else {
              setActiveProjectId('');
            }
          }
        }
      }
    } else {
      setActivePlatformId('');
      setActiveProjectId('');
    }
  }, [platforms, activePlatformId, activeProjectId]);

  // Master local state saving combined with incremental Firestore writes
  const saveState = async (updated: Platform[]) => {
    // Sync immediate UI and localStorage
    setPlatforms(updated);
    localStorage.setItem('prompt_bank_data', JSON.stringify(updated));

    if (auth.currentUser) {
      try {
        setIsSyncing(true);
        // Sync additions & modifications
        for (const p of updated) {
          const oldP = platforms.find(op => op.id === p.id);
          if (!oldP || JSON.stringify(oldP) !== JSON.stringify(p)) {
            await dbUpdatePlatform(p);
          }
        }
        // Sync deletions
        for (const op of platforms) {
          if (!updated.some(p => p.id === op.id)) {
            await dbDeletePlatform(op.id);
          }
        }
      } catch (err) {
        console.error('Error syncing changes to Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };


  // --- Google Authentication Handlers ---
  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      triggerToast('Berhasil masuk dengan Google!', 'success');
    } catch (e) {
      console.error('Google Sign In Error:', e);
      triggerToast('Gagal masuk dengan Google Account', 'error');
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await signOut(auth);
      triggerToast('Berhasil keluar akun', 'info');
    } catch (e) {
      console.error('Sign Out Error:', e);
    }
  };

  // --- Email & Custom Profile Authentication Handlers ---
  const handleRegisterEmail = async (email: string, password: string, displayName: string, username: string) => {
    try {
      const emailKey = email.trim().toLowerCase();
      if (!emailKey || !password || !displayName || !username) {
        triggerToast('Semua kolom wajib diisi.', 'error');
        return;
      }
      
      // Step 1: Create Auth user first
      const credential = await createUserWithEmailAndPassword(auth, emailKey, password);
      
      // Update display name in Firebase Auth
      await updateProfile(credential.user, { displayName: displayName.trim() });
      
      // Step 2: Create Firestore profile document (now authenticated, will succeed)
      const newProfile = {
        uid: credential.user.uid,
        email: emailKey,
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        photoURL: '',
        provider: 'password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const userDocRef = doc(db, 'users', emailKey);
      await setDoc(userDocRef, newProfile);
      
      setUser(credential.user);
      setUserProfile(newProfile);
      triggerToast('Pendaftaran berhasil! Akun Anda telah terhubung.', 'success');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.warn('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        triggerToast('Email sudah digunakan oleh akun lain.', 'error');
      } else if (err.code === 'auth/weak-password') {
        triggerToast('Password terlalu lemah (min. 6 karakter).', 'error');
      } else {
        triggerToast(err.message || 'Gagal mendaftarkan akun.', 'error');
      }
    }
  };

  const handleLoginEmail = async (email: string, password: string) => {
    try {
      const emailKey = email.trim().toLowerCase();
      if (!emailKey || !password) {
        triggerToast('Email dan password wajib diisi.', 'error');
        return;
      }
      
      // Step 1: Sign in first
      const credential = await signInWithEmailAndPassword(auth, emailKey, password);
      
      // Step 2: Check profile after successful authentication
      const userDocRef = doc(db, 'users', emailKey);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.provider === 'google') {
            await signOut(auth);
            triggerToast('Email ini terdaftar via Google. Silakan masuk menggunakan Google.', 'error');
            return;
          }
        }
      } catch (profileErr) {
        console.warn('Profile sync check skipped during login:', profileErr);
      }

      setUser(credential.user);
      triggerToast('Berhasil masuk!', 'success');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.warn('Login error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        triggerToast('Email atau password salah.', 'error');
      } else {
        triggerToast(err.message || 'Gagal masuk akun.', 'error');
      }
    }
  };

  const handleUpdateProfile = async (displayName: string, photoURL: string, username: string) => {
    if (!auth.currentUser || !userProfile) {
      triggerToast('Anda harus masuk untuk memperbarui profil.', 'error');
      return;
    }
    try {
      const emailKey = auth.currentUser.email?.toLowerCase();
      if (!emailKey) return;

      const userDocRef = doc(db, 'users', emailKey);
      const cleanedUsername = username.trim().toLowerCase();

      // Check if username has spaces or invalid symbols
      if (cleanedUsername && !/^[a-zA-Z0-9_]{3,20}$/.test(cleanedUsername)) {
        triggerToast('Username harus 3-20 karakter, huruf/angka/ underscore saja.', 'error');
        return;
      }

      // Prevent Firebase Auth throwing "Photo URL too long (auth/invalid-profile-attribute)"
      // we check if the photoURL is a Data URI. If so, we only update it in Firestore
      // and pass an empty or truncated URL to Firebase Auth.
      const isDataURI = photoURL.startsWith('data:');
      const authPhotoURL = isDataURI ? '' : photoURL.trim();

      // Update Firebase Auth user
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: authPhotoURL
      });

      // Update Firestore document profile
      const updatedProfile = {
        ...userProfile,
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        username: cleanedUsername,
        updatedAt: new Date().toISOString()
      };

      await setDoc(userDocRef, updatedProfile);
      setUserProfile(updatedProfile);
      
      // Force update of state
      setUser({ ...auth.currentUser } as any);

      triggerToast('Profil berhasil diperbaharui!', 'success');
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      triggerToast('Gagal merubah data profil.', 'error');
    }
  };

  // --- Toast Trigger helper ---
  const triggerToast = (message: string, type: ToastType = 'success') => {
    const newToast = { id: generateId(), message, type };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Clipboard Helper ---
  const copyToClipboard = (text: string, message = 'Prompt berhasil disalin ke clipboard!') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        triggerToast(message, 'success');
      })
      .catch((err) => {
        triggerToast('Gagal menyalin teks', 'error');
      });
  };

  // --- Hierarchy Selectors ---
  const activePlatform = useMemo(() => {
    return platforms.find((p) => p.id === activePlatformId) || null;
  }, [platforms, activePlatformId]);

  const activeProject = useMemo(() => {
    if (!activePlatform) return null;
    return activePlatform.projects.find((pr) => pr.id === activeProjectId) || null;
  }, [activePlatform, activeProjectId]);

  // Handle active platform change (auto-select first project)
  const handleSelectPlatform = (id: string) => {
    setActivePlatformId(id);
    const plat = platforms.find((p) => p.id === id);
    if (plat && plat.projects.length > 0) {
      setActiveProjectId(plat.projects[0].id);
    } else {
      setActiveProjectId('');
    }
    // Clear search query to restore clean workspace view
    setSearchQuery('');
  };

  // Handle platform selection from Dashboard
  const handleSelectPlatformFromDashboard = (id: string) => {
    setActivePlatformId(id);
    const plat = platforms.find((p) => p.id === id);
    if (plat && plat.projects.length > 0) {
      setActiveProjectId(plat.projects[0].id);
    } else {
      setActiveProjectId('');
    }
    setCurrentView('platform');
    setSearchQuery('');
  };

  // Handle active project select
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setSearchQuery('');
  };

  // --- CRUD PLATFORM ---
  const handleOpenAddPlatform = () => {
    setEditingPlatform(null);
    setIsPlatformOpen(true);
  };

  const handleOpenEditPlatform = (platform: Platform, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlatform(platform);
    setIsPlatformOpen(true);
  };

  const handleSavePlatform = (title: string, tags: string[], image?: string) => {
    let updated: Platform[];
    if (editingPlatform) {
      updated = platforms.map((p) =>
        p.id === editingPlatform.id ? { ...p, title, tags, image: image || p.image } : p
      );
      triggerToast(`Platform "${title}" diperbarui`);
    } else {
      const newPlatformId = generateId();
      const newPlatform: Platform = {
        id: newPlatformId,
        title,
        tags,
        image,
        projects: []
      };
      updated = [...platforms, newPlatform];
      setActivePlatformId(newPlatformId);
      setActiveProjectId('');
      setCurrentView('platform');
      triggerToast(`Platform "${title}" berhasil dibuat`);
    }
    saveState(updated);
    setIsPlatformOpen(false);
    setEditingPlatform(null);
  };

  const handleDeletePlatform = (platformId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const platName = platforms.find((p) => p.id === platformId)?.title || 'Platform';
    
    setConfirmState({
      isOpen: true,
      title: 'Hapus Platform?',
      message: `Tindakan ini akan menghapus platform "${platName}" dan semua project beserta prompt didalamnya secara permanen.`,
      confirmText: 'Hapus Permanen',
      isDanger: true,
      onConfirm: () => {
        const updated = platforms.filter((p) => p.id !== platformId);
        saveState(updated);
        
        // Adjust active index
        if (activePlatformId === platformId) {
          if (updated.length > 0) {
            setActivePlatformId(updated[0].id);
            setActiveProjectId(updated[0].projects.length > 0 ? updated[0].projects[0].id : '');
          } else {
            setActivePlatformId('');
            setActiveProjectId('');
          }
        }
        triggerToast(`Platform "${platName}" telah dihapus`, 'info');
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- CRUD PROJECT ---
  const handleOpenAddProject = () => {
    if (!activePlatformId) {
      triggerToast('Buat platform terlebih dahulu!', 'error');
      return;
    }
    setEditingProject(null);
    setIsProjectOpen(true);
  };

  const handleOpenEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsProjectOpen(true);
  };

  const handleSaveProject = (title: string, tags: string[], images: string[]) => {
    if (!activePlatformId) return;

    const updated = platforms.map((p) => {
      if (p.id === activePlatformId) {
        let updatedProjects: Project[];
        if (editingProject) {
          updatedProjects = p.projects.map((pr) =>
            pr.id === editingProject.id ? { ...pr, title, tags, images } : pr
          );
          triggerToast(`Project "${title}" diperbarui`);
        } else {
          const newProjectId = generateId();
          const newProject: Project = {
            id: newProjectId,
            title,
            tags,
            prompts: [],
            images
          };
          updatedProjects = [...p.projects, newProject];
          setActiveProjectId(newProjectId);
          triggerToast(`Project "${title}" ditambahkan`);
        }
        return { ...p, projects: updatedProjects };
      }
      return p;
    });

    saveState(updated);
    setIsProjectOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePlatform) return;
    const projName = activePlatform.projects.find((pr) => pr.id === projectId)?.title || 'Project';

    setConfirmState({
      isOpen: true,
      title: 'Hapus Project?',
      message: `Tindakan ini akan menghapus project "${projName}" beserta seluruh daftar prompt didalamnya secara permanen.`,
      confirmText: 'Hapus Permanen',
      isDanger: true,
      onConfirm: () => {
        const updated = platforms.map((p) => {
          if (p.id === activePlatformId) {
            return {
              ...p,
              projects: p.projects.filter((pr) => pr.id !== projectId)
            };
          }
          return p;
        });

        saveState(updated);

        // Adjust selected
        if (activeProjectId === projectId) {
          const currentPlatformUpdated = updated.find((p) => p.id === activePlatformId);
          if (currentPlatformUpdated && currentPlatformUpdated.projects.length > 0) {
            setActiveProjectId(currentPlatformUpdated.projects[0].id);
          } else {
            setActiveProjectId('');
          }
        }
        triggerToast(`Project "${projName}" telah dihapus`, 'info');
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- CRUD PROMPTS ---
  const handleOpenAddPrompt = () => {
    if (!activeProjectId) {
      triggerToast('Buat project terlebih dahulu!', 'error');
      return;
    }
    setEditingPrompt(null);
    setIsPromptOpen(true);
  };

  const handleOpenEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsPromptOpen(true);
  };

  const handleSavePrompt = (
    title: string,
    category: string,
    description: string,
    content: string,
    tags: string[]
  ) => {
    if (!activePlatformId || !activeProjectId) return;

    const updated = platforms.map((p) => {
      if (p.id === activePlatformId) {
        return {
          ...p,
          projects: p.projects.map((pr) => {
            if (pr.id === activeProjectId) {
              let updatedPrompts: Prompt[];
              if (editingPrompt) {
                updatedPrompts = pr.prompts.map((prm) =>
                  prm.id === editingPrompt.id
                    ? { ...prm, title, category, description, content, tags }
                    : prm
                );
                triggerToast(`Prompt "${title}" diperbarui`);
              } else {
                const newPrompt: Prompt = {
                  id: generateId(),
                  title,
                  category,
                  description,
                  content,
                  tags
                };
                updatedPrompts = [...pr.prompts, newPrompt];
                triggerToast(`Prompt "${title}" telah disimpan`);
              }
              return { ...pr, prompts: updatedPrompts };
            }
            return pr;
          })
        };
      }
      return p;
    });

    saveState(updated);
    setIsPromptOpen(false);
    setEditingPrompt(null);
  };

  const handleDeletePrompt = (promptId: string) => {
    if (!activeProject) return;
    const promptName = activeProject.prompts.find((p) => p.id === promptId)?.title || 'Prompt';

    setConfirmState({
      isOpen: true,
      title: 'Hapus Prompt?',
      message: `Tindakan ini akan menghapus prompt "${promptName}" secara permanen dari daftar project Anda.`,
      confirmText: 'Hapus',
      isDanger: true,
      onConfirm: () => {
        const updated = platforms.map((p) => {
          if (p.id === activePlatformId) {
            return {
              ...p,
              projects: p.projects.map((pr) => {
                if (pr.id === activeProjectId) {
                  return {
                    ...pr,
                    prompts: pr.prompts.filter((prm) => prm.id !== promptId)
                  };
                }
                return pr;
              })
            };
          }
          return p;
        });

        saveState(updated);
        triggerToast(`Prompt "${promptName}" dihapus`, 'info');
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- REORDER PROMPTS ---
  const handleReorderPrompt = (index: number, direction: 'up' | 'down') => {
    if (!activePlatformId || !activeProjectId) return;

    const updated = platforms.map((p) => {
      if (p.id === activePlatformId) {
        return {
          ...p,
          projects: p.projects.map((pr) => {
            if (pr.id === activeProjectId) {
              const prmCopy = [...pr.prompts];
              const targetIdx = direction === 'up' ? index - 1 : index + 1;
              if (targetIdx >= 0 && targetIdx < prmCopy.length) {
                // swap items
                const temp = prmCopy[index];
                prmCopy[index] = prmCopy[targetIdx];
                prmCopy[targetIdx] = temp;
              }
              return { ...pr, prompts: prmCopy };
            }
            return pr;
          })
        };
      }
      return p;
    });

    saveState(updated);
    triggerToast('Urutan prompt disesuaikan', 'info');
  };

  // --- COPY ALL PROMPTS IN PROJECT ---
  const handleCopyAllPrompts = () => {
    if (!activeProject || activeProject.prompts.length === 0) {
      triggerToast('Tidak ada prompt untuk disalin', 'error');
      return;
    }

    const compiledText = activeProject.prompts
      .map((p) => p.content)
      .join('\n\n');

    copyToClipboard(
      compiledText,
      `Berhasil menyalin semua (${activeProject.prompts.length}) prompt dari project "${activeProject.title}"`
    );
  };

  // --- MOVE & DUPLICATE TRIGGER ---
  const handleOpenMoveDuplicatePrompt = (prompt: Prompt) => {
    setMoveDuplicateDetails({
      type: 'prompt',
      item: prompt,
      currentPlatformId: activePlatformId,
      currentProjectId: activeProjectId
    });
    setIsMoveDuplicateOpen(true);
  };

  const handleOpenMoveDuplicateProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setMoveDuplicateDetails({
      type: 'project',
      item: project,
      currentPlatformId: activePlatformId
    });
    setIsMoveDuplicateOpen(true);
  };

  const handleExecuteMoveDuplicate = (
    action: 'move' | 'duplicate',
    targetPlatformId: string,
    targetProjectId?: string
  ) => {
    if (!moveDuplicateDetails) return;
    const { type, item, currentPlatformId, currentProjectId } = moveDuplicateDetails;

    let updated = [...platforms];

    if (type === 'prompt') {
      const promptObj = item as Prompt;
      
      // Determine source item details
      if (action === 'move') {
        // Remove from current project
        updated = updated.map((p) => {
          if (p.id === currentPlatformId) {
            return {
              ...p,
              projects: p.projects.map((pr) => {
                if (pr.id === currentProjectId) {
                  return {
                    ...pr,
                    prompts: pr.prompts.filter((prm) => prm.id !== promptObj.id)
                  };
                }
                return pr;
              })
            };
          }
          return p;
        });

        // Insert into target project
        updated = updated.map((p) => {
          if (p.id === targetPlatformId) {
            return {
              ...p,
              projects: p.projects.map((pr) => {
                if (pr.id === targetProjectId) {
                  return {
                    ...pr,
                    prompts: [...pr.prompts, promptObj]
                  };
                }
                return pr;
              })
            };
          }
          return p;
        });

        // Sync view selection to destination
        setActivePlatformId(targetPlatformId);
        setActiveProjectId(targetProjectId || '');
        triggerToast(`Prompt "${promptObj.title}" dipindahkan ke project tujuan`);
      } else {
        // Duplicate
        const duplicatedPrompt: Prompt = {
          ...promptObj,
          id: generateId(),
          title: `${promptObj.title} (Salinan)`
        };

        updated = updated.map((p) => {
          if (p.id === targetPlatformId) {
            return {
              ...p,
              projects: p.projects.map((pr) => {
                if (pr.id === targetProjectId) {
                  return {
                    ...pr,
                    prompts: [...pr.prompts, duplicatedPrompt]
                  };
                }
                return pr;
              })
            };
          }
          return p;
        });

        setActivePlatformId(targetPlatformId);
        setActiveProjectId(targetProjectId || '');
        triggerToast(`Prompt "${promptObj.title}" diduplikasikan ke project tujuan`);
      }
    } else {
      // Type is Project
      const projectObj = item as Project;

      if (action === 'move') {
        // Remove from source platform
        updated = updated.map((p) => {
          if (p.id === currentPlatformId) {
            return {
              ...p,
              projects: p.projects.filter((pr) => pr.id !== projectObj.id)
            };
          }
          return p;
        });

        // Insert into target platform
        updated = updated.map((p) => {
          if (p.id === targetPlatformId) {
            return {
              ...p,
              projects: [...p.projects, projectObj]
            };
          }
          return p;
        });

        setActivePlatformId(targetPlatformId);
        setActiveProjectId(projectObj.id);
        triggerToast(`Project "${projectObj.title}" dipindahkan ke platform baru`);
      } else {
        // Duplicate Project (clone prompts within to secure new IDs)
        const duplicatedPrompts = projectObj.prompts.map((prm) => ({
          ...prm,
          id: generateId()
        }));

        const duplicatedProjectId = generateId();
        const duplicatedProject: Project = {
          id: duplicatedProjectId,
          title: `${projectObj.title} (Salinan)`,
          tags: [...projectObj.tags],
          prompts: duplicatedPrompts
        };

        updated = updated.map((p) => {
          if (p.id === targetPlatformId) {
            return {
              ...p,
              projects: [...p.projects, duplicatedProject]
            };
          }
          return p;
        });

        setActivePlatformId(targetPlatformId);
        setActiveProjectId(duplicatedProjectId);
        triggerToast(`Project "${projectObj.title}" diduplikasikan ke platform baru`);
      }
    }

    saveState(updated);
    setIsMoveDuplicateOpen(false);
    setMoveDuplicateDetails(null);
  };

  // --- ALL UNIQUE ACTIVE TAGS ---
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    platforms.forEach((p) => {
      p.tags.forEach((t) => tagsSet.add(t));
      p.projects.forEach((pr) => {
        pr.tags.forEach((t) => tagsSet.add(t));
        pr.prompts.forEach((prm) => {
          prm.tags.forEach((t) => tagsSet.add(t));
        });
      });
    });
    return Array.from(tagsSet);
  }, [platforms]);

  // --- SEAGULL CROSS-CORRELATING SEARCH LOGIC ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    const matches: {
      type: 'platform' | 'project' | 'prompt';
      id: string;
      title: string;
      subtitle: string;
      tags: string[];
      platformId: string;
      projectId?: string;
      promptId?: string;
      contentSnippet?: string;
    }[] = [];

    platforms.forEach((p) => {
      // 1. Check Platform
      const matchPlatform = p.title.toLowerCase().includes(query) || p.tags.some((t) => t.toLowerCase().includes(query));
      if (matchPlatform) {
        matches.push({
          type: 'platform',
          id: p.id,
          title: p.title,
          subtitle: `Platform • ${p.projects.length} Projects`,
          tags: p.tags,
          platformId: p.id
        });
      }

      p.projects.forEach((pr) => {
        // 2. Check Project
        const matchProject = pr.title.toLowerCase().includes(query) || pr.tags.some((t) => t.toLowerCase().includes(query));
        if (matchProject) {
          matches.push({
            type: 'project',
            id: pr.id,
            title: pr.title,
            subtitle: `Project di Platform "${p.title}"`,
            tags: pr.tags,
            platformId: p.id,
            projectId: pr.id
          });
        }

        pr.prompts.forEach((prm) => {
          // 3. Check Prompt
          const matchPrompt =
            prm.title.toLowerCase().includes(query) ||
            prm.category.toLowerCase().includes(query) ||
            prm.description.toLowerCase().includes(query) ||
            prm.content.toLowerCase().includes(query) ||
            prm.tags.some((t) => t.toLowerCase().includes(query));

          if (matchPrompt) {
            matches.push({
              type: 'prompt',
              id: prm.id,
              title: prm.title,
              subtitle: `Prompt [${prm.category || 'General'}] • ${p.title} > ${pr.title}`,
              tags: prm.tags,
              platformId: p.id,
              projectId: pr.id,
              promptId: prm.id,
              contentSnippet: prm.content.length > 100 ? prm.content.substring(0, 100) + '...' : prm.content
            });
          }
        });
      });
    });

    return matches;
  }, [platforms, searchQuery]);

  // Handle click on matched search result
  const handleSelectSearchMatch = (match: any) => {
    setActivePlatformId(match.platformId);
    if (match.projectId) {
      setActiveProjectId(match.projectId);
      setCurrentView('prompts');
    } else {
      const plat = platforms.find((p) => p.id === match.platformId);
      if (plat && plat.projects.length > 0) {
        setActiveProjectId(plat.projects[0].id);
      } else {
        setActiveProjectId('');
      }
      setCurrentView('platform');
    }
    
    // Clear search
    setSearchQuery('');
    triggerToast(`Fokus ke: ${match.title}`, 'info');

    // Scroll to prompt card if applicable
    if (match.promptId) {
      setTimeout(() => {
        const el = document.getElementById(`prompt-card-${match.promptId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-neutral-900', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-neutral-900', 'ring-offset-2'), 2500);
        }
      }, 300);
    }
  };

  // --- FILTER PROMPTS BY TAG & SEARCH inside active project ---
  const displayedPrompts = useMemo(() => {
    if (!activeProject) return [];
    let items = [...activeProject.prompts];

    if (selectedTag) {
      items = items.filter((p) => p.tags.includes(selectedTag));
    }

    return items;
  }, [activeProject, selectedTag]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white flex flex-col relative">
      {/* Dynamic Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modern High-End Top Navigation Brand with zero fluff */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-neutral-200 z-30 px-5 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand Identity / Home */}
          <div className="flex items-center justify-between">
            <div 
              onClick={() => {
                setCurrentView('dashboard');
                setSelectedTag('');
                setSearchQuery('');
              }}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="h-9 w-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-md">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-neutral-900">Prompt Bank</h1>
                <p className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">Penyimpan & Manajemen Prompt</p>
              </div>
            </div>

            {/* Mobile / Compact indicator layout */}
            <div className="md:hidden flex items-center gap-2 text-xs">
              {user ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium">
                  <Cloud className="h-3 w-3 text-emerald-500 animate-pulse" />
                  <span>Cloud Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium">
                  <CloudOff className="h-3 w-3 text-amber-500" />
                  <span>Offline Mode</span>
                </div>
              )}
            </div>
          </div>

          {/* Search bar inside header */}
          <div className="relative flex-1 max-w-md w-full md:mx-6">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </span>
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari platform, project, prompt, isi teks, atau tag..."
              className="w-full rounded-2xl bg-neutral-100 border-none pl-10 pr-10 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1.5 focus:ring-neutral-400 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Global statistics overview & Auth Action */}
          <div className="flex items-center justify-between md:justify-start gap-4 text-xs">
            <div className="hidden lg:flex items-center gap-3">
              <div className="bg-neutral-100 rounded-full px-3.5 py-1.5 text-neutral-500 font-medium">
                Platform: <strong className="text-neutral-900 font-bold">{platforms.length}</strong>
              </div>
              {allUniqueTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag('');
                    triggerToast('Filter tag dibersihkan', 'info');
                  }}
                  className={`rounded-full px-3 py-1.5 font-medium transition-all flex items-center gap-1 border border-neutral-200 ${
                    selectedTag ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {selectedTag ? `Tag: #${selectedTag}` : 'Daftar Tag'}
                </button>
              )}
            </div>

            {/* Premium Auth widget */}
            <div className="flex items-center gap-2.5 text-xs ml-auto md:ml-0">
              {authLoading ? (
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[10px] font-mono leading-none">Memuat...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-2.5">
                  {/* Cloud Indicator for desktop */}
                  <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-medium">
                    <Cloud className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                    <span className="font-mono">Terhubung</span>
                  </div>

                  {isSyncing && (
                    <div className="flex items-center gap-1 text-neutral-400" title="Sinkronisasi otomatis dengan Firestore...">
                      <RefreshCw className="h-3 w-3 animate-spin text-neutral-400" />
                    </div>
                  )}

                  {/* Profile Card */}
                  <div 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-2 bg-neutral-100/60 hover:bg-neutral-150 border border-neutral-200 pr-3 pl-1.5 py-1 rounded-xl transition-all max-w-[175px] cursor-pointer hover:border-neutral-300"
                    title="Edit Profil"
                  >
                    {(userProfile?.photoURL || user?.photoURL) ? (
                      <img 
                        src={userProfile?.photoURL || user?.photoURL || ''} 
                        alt={userProfile?.displayName || user?.displayName || 'Avatar'} 
                        referrerPolicy="no-referrer"
                        className="h-5.5 w-5.5 rounded-full object-cover border border-neutral-200/80"
                      />
                    ) : (
                      <div className="h-5.5 w-5.5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[9px] font-bold">
                        {(userProfile?.displayName || user?.displayName) ? (userProfile?.displayName || user?.displayName || '').slice(0, 2).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-neutral-800 truncate leading-none max-w-[80px]" title={userProfile?.displayName || user?.displayName || 'User'}>
                        {userProfile?.displayName || user?.displayName || 'User'}
                      </span>
                      {userProfile?.username && (
                        <span className="text-[8px] text-neutral-400 font-mono font-medium truncate max-w-[80px] mt-0.5">
                          @{userProfile.username}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Log Out icon */}
                  <button
                    type="button"
                    onClick={handleSignOutGoogle}
                    title="Keluar"
                    className="p-1 px-2 text-neutral-500 hover:text-red-600 rounded-lg hover:bg-red-50 border border-neutral-200 hover:border-red-100 transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 active:bg-neutral-950 border border-neutral-900 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-tight transition-all cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sinkron Cloud</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout Wrapper */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">

        {/* --- DYNAMIC GLOBAL SEARCH RESULTS OVERLAY --- */}
        <AnimatePresence>
          {searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full bg-white rounded-3xl border border-neutral-200 p-5 shadow-lg mb-4"
              id="global-search-results-box"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-neutral-600" />
                  <h2 className="text-sm font-bold text-neutral-800">
                    Hasil Pencarian Global ({searchResults.length} kecocokan)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
                >
                  Tutup Pencarian
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((match) => (
                    <div
                      key={`${match.type}-${match.id}`}
                      id={`search-result-item-${match.id}`}
                      onClick={() => handleSelectSearchMatch(match)}
                      className="group bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-150 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            match.type === 'platform' ? 'bg-amber-100 text-amber-800' :
                            match.type === 'project' ? 'bg-blue-100 text-blue-800' :
                            'bg-neutral-900 text-neutral-50'
                          }`}>
                            {match.type}
                          </span>
                          <ChevronRight className="h-3 w-3 text-neutral-300 group-hover:text-neutral-600 transition-colors" />
                        </div>
                        <h3 className="text-xs font-bold text-neutral-900 truncate">{highlightText(match.title, searchQuery)}</h3>
                        <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">{match.subtitle}</p>

                        {/* Snippet for prompt contents */}
                        {match.contentSnippet && (
                          <div className="mt-2 text-[11px] font-mono bg-white p-2 border border-neutral-150 rounded-lg text-neutral-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                            {highlightText(match.contentSnippet, searchQuery)}
                          </div>
                        )}
                      </div>

                      {/* Tag list */}
                      {match.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-neutral-150/50">
                          {match.tags.slice(0, 3).map((tg, i) => (
                            <span key={i} className="text-[9px] text-neutral-500 bg-white border border-neutral-200 rounded-full px-1.5 py-0.5 font-semibold">
                              #{tg}
                            </span>
                          ))}
                          {match.tags.length > 3 && (
                            <span className="text-[8px] text-neutral-400 font-bold">+{match.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-neutral-400 font-medium">
                    Tidak ditemukan hasil pencarian untuk "{searchQuery}". Coba kata kunci lain atau periksa penulisan.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- EMPTY STATE (Jika tidak ada platform sama sekali di sistem) --- */}
        {platforms.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-12" id="global-empty-state">
            <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center shadow-md border border-neutral-100 text-neutral-900 mb-5 animate-pulse">
              <Sparkles className="h-8 w-8 text-neutral-600" />
            </div>
            <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight leading-snug">
              Selamat datang di Tempat Prompt Anda!
            </h2>
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
              Silakan buat platform pertama Anda (misalnya ChatGPT, Claude, Midjourney) untuk mulai mengorganisasikan, menyusun, dan menduplikasi prompts secara rapi.
            </p>
            <button
              id="add-first-platform-btn"
              type="button"
              onClick={handleOpenAddPlatform}
              className="mt-6 flex items-center justify-center rounded-all rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold p-4 transition-all transform hover:scale-110 shadow-lg border border-neutral-850 cursor-pointer"
              title="Buat Platform"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {platforms.length > 0 && currentView === 'dashboard' && (
          <DashboardView
            platforms={platforms}
            onSelectPlatform={handleSelectPlatformFromDashboard}
            onAddPlatform={handleOpenAddPlatform}
            onEditPlatform={handleOpenEditPlatform}
            onDeletePlatform={handleDeletePlatform}
          />
        )}

        {/* === LEVEL 2: PLATFORM DETAILS MODULE === */}
        {platforms.length > 0 && currentView === 'platform' && activePlatform && (
          <div className="space-y-6 animate-fadeIn" id="platform-module-container">
            {/* Header Platform */}
            <div className="relative bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden min-h-[160px] flex flex-col justify-between">
              
              {/* Background cover image with 30% opacity */}
              {activePlatform.image ? (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
                  <img
                    src={activePlatform.image}
                    alt=""
                    className="w-full h-full object-cover opacity-30"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 z-0 bg-linear-to-br from-neutral-50 to-neutral-100/50 opacity-30 pointer-events-none select-none" />
              )}
              
              {/* Overlay for contrast */}
              <div className="absolute inset-0 z-1 bg-gradient-to-r from-white via-white/90 to-white/70 pointer-events-none" />

              {/* Header Content */}
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Back to dashboard button inside header */}
                  <button
                    id="platform-back-to-dashboard"
                    onClick={() => {
                      setCurrentView('dashboard');
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-2 rounded-xl transition-all font-bold text-xs shadow-xs cursor-pointer active:scale-95 shrink-0 w-fit"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2.5 py-1 rounded-full">
                        Platform Terbuka
                      </span>
                      {activePlatform.tags.map((tg, idx) => (
                        <span key={idx} className="text-[9px] bg-neutral-900/5 text-neutral-600 rounded-full px-2 py-0.5 font-bold uppercase">
                          #{tg}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                      {activePlatform.title}
                    </h2>
                    <p className="text-xs text-neutral-500 font-semibold">
                      Kelola daftar project dan kustomisasi platform di bawah ini.
                    </p>
                  </div>
                </div>

                {/* Operations & Count Stats */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-2 bg-neutral-100/80 border border-neutral-200 rounded-2xl p-2 px-3 text-center">
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-neutral-400 block uppercase">Total Projects</span>
                      <strong className="text-sm font-black text-neutral-800 font-mono">{activePlatform.projects.length}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-neutral-100/80 border border-neutral-200 rounded-2xl p-2 px-3 text-center">
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-neutral-400 block uppercase">Total Prompts</span>
                      <strong className="text-sm font-black text-neutral-800 font-mono">
                        {activePlatform.projects.reduce((acc, pr) => acc + pr.prompts.length, 0)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditPlatform(activePlatform, e)}
                      className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 p-2.5 text-neutral-600 hover:text-neutral-900 transition-all font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs"
                      title="Edit Platform Ini"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeletePlatform(activePlatform.id, e)}
                      className="rounded-xl border border-neutral-200 bg-red-50 hover:bg-red-100 p-2.5 text-red-600 hover:text-red-700 transition-all font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs"
                      title="Hapus Platform Ini"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-header & Add Project button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4.5 w-4.5 text-neutral-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Daftar Project di Platform "{activePlatform.title}"</h3>
              </div>
              <button
                id="platform-add-project-btn"
                onClick={handleOpenAddProject}
                className="flex items-center justify-center rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold p-2.5 transition-all transform hover:scale-105 shadow-md border border-neutral-800 cursor-pointer active:scale-95"
                title="Tambah Project"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* List of Projects Grid as customized Cards */}
            {activePlatform.projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="platform-projects-grid">
                {activePlatform.projects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    proj={proj}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      setCurrentView('prompts');
                      setSearchQuery('');
                    }}
                    onMoveDuplicate={(e) => handleOpenMoveDuplicateProject(proj, e)}
                    onEdit={(e) => handleOpenEditProject(proj, e)}
                    onDelete={(e) => handleDeleteProject(proj.id, e)}
                  />
                ))}
              </div>
            ) : (
              /* Empty state of projects */
              <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center max-w-sm mx-auto shadow-sm" id="platform-projects-empty-state">
                <FolderOpen className="h-10 w-10 text-neutral-350 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-neutral-800 mb-1">Daftar Project Kosong</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto mb-4">
                  Mulai atur prompt Anda dengan menambahkan project pertama untuk platform "{activePlatform.title}".
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddProject}
                  className="inline-flex items-center justify-center rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold p-4 transition-all hover:scale-110 cursor-pointer shadow-lg border border-neutral-800"
                  title="Tambah Project Pertama"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* === LEVEL 3: PROMPTS VIEW MODULE === */}
        {platforms.length > 0 && currentView === 'prompts' && activePlatform && activeProject && (
          <div className="space-y-6 animate-fadeIn" id="prompts-module-container">
            {/* Header Project */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3.5">
                {/* Back to platform button */}
                <button
                  id="prompts-back-to-platform"
                  onClick={() => {
                    setCurrentView('platform');
                  }}
                  className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 rounded-xl transition-all font-bold text-xs shadow-xs cursor-pointer active:scale-95 shrink-0 w-fit"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span 
                      onClick={() => setCurrentView('dashboard')}
                      className="text-[9px] font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-md"
                    >
                      DASHBOARD
                    </span>
                    <ChevronRight className="h-3 w-3 text-neutral-300" />
                    <span 
                      onClick={() => setCurrentView('platform')}
                      className="text-[9px] font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-md"
                    >
                      {activePlatform.title}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
                    <span className="text-[9px] font-bold text-neutral-800 uppercase tracking-widest bg-neutral-150 px-2 py-0.5 rounded-md">
                      {activeProject.title}
                    </span>
                    {activeProject.tags.map((tg) => (
                      <span key={tg} className="text-[8px] bg-neutral-900/5 text-neutral-600 rounded-full px-2 py-0.5 font-bold uppercase">
                        #{tg}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-base font-extrabold text-neutral-900 tracking-tight">
                    {activeProject.title}
                  </h2>
                </div>
              </div>

              {/* Commands: Copy All & Add Prompt */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="prompts-copy-all"
                  type="button"
                  onClick={handleCopyAllPrompts}
                  className="border border-neutral-200 bg-white hover:bg-neutral-50 transition-all text-neutral-800 text-xs font-bold rounded-xl px-3.5 py-2 flex items-center justify-center gap-1.2 shadow-xs cursor-pointer"
                  title="Salin Semua Prompts dalam Project Ini"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy All
                </button>

                <button
                  id="prompts-add-prompt"
                  type="button"
                  onClick={handleOpenAddPrompt}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl p-2.5 border border-neutral-800 flex items-center justify-center shadow-md hover:scale-105 transition-all cursor-pointer"
                  title="Tambah Prompt"
                >
                  <Plus className="h-5 w-5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* List of Prompts inside this project */}
            {displayedPrompts.length > 0 ? (
              <div className="space-y-4" id="prompts-list-grid">
                {displayedPrompts.map((prm, index) => (
                  <PromptCard
                    key={prm.id}
                    prompt={prm}
                    index={index}
                    totalCount={displayedPrompts.length}
                    onCopy={(content) => copyToClipboard(content)}
                    onEdit={handleOpenEditPrompt}
                    onDelete={handleDeletePrompt}
                    onMoveDuplicate={handleOpenMoveDuplicatePrompt}
                    onReorder={handleReorderPrompt}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            ) : (
              /* Empty prompt screen */
              <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center max-w-sm mx-auto shadow-sm" id="prompts-empty-screen">
                <BookOpen className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-neutral-800 mb-1">Daftar Prompt Kosong</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto mb-4">
                  Belum ada prompt disimpan di project "{activeProject.title}". Tulis dan simpan prompt pertama Anda sekarang.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddPrompt}
                  className="inline-flex items-center justify-center rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold p-4 transition-all hover:scale-110 shadow-lg border border-neutral-800 cursor-pointer"
                  title="Buat Prompt Pertama"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modern Compact Neutral Footer */}
      <footer className="bg-white border-t border-neutral-200 text-center py-5 px-4 mt-auto text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} PROMPT BANK • ALL DATA PERSISTED LOCALLY</span>
          <span>STRICT CONFIDENTIAL SUITE</span>
        </div>
      </footer>

      {/* ==========================================
          DYNAMIC FLOATING MODAL DIALOGS
          ========================================== */}
      
      {/* 1. Confirm Dialog */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        isDanger={confirmState.isDanger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 2. Platform Form Modal */}
      <PlatformModal
        isOpen={isPlatformOpen}
        platform={editingPlatform}
        onSave={handleSavePlatform}
        onClose={() => {
          setIsPlatformOpen(false);
          setEditingPlatform(null);
        }}
      />

      {/* 3. Project Form Modal */}
      <ProjectModal
        isOpen={isProjectOpen}
        project={editingProject}
        onSave={handleSaveProject}
        onClose={() => {
          setIsProjectOpen(false);
          setEditingProject(null);
        }}
      />

      {/* 4. Prompt Form Modal */}
      <PromptModal
        isOpen={isPromptOpen}
        prompt={editingPrompt}
        onSave={handleSavePrompt}
        onClose={() => {
          setIsPromptOpen(false);
          setEditingPrompt(null);
        }}
      />

      {/* 5. Move / Duplicate Form Modal */}
      <MoveDuplicateModal
        isOpen={isMoveDuplicateOpen}
        type={moveDuplicateDetails?.type || 'prompt'}
        targetItemName={moveDuplicateDetails?.item?.title || ''}
        platformsList={platforms}
        currentPlatformId={moveDuplicateDetails?.currentPlatformId || ''}
        currentProjectId={moveDuplicateDetails?.currentProjectId}
        onClose={() => {
          setIsMoveDuplicateOpen(false);
          setMoveDuplicateDetails(null);
        }}
        onExecute={handleExecuteMoveDuplicate}
      />

      {/* 6. Custom Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onRegister={handleRegisterEmail}
        onLogin={handleLoginEmail}
        onGoogleSignIn={handleSignInGoogle}
        onTriggerToast={triggerToast}
      />

      {/* 7. Profile Editing Custom Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onTriggerToast={triggerToast}
      />

    </div>
  );
}
