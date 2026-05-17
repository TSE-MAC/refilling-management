import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Package,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, formatDate, relativeTime } from '../lib/api';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../components/ui/drawer';

const TABS = [
  { k: 'inventory', label: 'Inventory' },
  { k: 'log', label: 'Movement Log' },
];

export default function Stock() {
  const [tab, setTab] = useState('inventory');
  const [parts, setParts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [q, setQ] = useState('');

  const loadParts = async () => {
    const { data } = await api.get('/spareparts');
    setParts(data);
  };
  const loadLogs = async () => {
    const { data } = await api.get('/spareparts/stocklog');
    setLogs(data);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadParts(), loadLogs()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submitAdd = async () => {
    const qty = Number(adding.qty);
    if (!qty || qty <= 0) return toast.error('Enter a positive quantity');
    try {
      await api.post(`/spareparts/${adding.part.id}/addstock`, {
        quantity: qty,
        note: adding.note || null,
      });
      toast.success(`+${qty} added to ${adding.part.name}`);
      setAdding(null);
      await Promise.all([loadParts(), loadLogs()]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    }
  };

  const filteredParts = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return parts;
    return parts.filter((p) => p.name.toLowerCase().includes(ql));
  }, [parts, q]);

  const filteredLogs = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return logs;
    return logs.filter((l) => l.partName.toLowerCase().includes(ql));
  }, [logs, q]);

  const lowCount = useMemo(() => parts.filter((p) => Number(p.currentStock) < 5).length, [parts]);
  const totalUnits = useMemo(() => parts.reduce((s, p) => s + Number(p.currentStock), 0), [parts]);

  return (
    <div>
      <div className="hidden md:flex md:items-end md:justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ops-ink">Stock</h1>
          <p className="text-sm text-slate-500 mt-0.5">Spare parts inventory & live movement log</p>
        </div>
      </div>

      {/* Summary */}
      <div className="ops-card p-3 mb-3 grid grid-cols-3 gap-2">
        <Summary label="SKUs" value={parts.length} accent="bg-blue-50 text-blue-700" />
        <Summary label="Units" value={totalUnits} accent="bg-emerald-50 text-emerald-700" mono />
        <Summary
          label="Low stock"
          value={lowCount}
          accent={lowCount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}
          mono
          alert={lowCount > 0}
        />
      </div>

      {/* Tabs */}
      <div className="relative bg-white rounded-xl border border-slate-200 p-1 mb-3 flex gap-1 shadow-ops">
        {TABS.map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              data-testid={`stock-tab-${t.k}`}
              className={`relative flex-1 h-10 rounded-lg text-sm font-semibold transition-colors z-10 ${
                active ? 'text-white' : 'text-slate-600 hover:text-ops-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="stock-tab-pill"
                  className="absolute inset-0 rounded-lg bg-ops-navy"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{t.label}</span>
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
          placeholder={tab === 'inventory' ? 'Search parts' : 'Filter log by part'}
          className="h-11 w-full pl-10 pr-3 rounded-xl bg-white border border-slate-200 shadow-ops text-sm focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
        />
      </div>

      {loading ? (
        <SkeletonList />
      ) : tab === 'inventory' ? (
        filteredParts.length === 0 ? (
          <Empty icon={Package} title="No parts" sub="No parts match your search." />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {filteredParts.map((p, i) => {
                const stock = Number(p.currentStock);
                const low = stock < 5;
                const critical = stock < 2;
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    data-testid={`stock-part-row-${p.id}`}
                    className={`ops-card flex items-stretch overflow-hidden border-l-4 ${
                      critical
                        ? 'border-red-600'
                        : low
                        ? 'border-amber-500'
                        : 'border-emerald-500'
                    }`}
                  >
                    <div className="flex-1 p-3 flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          critical
                            ? 'bg-red-50 text-red-600'
                            : low
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {low ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-ops-ink truncate">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            data-testid={`stock-status-${p.id}`}
                            className={`ops-chip ${
                              critical
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : low
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {critical ? 'Critical' : low ? 'Low' : 'OK'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Threshold &lt; 5
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-mono tabular-nums font-extrabold text-2xl leading-none ${
                            critical
                              ? 'text-red-600'
                              : low
                              ? 'text-amber-600'
                              : 'text-ops-ink'
                          }`}
                        >
                          {stock}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                          On hand
                        </div>
                      </div>
                      <button
                        onClick={() => setAdding({ part: p, qty: '', note: '' })}
                        data-testid={`stock-add-btn-${p.id}`}
                        className="ml-1 inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-ops-navy hover:bg-ops-navy-dark text-white text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )
      ) : filteredLogs.length === 0 ? (
        <Empty icon={Package} title="No movements yet" sub="Stock IN and OUT entries will appear here." />
      ) : (
        <ol className="space-y-2">
          {filteredLogs.map((l, i) => {
            const isIn = l.type === 'in';
            return (
              <motion.li
                key={l.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: i * 0.015 }}
                data-testid={`stock-log-row-${l.id}`}
                className="ops-card p-3 flex items-center gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isIn ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                  }`}
                >
                  {isIn ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-ops-ink truncate text-sm">
                      {l.partName}
                    </span>
                    <span
                      className={`ops-chip ${
                        isIn
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {isIn ? 'Stock IN' : 'Stock OUT'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {l.note ? l.note : l.jobId ? `Job ref · #${l.jobId.slice(0, 8)}` : 'No note'}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono tabular-nums font-extrabold text-base leading-none ${
                      isIn ? 'text-emerald-700' : 'text-orange-700'
                    }`}
                  >
                    {isIn ? '+' : '−'}
                    {l.quantity}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                    {relativeTime(l.date)}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {/* Add stock drawer */}
      <Drawer open={!!adding} onOpenChange={(o) => !o && setAdding(null)}>
        <DrawerContent data-testid="add-stock-dialog">
          <DrawerHeader>
            <DrawerTitle>Add stock · {adding?.part?.name}</DrawerTitle>
            <DrawerDescription>
              Current on hand: <span className="font-bold text-ops-ink">{adding?.part?.currentStock}</span>
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Quantity to add
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold pointer-events-none">
                  +
                </span>
                <input
                  type="number"
                  min="1"
                  value={adding?.qty || ''}
                  onChange={(e) => setAdding((s) => ({ ...s, qty: e.target.value }))}
                  data-testid="add-stock-qty-input"
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-base font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[1, 5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setAdding((s) => ({ ...s, qty: String(n) }))}
                    className="px-3 h-8 rounded-md bg-ops-bg hover:bg-slate-200 text-xs font-bold text-ops-ink"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Note (optional)
              </div>
              <input
                value={adding?.note || ''}
                onChange={(e) => setAdding((s) => ({ ...s, note: e.target.value }))}
                data-testid="add-stock-note-input"
                placeholder="e.g. Bought from supplier"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
              />
            </div>
          </div>
          <DrawerFooter className="grid grid-cols-2 gap-2 ops-fab-safe">
            <button
              onClick={() => setAdding(null)}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-ops-ink font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={submitAdd}
              data-testid="add-stock-submit-btn"
              className="h-12 rounded-xl bg-ops-navy hover:bg-ops-navy-dark text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Stock
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Summary({ label, value, accent, mono, alert }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center shrink-0`}>
        {alert ? <AlertTriangle className="w-4 h-4" /> : <Package className="w-4 h-4" />}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
        <div className={`text-sm font-extrabold text-ops-ink truncate ${mono ? 'font-mono tabular-nums' : 'font-display'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, sub }) {
  return (
    <div className="ops-card p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ops-bg mx-auto flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <div className="mt-3 font-display font-bold text-ops-ink">{title}</div>
      <p className="text-sm text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="ops-card h-16" />
      ))}
    </div>
  );
}
