import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Truck,
  Eye,
  ClipboardList,
  Flame,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, formatINR, relativeTime, totalExt, ageDays, EXT_ACCENT } from '../lib/api';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../components/ui/drawer';

const TABS = [
  { k: 'active', label: 'Active', accent: 'bg-blue-500' },
  { k: 'dispatched', label: 'Dispatched', accent: 'bg-emerald-500' },
];

export default function Jobs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs', { params: { status: tab } });
      setJobs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [tab]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (!qLower) return jobs;
    return jobs.filter((j) => j.partyName.toLowerCase().includes(qLower));
  }, [jobs, q]);

  const dispatch = async () => {
    const id = confirm?.id;
    setConfirm(null);
    try {
      await api.post(`/jobs/${id}/dispatch`);
      toast.success('Dispatched · stock updated');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to dispatch');
    }
  };

  return (
    <div>
      {/* Page top (desktop) */}
      <div className="hidden md:flex md:items-end md:justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ops-ink">Jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operational queue · active and dispatched</p>
        </div>
        <button
          onClick={() => navigate('/jobs/new')}
          data-testid="jobs-new-btn"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ops-navy hover:bg-ops-navy-dark text-white text-sm font-semibold active:scale-[0.97] transition"
        >
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Tabs */}
      <div className="relative bg-white rounded-xl border border-slate-200 p-1 mb-3 flex gap-1 shadow-ops">
        {TABS.map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              data-testid={`job-${t.k}-tab`}
              className={`relative flex-1 h-10 rounded-lg text-sm font-semibold transition-colors z-10 ${
                active ? 'text-white' : 'text-slate-600 hover:text-ops-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="jobs-tab-pill"
                  className="absolute inset-0 rounded-lg bg-ops-navy"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${t.accent}`} />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="jobs-search-input"
          placeholder="Filter by company name"
          className="h-11 w-full pl-10 pr-4 rounded-xl bg-white border border-slate-200 shadow-ops text-sm focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
        />
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} hasQuery={!!q.trim()} onNew={() => navigate('/jobs/new')} />
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filtered.map((j, i) => (
              <JobCard
                key={j.id}
                job={j}
                index={i}
                isActive={tab === 'active'}
                onView={() => navigate(`/jobs/${j.id}`)}
                onDispatch={() => setConfirm(j)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Dispatch confirm drawer */}
      <Drawer open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DrawerContent data-testid="dispatch-confirm-dialog">
          <DrawerHeader>
            <DrawerTitle>Mark this job as dispatched?</DrawerTitle>
            <DrawerDescription>
              Spare parts used will be deducted from current stock and a stock-out log will be
              recorded. This cannot be undone.
            </DrawerDescription>
          </DrawerHeader>
          {confirm && (
            <div className="px-4 pb-2">
              <div className="rounded-xl border border-slate-200 bg-ops-bg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-ops-navy" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ops-ink truncate">{confirm.partyName}</div>
                  <div className="text-xs text-slate-500">
                    {totalExt(confirm)} extinguishers · {formatINR(confirm.deliveryCharge)} delivery
                  </div>
                </div>
              </div>
            </div>
          )}
          <DrawerFooter className="grid grid-cols-2 gap-2 ops-fab-safe">
            <button
              onClick={() => setConfirm(null)}
              data-testid="dispatch-cancel-btn"
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-ops-ink font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={dispatch}
              data-testid="dispatch-confirm-btn"
              className="h-12 rounded-xl bg-ops-navy hover:bg-ops-navy-dark text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5"
            >
              <Truck className="w-4 h-4" /> Confirm Dispatch
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function JobCard({ job, index, isActive, onView, onDispatch }) {
  const primaryExt = (job.extinguishers || [])[0];
  const age = ageDays(job.createdAt);
  const aged = age >= 3 && isActive;
  const today = age <= 0;
  const accentColor = primaryExt ? EXT_ACCENT[primaryExt.type] : '#224b7a';

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, delay: index * 0.025 }}
      data-testid={`job-card-${job.id}`}
      className="ops-card overflow-hidden flex"
    >
      <div
        className="w-1.5 shrink-0"
        style={{ backgroundColor: aged ? '#dc2626' : isActive ? accentColor : '#16a34a' }}
      />
      <div className="flex-1 p-3.5 min-w-0">
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-display font-bold text-ops-ink truncate text-[15px]">
                {job.partyName}
              </div>
              {aged && (
                <span className="ops-chip bg-red-50 text-red-700 border border-red-200">Aged · {age}d</span>
              )}
              {today && isActive && (
                <span className="ops-chip bg-blue-50 text-blue-700">Today</span>
              )}
              {!isActive && (
                <span className="ops-chip bg-emerald-50 text-emerald-700">Dispatched</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {isActive ? 'Created' : 'Dispatched'} {relativeTime(isActive ? job.createdAt : job.dispatchedAt)}
              {primaryExt && (
                <>
                  {' · '}
                  <span className="font-semibold text-ops-ink">
                    {primaryExt.type} {primaryExt.size}
                    {primaryExt.unit}
                  </span>
                  {job.extinguishers.length > 1 && (
                    <span className="text-slate-400"> +{job.extinguishers.length - 1} more</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <Metric label="Ext." value={totalExt(job)} />
            <Metric label="Delivery" value={formatINR(job.deliveryCharge)} mono />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onView}
              data-testid={`job-view-btn-${job.id}`}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 active:scale-[0.97] text-sm font-semibold text-ops-ink transition"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            {isActive && (
              <button
                onClick={onDispatch}
                data-testid={`job-dispatch-btn-${job.id}`}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-ops-navy hover:bg-ops-navy-dark text-white text-sm font-semibold active:scale-[0.97] transition"
              >
                <Truck className="w-3.5 h-3.5" /> Dispatch
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function Metric({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
      <div className={`text-base font-bold text-ops-ink leading-none mt-0.5 ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ops-card h-24 p-3">
          <div className="skeleton h-4 w-32 mb-2" />
          <div className="skeleton h-3 w-48 mb-3" />
          <div className="flex gap-3">
            <div className="skeleton h-7 w-16" />
            <div className="skeleton h-7 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab, hasQuery, onNew }) {
  return (
    <div className="ops-card p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ops-bg mx-auto flex items-center justify-center">
        <ClipboardList className="w-6 h-6 text-slate-400" />
      </div>
      <div className="mt-3 font-display font-bold text-ops-ink">
        {hasQuery ? 'No matches' : tab === 'active' ? 'No active jobs' : 'No dispatched jobs yet'}
      </div>
      <p className="text-sm text-slate-500 mt-0.5">
        {hasQuery
          ? 'Try a different search term.'
          : tab === 'active'
          ? 'Create your first job to begin tracking extinguishers.'
          : 'Once you dispatch active jobs, they appear here.'}
      </p>
      {tab === 'active' && !hasQuery && (
        <button
          onClick={onNew}
          data-testid="empty-new-job-btn"
          className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ops-navy hover:bg-ops-navy-dark text-white text-sm font-semibold active:scale-[0.97] transition"
        >
          <Plus className="w-4 h-4" /> Create First Job
        </button>
      )}
    </div>
  );
}
