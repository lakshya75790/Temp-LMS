import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDisplayText } from '../../utils/formatters';
import { ProfileModal } from '../profile/ProfileModal';
import { ChangePasswordModal } from '../profile/ChangePasswordModal';
import { Bell, User, KeyRound, LogOut, CheckCheck, Sparkles, Building, Menu, GraduationCap, Sun, Moon } from 'lucide-react';

export const Navbar = ({ onToggleMobileSidebar = () => {} }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();
  const { theme, toggleTheme, isDark } = useTheme();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    if (!showNotifDropdown && !showUserDropdown) return;

    const handleOutsideClick = (event) => {
      if (showNotifDropdown && notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (showUserDropdown && userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifDropdown(false);
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifDropdown, showUserDropdown]);

  const roleColors = {
    SuperAdmin: 'bg-rose-50 text-rose-700 border-rose-200',
    Admin: 'bg-purple-50 text-purple-700 border-purple-200',
    Instructor: 'bg-teal-50 text-teal-700 border-teal-200',
    Employee: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shadow-xs transition-colors duration-200">
        {/* Left: Mobile/Tablet Toggle & Organization Name */}
        <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0 pr-2">
          <button
            onClick={onToggleMobileSidebar}
            className="xl:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer shrink-0"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-slate-900 dark:text-white font-heading truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-none">
              {user?.organizationId?.name || (user?.role === 'SuperAdmin' ? 'Platform Console' : 'Enterprise Workspace')}
            </span>
          </div>
        </div>

        {/* Right: Role Badge, Theme Toggle, Notifications & Profile Dropdown */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Role Badge */}
          <span className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${roleColors[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {user?.role === 'Admin' ? 'Org Admin' : user?.role === 'Employee' ? 'Learner' : user?.role}
          </span>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all focus:outline-none cursor-pointer"
            title={isDark ? 'Currently Dark Mode. Click or press Ctrl + M to switch to Light Mode.' : 'Currently Light Mode. Click or press Ctrl + M to switch to Dark Mode.'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 hover:-rotate-12 transition-transform" />
            )}
            <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Notifications Bell */}
          {user?.role !== 'SuperAdmin' && (
            <div ref={notifRef} className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  setShowUserDropdown(false);
                }}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                aria-label="Notifications"
              >
                <div className="relative inline-flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-[18px] px-1.5 bg-emerald-600 text-white font-bold text-[10px] leading-none rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs z-10 pointer-events-none">
                      {unreadCount > 10 ? '10+' : unreadCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/70">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</h4>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold flex items-center transition-colors cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                        No notifications available
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id || n._id}
                          onClick={() => markAsRead(n.id || n._id)}
                          className={`p-3.5 text-xs transition-colors cursor-pointer ${
                            !n.isRead
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-3 border-emerald-600 dark:border-emerald-500 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{formatDisplayText(n.title)}</h5>
                          <p className="text-slate-600 dark:text-slate-300 mb-1 leading-relaxed">{formatDisplayText(n.message)}</p>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-center">
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        const path = user?.role === 'Admin' ? '/admin/notifications' :
                                     user?.role === 'Instructor' ? '/instructor/notifications' :
                                     '/employee/notifications';
                        navigate(path);
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer py-1"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Menu Dropdown */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifDropdown(false);
              }}
              className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            >
              <img
                src={user?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                alt={user?.name}
                className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
              />
              <span className="hidden sm:inline font-semibold text-xs text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {user?.name}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-fade-in space-y-1">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    const path = user?.role === 'SuperAdmin' ? '/super-admin/settings' :
                                 user?.role === 'Admin' ? '/admin/settings' :
                                 user?.role === 'Instructor' ? '/instructor/settings' :
                                 '/employee/settings';
                    navigate(path);
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                  Account Settings
                </button>

                <button
                  onClick={() => {
                    setShowPassModal(true);
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                  Change Password
                </button>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <ChangePasswordModal isOpen={showPassModal} onClose={() => setShowPassModal(false)} />
    </>
  );
};

