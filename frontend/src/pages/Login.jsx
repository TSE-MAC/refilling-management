import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, setAuth, getToken } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) navigate('/', { replace: true });
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.token, data.username);
      toast.success('Signed in');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ops-navy text-white flex flex-col">
      {/* Top stripe */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-ops-red flex items-center justify-center shadow-lg shadow-red-900/40">
            <Flame className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold tracking-tight leading-none">RefillOps</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 mt-1">Plant Console</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> System ready
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8 bg-dot-pattern">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white/80 mb-3">
              <ShieldCheck className="w-3 h-3" /> Authorised personnel only
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Sign in to begin<br />the day's operations.
            </h1>
            <p className="text-sm text-white/60 mt-2">
              Track refills, dispatches, stock movements and delivery costs across your plant.
            </p>
          </div>

          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-5 py-3.5 bg-ops-bg border-b border-slate-200 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Operator Sign-In
              </div>
              <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <form onSubmit={submit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="login-username-input"
                  autoComplete="username"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy focus:border-ops-navy"
                  placeholder="operator id"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password-input"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-12 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy focus:border-ops-navy"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                data-testid="login-submit-btn"
                className="w-full h-12 rounded-lg bg-ops-navy hover:bg-ops-navy-dark disabled:opacity-60 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </motion.button>
            </form>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { k: 'Jobs', v: 'Live' },
              { k: 'Stock', v: 'Tracked' },
              { k: 'History', v: 'Indexed' },
            ].map((b) => (
              <div key={b.k} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/50">{b.k}</div>
                <div className="font-display font-bold text-sm">{b.v}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-white/40 mt-7">
            v1.1 · Internal Build · RefillOps
          </p>
        </motion.div>
      </div>
    </div>
  );
}
