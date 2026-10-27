import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { formatDisplayText } from '../../utils/formatters';
import {
  Bell,
  CheckCheck,
  CheckCircle,
  XCircle,
  BookOpen,
  FileCheck2,
  Clock,
  UserPlus,
  Lock,
  Unlock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'QUIZ_FOCUS_ALERT':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'NEW_EMPLOYEE_REGISTERED':
      case 'NEW_EMPLOYEE_ADDED':
      case 'INSTRUCTOR_ADDED':
      case 'EMPLOYEE_ACTIVATED':
      case 'INSTRUCTOR_ACTIVATED':
        return <UserPlus className="w-5 h-5 text-teal-600" />;
      case 'EMPLOYEE_DEACTIVATED':
      case 'INSTRUCTOR_DEACTIVATED':
      case 'ACCOUNT_LOCKED':
        return <Lock className="w-5 h-5 text-rose-600" />;
      case 'ACCOUNT_UNLOCKED':
        return <Unlock className="w-5 h-5 text-emerald-600" />;
      case 'NEW_TRAINING_CREATED':
      case 'TRAINING_CREATED':
      case 'TRAINING_UPDATED':
      case 'TRAINING_PUBLISHED':
      case 'TRAINING_ASSIGNED':
      case 'NEW_TRAINING_ASSIGNED':
      case 'AUTO_ASSIGNED_TRAINING':
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case 'ASSIGNMENT_SUBMITTED':
      case 'ASSIGNMENT_REQUIRES_REVIEW':
      case 'ASSIGNMENT_REVIEWED':
      case 'INSTRUCTOR_FEEDBACK':
        return <FileCheck2 className="w-5 h-5 text-emerald-600" />;
      case 'QUIZ_PASSED':
      case 'TRAINING_COMPLETED':
      case 'EMPLOYEE_COMPLETED_TRAINING':
      case 'EMPLOYEE_COMPLETED_ALL_REQUIRED_TRAINING':
      case 'CERTIFICATE_AVAILABLE':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'QUIZ_FAILED':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'DEADLINE_EXTENDED':
      case 'DEADLINE_APPROACHING_7_DAYS':
      case 'DEADLINE_APPROACHING_3_DAYS':
      case 'DEADLINE_APPROACHING_2_DAYS':
      case 'DEADLINE_APPROACHING_1_DAY':
      case 'TRAINING_DUE_TODAY':
      case 'TRAINING_DEADLINE_APPROACHING':
      case 'TRAINING_DEADLINE_REACHED':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'TRAINING_OVERDUE':
      case 'EMPLOYEE_TRAINING_OVERDUE':
      case 'MULTIPLE_EMPLOYEES_OVERDUE':
      case 'EMPLOYEES_WITH_OVERDUE_TRAINING':
      case 'TRAINING_LOCKED':
        return <Lock className="w-5 h-5 text-rose-600" />;
      case 'TRAINING_UNLOCKED':
        return <Unlock className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-emerald-600" />;
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markAsRead(n.id || n._id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="p-4 xs:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <Bell className="w-6 h-6 xs:w-7 xs:h-7 text-emerald-600 shrink-0" />
            <h1 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Notifications Center</h1>
          </div>
          <p className="text-xs text-slate-500">
            Real-time updates, activity alerts, and operational notifications for your LMS account.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 sm:space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 xs:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 xs:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'unread'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <Sparkles className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No notifications found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'unread' ? "You've read all your notifications!" : "You don't have any notifications right now."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id || n._id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 xs:p-5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 xs:space-x-4 hover:shadow-md ${
                !n.isRead
                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="p-2 xs:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex-shrink-0 mt-0.5">
                {getNotifIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{formatDisplayText(n.title)}</h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 font-mono">
                    {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{formatDisplayText(n.message)}</p>

                <div className="flex items-center space-x-2">
                  {!n.isRead && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Unread
                    </span>
                  )}
                  {n.type === 'ASSIGNMENT_SUBMITTED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Action Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

