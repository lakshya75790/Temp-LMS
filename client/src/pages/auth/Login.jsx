import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [licenseError, setLicenseError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLicenseError(null);

    try {
      const u = await login({ email, password });
      addToast('success', `Welcome back, ${u.name}!`);

      if (u.role === 'SuperAdmin') navigate('/super-admin');
      else if (u.role === 'Admin') navigate('/admin');
      else if (u.role === 'Instructor') navigate('/instructor');
      else navigate('/employee');
    } catch (err) {
      const isExpired = err.errorCode === 'ORGANIZATION_LICENSE_EXPIRED' || (err.message && err.message.toLowerCase().includes('expired'));
      const isNotStarted = err.errorCode === 'ORGANIZATION_LICENSE_NOT_STARTED' || (err.message && err.message.toLowerCase().includes('not started'));

      if (isExpired) {
        const msg = "Your LMS license has expired. Please contact your administrator to renew or extend the license.";
        setLicenseError(msg);
        addToast('error', msg);
      } else if (isNotStarted) {
        const msg = "Your LMS license has not started yet. Please contact your administrator.";
        setLicenseError(msg);
        addToast('error', msg);
      } else {
        addToast('error', err.message || 'Login failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 xs:p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-auth-form-switch">
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Sign In to LMS</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Enter your credentials to access your personalized learning dashboard.
        </p>
      </div>

      {licenseError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-3 shadow-xs animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-rose-900 dark:text-rose-300 uppercase tracking-wider block">
              Access Restricted
            </span>
            <p className="leading-relaxed font-medium">{licenseError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (licenseError) setLicenseError(null);
              }}
              required
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (licenseError) setLicenseError(null);
              }}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Login</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
        <p className="text-slate-500 dark:text-slate-400">
          New learner?{' '}
          <Link to="/register-employee" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold underline transition-colors">
            Register Learner Account
          </Link>
        </p>
      </div>
    </div>
  );
};
