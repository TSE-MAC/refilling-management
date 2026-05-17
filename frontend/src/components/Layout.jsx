import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  History as HistoryIcon,
  Users,
  Package,
  LogOut,
  Flame,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/api';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './ui/drawer';

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true, testid: 'nav-dashboard-link' },
  { to: '/jobs', label: 'Jobs', icon: ClipboardList, testid: 'nav-jobs-link' },
  { to: '/history', label: 'History', icon: HistoryIcon, testid: 'nav-history-link' },
  { to: '/parties', label: 'Parties', icon: Users, testid: 'nav-parties-link' },
  { to: '/stock', label: 'Stock', icon: Package, testid: 'nav-stock-link' },
];

const TITLES = {
  '/': 'Dashboard',
  '/jobs': 'Jobs',
  '/jobs/new': 'New Job',
  '/history': 'History',
  '/parties': 'Parties',
  '/stock': 'Stock',
};

// FAB only on these top-level pages
const FAB_ROUTES = {
  '/jobs': { to: '/jobs/new', label: 'New Job' },
  '/': { to: '/jobs/new', label: 'New Job' },
};

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [profileOpen, setProfileOpen] = useState(false);

  const logout = () => {
    clearAuth();
    setProfileOpen(false);
    navigate('/login', { replace: true });
  };

  const pageTitle = TITLES[location.pathname] || (location.pathname.startsWith('/jobs/') ? 'Job Detail' : 'RefillOps');
  const fab = FAB_ROUTES[location.pathname];

  return (
    <div className="min-h-screen bg-ops-bg">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-ops-navy text-white border-r border-black/20 z-30"
        data-testid="sidebar"
      >
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-ops-red flex items-center justify-center shadow-lg shadow-red-900/30">
            <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold tracking-tight leading-none">RefillOps</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 mt-1">Plant Console</div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testid}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="side-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-ops-red"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} />
                  <span>{label === 'Home' ? 'Dashboard' : label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-md bg-ops-navy-light text-white text-xs font-bold flex items-center justify-center">
              {(user || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user || 'user'}</div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> Online
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/80 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sticky top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-ops-navy text-white">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-ops-red flex items-center justify-center shadow-md shadow-red-900/30 shrink-0">
              <Flame className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold tracking-tight text-base leading-none">
                {pageTitle}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 mt-0.5 truncate">
                RefillOps · Plant Console
              </div>
            </div>
          </Link>
          <button
            onClick={() => setProfileOpen(true)}
            data-testid="profile-btn-mobile"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 transition flex items-center justify-center text-[11px] font-bold"
          >
            {(user || 'U').slice(0, 2).toUpperCase()}
          </button>
        </div>
        {/* live status strip */}
        <div className="px-4 pb-2 flex items-center gap-2 text-[11px] text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="uppercase tracking-wider">Live</span>
          <span className="text-white/40">·</span>
          <span className="truncate">{new Date().toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto px-4 pt-3 pb-28 md:pt-6 md:pb-10 md:px-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-ops-up ops-fab-safe"
        data-testid="mobile-bottom-nav"
      >
        <div className="grid grid-cols-5 h-16">
          {NAV.map(({ to, label, icon: Icon, end, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`${testid}-mobile`}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive ? 'text-ops-navy' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-ops-navy"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} strokeWidth={2.25} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Floating action button (mobile only, only on routes that need it) */}
      <AnimatePresence>
        {fab && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={() => navigate(fab.to)}
            data-testid="fab-new-job"
            className="md:hidden fixed right-4 bottom-20 z-40 inline-flex items-center gap-1.5 pl-3.5 pr-4 h-12 rounded-full bg-ops-red text-white font-semibold text-sm shadow-ops-fab active:scale-95"
            aria-label={fab.label}
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            {fab.label}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile profile sheet */}
      <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
        <DrawerContent data-testid="profile-sheet">
          <DrawerHeader>
            <DrawerTitle>Account</DrawerTitle>
            <DrawerDescription>Signed in to RefillOps</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-ops-bg border border-slate-200">
              <div className="w-11 h-11 rounded-lg bg-ops-navy text-white text-sm font-bold flex items-center justify-center">
                {(user || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{user || 'user'}</div>
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" /> Active session
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
            </div>
          </div>
          <div className="p-4 pt-3 ops-fab-safe">
            <button
              onClick={logout}
              data-testid="logout-btn-mobile"
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-ops-red text-white font-semibold text-sm active:scale-[0.98] transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
