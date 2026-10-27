import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { updateProfile, updateProfilePicture, resetProfilePicture, changePassword } from '../../services/api';
import {
  User,
  Mail,
  Upload,
  RefreshCw,
  KeyRound,
  Lock,
  Check,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { validateImageFile } from '../../utils/fileValidation';

export const AccountSettingsPage = () => {
  const { user, setUser } = useAuth();
  const { addToast } = useNotification();
  const fileInputRef = useRef(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');

  // Profile Picture Upload & Reset State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resetAvatarPending, setResetAvatarPending] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Synchronize state when user loads or updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // Clean up object URLs on unmount or preview replacement
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Avatar Display computation
  const defaultDicebear = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || user?.name || 'User')}`;
  const currentDisplayAvatar = previewUrl
    ? previewUrl
    : resetAvatarPending
      ? defaultDicebear
      : (user?.profilePicture || defaultDicebear);

  // Choose Photo Handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = null;
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setResetAvatarPending(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    e.target.value = null;
  };

  // Reset Avatar Handler (clears un-saved file or queues reset to initial avatar)
  const handleResetAvatar = () => {
    // If a new photo is currently selected but not saved yet: revert selection
    if (selectedFile || previewUrl) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setResetAvatarPending(false);
      addToast('info', 'Pending photo selection cleared.');
      return;
    }

    // If reset is already queued: toggle back
    if (resetAvatarPending) {
      setResetAvatarPending(false);
      addToast('info', 'Restored previous profile photo.');
      return;
    }

    // If user has a saved custom avatar in the DB: queue reset
    if (user?.isCustomAvatar) {
      setResetAvatarPending(true);
      addToast('info', 'Avatar reset to default initial. Click "Save Profile Changes" to save.');
      return;
    }

    addToast('info', 'Your avatar is already using the default initial avatar.');
  };

  // Save Profile Changes Handler
  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const isNameChanged = name.trim() !== (user?.name || '');
    const hasPhotoToUpload = !!selectedFile;
    const hasResetPending = resetAvatarPending;

    if (!isNameChanged && !hasPhotoToUpload && !hasResetPending) {
      addToast('info', 'No changes to save.');
      return;
    }

    if (!name.trim()) {
      addToast('error', 'Full name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    let latestUser = user;

    try {
      // 1. Photo upload if a new file was chosen
      if (hasPhotoToUpload) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const picRes = await updateProfilePicture(formData);
        if (picRes?.data?.data?.user) {
          latestUser = picRes.data.data.user;
        }
      } else if (hasResetPending) {
        // 2. Reset picture to default if requested
        const resetRes = await resetProfilePicture();
        if (resetRes?.data?.data?.user) {
          latestUser = resetRes.data.data.user;
        }
      }

      // 3. Update text details (Name)
      if (isNameChanged) {
        const profileData = { name: name.trim() };
        const profileRes = await updateProfile(profileData);
        if (profileRes?.data?.data?.user) {
          latestUser = profileRes.data.data.user;
        }
      }

      setUser(latestUser);
      setSelectedFile(null);
      setPreviewUrl(null);
      setResetAvatarPending(false);
      addToast('success', 'Profile details updated successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update profile details');
    } finally {
      setSavingProfile(false);
    }
  };

  // Update Password Handler
  const handlePasswordSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('error', 'Please fill in all password fields.');
      return;
    }

    if (currentPassword === newPassword) {
      addToast('error', 'New password must be different from your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      addToast('error', 'New password must be at least 6 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      addToast('success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Page Title & Subtitle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight font-heading">
            Account Settings
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
            Manage your personal profile details, photo avatar, and security authentication credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {user?.role === 'Admin' ? 'Organization Admin' : user?.role || 'User'}
          </span>
          {user?.organizationId?.name && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {user.organizationId.name}
            </span>
          )}
        </div>
      </div>

      {/* CARD 1: Personal Profile Details */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 xs:p-6 sm:p-7 md:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-[18px] font-bold text-slate-900 font-heading">Personal Profile Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">Update your personal photo, full name, and registered email address.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Avatar, Identity & Photo Action Buttons */}
          <div className="md:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-3.5">
            <div className="relative">
              <img
                src={currentDisplayAvatar}
                alt={user?.name || 'Profile Avatar'}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-100 shadow-xs bg-slate-50 ring-2 ring-emerald-500/20"
              />
              {(selectedFile || resetAvatarPending) && (
                <span className="absolute bottom-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-500 text-white rounded-full shadow-xs border-2 border-white">
                  Pending
                </span>
              )}
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">{name || user?.name || 'User'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {user?.role === 'Admin' ? 'Organization Administrator' : user?.role || 'Member'}
                {user?.organizationId?.name ? ` • ${user.organizationId.name}` : ''}
              </p>
            </div>

            {/* Choose Photo & Reset Buttons */}
            <div className="flex items-center gap-2 pt-1 w-full sm:w-auto justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors inline-flex items-center cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Choose Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleResetAvatar}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center cursor-pointer"
                title="Reset avatar to default initial"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Reset
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Supported formats: JPG, PNG, SVG (max 5MB).
            </p>
          </div>

          {/* Right Column: Name & Email Fields */}
          <div className="md:col-span-8 space-y-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Profile Changes Button Aligned to Bottom-Right */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* CARD 2: Security & Password */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 md:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-[18px] font-bold text-slate-900 font-heading">Security & Password</h2>
          <p className="text-xs text-slate-500 mt-0.5">Update your account login password to maintain platform security.</p>
        </div>

        {/* Three Password Fields Arranged Horizontally on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Current Password */}
          <div>
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Check className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirmPass ? 'Hide confirmed password' : 'Show confirmed password'}
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Update Password Button Aligned to Bottom-Right */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={savingPassword}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            {savingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
};
