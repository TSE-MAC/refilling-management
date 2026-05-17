import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Flame,
  AlertTriangle,
  IndianRupee,
  Plus,
  ArrowUpRight,
  Truck,
  Package,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Users,
} from 'lucide-react';
import { api, formatINR, greeting, relativeTime, totalExt, ageDays } from '../lib/api';
import Section from '../components/Section';
import AnimatedNumber from '../components/AnimatedNumber';

const STATS = [
  {
    key: 'activeJobs',
    label: 'Active Jobs',
    icon: ClipboardList,
    color: '#224b7a',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    testid: 'stat-active-jobs',
  },
  {
    key: 'extinguishersInShop',
    label: 'Ext. in Shop',
    icon: Flame,
    color: '#dc2626',
    bg: 'bg-red-50',
    text: 'text-red-700',
    testid: 'stat-extinguishers',
  },
  {
    key: 'lowStockParts',
    label: 'Low Stock',
    icon: AlertTriangle,
    color: '#d97706',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    testid: 'stat-low-stock',
  },
  {
    key: 'monthlyDeliveryCost',
    label: 'Delivery (Mo.)',
    icon: IndianRupee,
    color: '#16a34a',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    testid: 'stat-monthly-delivery',
    money: true,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [parts, setParts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dispatched, setDispatched] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/jobs', { params: { status: 'active' } }),
      api.get('/jobs', { params: { status: 'dispatched' } }),
      api.get('/spareparts'),
      api.get('/spareparts/stocklog'),
    ])
      .then(([s, aj, dj, sp, sl]) => {
        setStats(s.data);
        setActiveJobs(aj.data);
        setDispatched(dj.data);
        setParts(sp.data);
        setLogs(sl.data);
      })
      .catch(() => {});
  }, []);

  const lowStock = useMemo(() => parts.filter((p) => Number(p.currentStock) < 5), [parts]);
  const awaiting = useMemo(
    () =>
      [...activeJobs]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, 4),
    [activeJobs]
  );
  const activity = useMemo(() => {
    const items = [];
    dispatched.slice(0, 5).forEach((j) => {
      items.push({
        kind: 'dispatch',
        date: j.dispatchedAt,
        title: `Dispatched · ${j.partyName}`,
        sub: `${totalExt(j)} ext · ${formatINR(j.deliveryCharge)}`,
        id: `disp-${j.id}`,
        onClick: () => navigate(`/jobs/${j.id}`),
      });
    });
    logs.slice(0, 8).forEach((l) => {
      items.push({
        kind: l.type === 'in' ? 'stock-in' : 'stock-out',
        date: l.date,
        title: `${l.type === 'in' ? 'Stock IN' : 'Stock OUT'} · ${l.partName}`,
        sub: l.note || (l.type === 'out' ? `Used in dispatch` : 'Restocked'),
        qty: l.quantity,
        id: `log-${l.id}`,
        onClick: () => navigate('/stock'),
      });
    });
    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [dispatched, logs, navigate]);

  const now = new Date();

  return (
    <div>
      {/* Greeting card (mobile + desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-5 rounded-2xl bg-gradient-to-br from-ops-navy via-ops-navy to-ops-navy-light text-white p-4 sm:p-5 overflow-hidden relative"
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[10px] uppercase tracking-wider font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> Live
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{greeting()}</div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
          Plant Operations Console
        </h1>
        <p className="text-sm text-white/70 mt-1">
          {now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>

        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => navigate('/jobs/new')}
            data-testid="new-job-btn"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-ops-red hover:bg-red-700 active:scale-[0.97] transition text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New Job
          </button>
          <button
            onClick={() => navigate('/jobs')}
            data-testid="goto-jobs-btn"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-[0.97] transition text-sm font-semibold"
          >
            View Jobs <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          const value = stats?.[s.key] ?? 0;
          return (
            <motion.div
              key={s.key}
              data-testid={s.testid}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="ops-card p-3 sm:p-3.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.text} flex items-center justify-center`}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} />
                </div>
                {s.key === 'lowStockParts' && value > 0 && (
                  <span className="ops-chip bg-red-50 text-red-700 border border-red-200">
                    Alert
                  </span>
                )}
                {s.key === 'activeJobs' && value > 0 && (
                  <span className="ops-chip bg-blue-50 text-blue-700">In shop</span>
                )}
              </div>
              <div className="font-display text-2xl font-extrabold text-ops-ink leading-none">
                {s.money ? (
                  <AnimatedNumber value={value} prefix="₹" />
                ) : (
                  <AnimatedNumber value={value} />
                )}
              </div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mt-1.5">
                {s.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Awaiting dispatch */}
      <Section
        title="Awaiting Dispatch"
        count={awaiting.length}
        action={
          <button
            onClick={() => navigate('/jobs')}
            className="text-[11px] font-bold uppercase tracking-wider text-ops-navy-light hover:text-ops-navy inline-flex items-center gap-0.5"
          >
            See all <ChevronRight className="w-3 h-3" />
          </button>
        }
      >
        {awaiting.length === 0 ? (
          <EmptyRow
            icon={Truck}
            title="Shop is clear"
            sub="No jobs currently waiting to be dispatched."
          />
        ) : (
          <div className="space-y-2">
            {awaiting.map((j) => {
              const age = ageDays(j.createdAt);
              const urgent = age >= 3;
              return (
                <motion.button
                  key={j.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/jobs/${j.id}`)}
                  data-testid={`dashboard-job-${j.id}`}
                  className="w-full text-left ops-card pl-3 pr-3 py-3 flex items-center gap-3 hover:border-ops-navy-light/40 hover:shadow-ops-lg transition border-l-4"
                  style={{ borderLeftColor: urgent ? '#dc2626' : '#224b7a' }}
                >
                  <div className="w-10 h-10 rounded-lg bg-ops-bg flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 text-ops-navy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ops-ink truncate">{j.partyName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono tabular-nums">{totalExt(j)} ext</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{relativeTime(j.createdAt)}</span>
                      {urgent && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-red-600 font-bold uppercase tracking-wider text-[10px]">
                            Aged
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-ops-ink tabular-nums text-sm">
                      {formatINR(j.deliveryCharge)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                      Delivery
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Low stock + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Section
            title="Low Stock Warnings"
            count={lowStock.length}
            action={
              <button
                onClick={() => navigate('/stock')}
                className="text-[11px] font-bold uppercase tracking-wider text-ops-navy-light hover:text-ops-navy inline-flex items-center gap-0.5"
              >
                Manage <ChevronRight className="w-3 h-3" />
              </button>
            }
          >
            {lowStock.length === 0 ? (
              <EmptyRow icon={Package} title="All stock healthy" sub="No parts under threshold (<5)." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lowStock.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`dashboard-lowstock-${p.id}`}
                    className="ops-card p-3 flex items-center gap-3 border-l-4 border-red-500"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <AlertTriangle className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ops-ink text-sm truncate">{p.name}</div>
                      <div className="text-[11px] text-red-600 font-semibold uppercase tracking-wider">
                        Threshold breach
                      </div>
                    </div>
                    <div className="font-mono font-extrabold text-red-600 tabular-nums text-lg">
                      {p.currentStock}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div>
          <Section title="Quick Actions">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <QuickAction
                onClick={() => navigate('/jobs/new')}
                icon={Plus}
                label="New Job"
                accent="bg-ops-red text-white"
                testid="qa-newjob"
              />
              <QuickAction
                onClick={() => navigate('/stock')}
                icon={Package}
                label="Add Stock"
                testid="qa-stock"
              />
              <QuickAction
                onClick={() => navigate('/parties')}
                icon={Users}
                label="Add Party"
                testid="qa-party"
              />
              <QuickAction
                onClick={() => navigate('/history')}
                icon={ClipboardList}
                label="View History"
                testid="qa-history"
              />
            </div>
          </Section>
        </div>
      </div>

      {/* Recent Activity */}
      <Section
        title="Recent Activity"
        count={activity.length}
        action={
          <button
            onClick={() => navigate('/stock')}
            className="text-[11px] font-bold uppercase tracking-wider text-ops-navy-light hover:text-ops-navy inline-flex items-center gap-0.5"
          >
            Stock log <ChevronRight className="w-3 h-3" />
          </button>
        }
      >
        {activity.length === 0 ? (
          <EmptyRow icon={ClipboardList} title="No activity yet" sub="Dispatches and stock movements will show up here." />
        ) : (
          <ol className="ops-card divide-y divide-slate-100">
            {activity.map((a) => {
              const isOut = a.kind === 'stock-out';
              const isIn = a.kind === 'stock-in';
              const isDisp = a.kind === 'dispatch';
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={a.onClick}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isDisp
                        ? 'bg-emerald-50 text-emerald-700'
                        : isIn
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isDisp ? <Truck className="w-4 h-4" /> : isIn ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ops-ink truncate">{a.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{a.sub}</div>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">
                    {relativeTime(a.date)}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, accent = 'bg-white text-ops-ink', testid }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      data-testid={testid}
      className={`w-full ops-card px-3 py-3 flex items-center gap-2.5 hover:shadow-ops-lg transition text-left`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          accent === 'bg-ops-red text-white' ? 'bg-ops-red text-white' : 'bg-ops-bg text-ops-navy'
        }`}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} />
      </div>
      <span className="font-semibold text-sm text-ops-ink">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
    </motion.button>
  );
}

function EmptyRow({ icon: Icon, title, sub }) {
  return (
    <div className="ops-card p-5 text-center">
      <div className="w-10 h-10 rounded-xl bg-ops-bg mx-auto flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="mt-2.5 text-sm font-semibold text-ops-ink">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}
