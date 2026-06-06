import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  AtSign, 
  Eye, 
  EyeOff, 
  Camera, 
  Upload, 
  Globe, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function AuthModal({
  isOpen,
  onClose,
  onRegister,
  onLogin,
  onGoogleSignIn,
  onTriggerToast
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'offline'>('login');
  
  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register States
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Reset local inputs on reopen
  useEffect(() => {
    if (isOpen) {
      setTab('login');
      setLoginEmail('');
      setLoginPassword('');
      setRegEmail('');
      setRegPassword('');
      setRegName('');
      setRegUsername('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      onTriggerToast('Email dan password harus diisi', 'error');
      return;
    }
    setLoginLoading(true);
    try {
      await onLogin(loginEmail, loginPassword);
    } catch {
      // Handled in parent
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regPassword.trim() || !regName.trim() || !regUsername.trim()) {
      onTriggerToast('Semua kolom harus diisi', 'error');
      return;
    }
    if (regPassword.length < 6) {
      onTriggerToast('Password minimal 6 karakter', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(regUsername)) {
      onTriggerToast('Username harus 3-20 karakter, huruf/angka/underscore saja.', 'error');
      return;
    }
    setRegLoading(true);
    try {
      await onRegister(regEmail, regPassword, regName, regUsername);
    } catch {
      // Handled in parent
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    try {
      await onGoogleSignIn();
      onClose();
    } catch (e) {
      // Handled
    }
  };

  const handleEnterOfflineMode = () => {
    onTriggerToast('Memasuki Mode Offline. Data akan disimpan secara lokal di browser ini.', 'warning');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/45 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white border border-neutral-200 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden z-10 flex flex-col"
        id="auth-modal-dialog"
      >
        {/* Header decoration */}
        <div className="bg-neutral-950 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="inline-flex items-center justify-center h-10 w-10 bg-neutral-900 rounded-2xl border border-neutral-850 mb-3 text-emerald-400">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Sinkronisasi Cloud Premium</h3>
          <p className="text-[10.5px] text-neutral-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
            Backup & akses bank prompt Anda secara realtime di berbagai perangkat.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-neutral-100 bg-neutral-50 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'login' 
                ? 'bg-neutral-900 text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'register' 
                ? 'bg-neutral-900 text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Daftar Baru
          </button>
          <button
            type="button"
            onClick={() => setTab('offline')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'offline' 
                ? 'bg-neutral-900 text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Mode Lokal
          </button>
        </div>

        {/* Content body based on tabs */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[380px]">
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="nama@email.com"
                    className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9.5 pr-4 py-2 text-xs rounded-xl transition-all focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9.5 pr-10 py-2 text-xs rounded-xl transition-all focus:outline-hidden font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-neutral-50 hover:text-white py-2 rounded-xl text-xs font-bold tracking-tight shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {loginLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Masuk Akun'
                )}
              </button>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-neutral-100 w-full" />
                <span className="absolute bg-white px-2.5 text-[9px] font-bold uppercase text-neutral-400 tracking-wider">
                  atau
                </span>
              </div>

              {/* Google login Button */}
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <svg className="h-3 w-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.12 2.77-2.38 3.61v3h3.84c2.25-2.07 3.53-5.11 3.53-8.44z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.84-3c-1.07.72-2.44 1.15-4.09 1.15-3.15 0-5.81-2.12-6.76-4.99H1.27v3.1A11.986 11.986 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.24 14.26a7.21 7.21 0 0 1 0-4.52V6.63H1.27a11.99 11.99 0 0 0 0 10.74l3.97-3.11z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.28 2.69 1.27 6.63l3.97 3.11c.95-2.87 3.61-4.99 6.76-4.99z" />
                </svg>
                Masuk dengan Google
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                    <UserIcon className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    placeholder="Ahmad Fauzi"
                    className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9.5 pr-4 py-2 text-xs rounded-xl transition-all focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Username Unik
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-450">
                    <AtSign className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    placeholder="ahmad_fauzi"
                    className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9.5 pr-4 py-2 text-xs rounded-xl transition-all focus:outline-hidden font-medium font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    placeholder="nama@email.com"
                    className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9.5 pr-4 py-2 text-xs rounded-xl transition-all focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Password (min 6 karakter)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9.5 pr-10 py-2 text-xs rounded-xl transition-all focus:outline-hidden font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-neutral-50 hover:text-white py-2 rounded-xl text-xs font-bold tracking-tight shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {regLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Daftarkan Akun'
                )}
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-neutral-100 w-full" />
                <span className="absolute bg-white px-2.5 text-[9px] font-bold uppercase text-neutral-400 tracking-wider">
                  atau
                </span>
              </div>

              {/* Google signup Button */}
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <svg className="h-3 w-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.12 2.77-2.38 3.61v3h3.84c2.25-2.07 3.53-5.11 3.53-8.44z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.84-3c-1.07.72-2.44 1.15-4.09 1.15-3.15 0-5.81-2.12-6.76-4.99H1.27v3.1A11.986 11.986 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.24 14.26a7.21 7.21 0 0 1 0-4.52V6.63H1.27a11.99 11.99 0 0 0 0 10.74l3.97-3.11z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.28 2.69 1.27 6.63l3.97 3.11c.95-2.87 3.61-4.99 6.76-4.99z" />
                </svg>
                Daftar dengan Google
              </button>
            </form>
          )}

          {tab === 'offline' && (
            <div className="space-y-4 text-center py-2">
              <div className="inline-flex items-center justify-center p-3 bg-neutral-100 rounded-full text-neutral-600 mb-1">
                <Globe className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-neutral-800">Mode Lokal (Offline Hub)</h4>
              <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
                Anda dapat menjelajah, menulis prompt, dan mendesain platform secara penuh tanpa akun cloud. Seluruh data tetap tersimpan aman di browser (LocalStorage) komputer Anda.
              </p>
              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-[10px] text-amber-800 font-medium text-left">
                Peringatan: Menghapus histori cache browser dapat menghilangkan prompt Anda jika tidak tersinkronisasi ke cloud.
              </div>

              <button
                type="button"
                onClick={handleEnterOfflineMode}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer mt-2"
              >
                Gunakan Mode Lokal Offline
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: { uid: string; email: string; displayName: string; username: string; photoURL: string; provider: string } | null;
  onUpdateProfile: (displayName: string, photoURL: string, username: string) => Promise<void>;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
  onTriggerToast
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ready-to-go minimal modern dynamic background gradients or cute avatar presets
  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=70',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=70',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=70',
    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=70',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=70',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=70'
  ];

  useEffect(() => {
    if (isOpen && userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhotoURL(userProfile.photoURL || '');
      setUsername(userProfile.username || '');
    }
  }, [isOpen, userProfile]);

  if (!isOpen || !userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      onTriggerToast('Nama lengkap tidak boleh kosong', 'error');
      return;
    }
    setLoading(true);
    try {
      await onUpdateProfile(displayName, photoURL, username);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 2200000) {
      onTriggerToast('Ukuran foto maksimal adalah 2MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      onTriggerToast('Format file harus berupa gambar', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhotoURL(e.target.result as string);
        onTriggerToast('Foto berhasil ditransmutasikan menjadi Data URI!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white border border-neutral-200 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden z-10 flex flex-col"
        id="profile-editing-dialog"
      >
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-5">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4.5 w-4.5 text-neutral-800" />
            <h3 className="text-xs font-bold text-neutral-900 tracking-tight">Perbarui Profil Anda</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-450 hover:text-neutral-700 transition-all cursor-pointer"
            title="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[460px]">
          {/* Avatar Area */}
          <div className="flex flex-col items-center">
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative h-20 w-20 rounded-full bg-neutral-100 border border-neutral-250 flex items-center justify-center group overflow-hidden transition-all content-center"
              title="Seret & lepas foto ke sini untuk mengunggah"
            >
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt="Review Avatar" 
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-[18px] font-bold text-neutral-700 uppercase">
                  {displayName ? displayName.slice(0, 2) : 'PB'}
                </div>
              )}
              {/* Overlay Upload Indicator */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer transition-opacity"
              >
                <Camera className="h-4.5 w-4.5 mb-0.5 text-white animate-bounce" />
                <span>UNGAH FOTO</span>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <p className="text-[9.5px] text-neutral-400 mt-2 font-medium text-center">
              Seret & lepas foto (max. 2MB) atau masukkan URL foto.
            </p>

            {/* Avatar presets selection */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {AVATAR_PRESETS.map((preset, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    setPhotoURL(preset);
                    onTriggerToast(`Preset Avatar ${index+1} dipilih!`, 'info');
                  }}
                  className={`h-7 w-7 rounded-full overflow-hidden transition-all border shrink-0 cursor-pointer ${
                    photoURL === preset ? 'border-neutral-900 scale-110 ring-2 ring-neutral-250/20' : 'border-neutral-200 hover:scale-105'
                  }`}
                >
                  <img src={preset} alt={`Preset ${index}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                  <UserIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Nama Lengkap"
                  className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9 pr-4 py-1.5 text-xs rounded-xl transition-all focus:outline-hidden font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                Username (@ handle)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-450">
                  <AtSign className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username_baru"
                  className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9 pr-4 py-1.5 text-xs rounded-xl transition-all focus:outline-hidden font-mono text-neutral-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                Foto URL (Opsional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                  <Upload className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/photo.jpg atau Data URI"
                  className="w-full bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 pl-9 pr-4 py-1.5 text-xs rounded-xl transition-all focus:outline-hidden font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-50 hover:text-white py-2 rounded-xl text-xs font-bold tracking-tight shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Perbarui Data Profil'
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
