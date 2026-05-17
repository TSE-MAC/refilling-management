import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Search, X, Filter, History as HistoryIcon, Truck, IndianRupee, ChevronDown } from 'lucide-react';
import {
  api,
  formatDate,
  formatINR,
  totalExt,
  totalParts,
  relativeTime,
} from '../lib/api';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '../components/ui/drawer';

export default function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');

  useEffect(() => {
    api
      .get('/jobs', { params: { status: 'dispatched' } })
      .then((r) => setJobs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : null;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : null;
    return jobs.filter((j) => {
      if (qLower && !j.partyName.toLowerCase().includes(qLower)) return false;
      const t = j.dispatchedAt ? new Date(j.dispatchedAt).getTime() : 0;
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      return true;
    });
  }, [jobs, q, from, to]);

  const totalDelivery = filtered.reduce((s, j) => s + Number(j.deliveryCharge || 0), 0);
  const totalExtCount = filtered.reduce((s, j) => s + totalExt(j), 0);

  const activeFilters = [q && 'company', from && 'from', to && 'to'].filter(Boolean).length;

  const clear = () => {
    setQ('');
    setFrom('');
    setTo('');
    setSearchParams({});
  };

  return (
    <div>
      <div className="hidden md:flex md:items-end md:justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ops-ink">History</h1>
          <p className="text-sm text-slate-500 mt-0.5">Archive of all dispatched jobs · filterable</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="ops-card p-3 mb-3 grid grid-cols-3 gap-2">
        <SummaryStat label="Jobs" value={filtered.length} icon={HistoryIcon} accent="text-blue-700 bg-blue-50" />
        <SummaryStat label="Extinguishers" value={totalExtCount} icon={Truck} accent="text-orange-700 bg-orange-50" />
        <SummaryStat
          label="Delivery (Total)"
          value={formatINR(totalDelivery)}
          icon={IndianRupee}
          accent="text-emerald-700 bg-emerald-50"
          mono
        />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="history-search-input"
            placeholder="Search company"
            className="h-11 w-full pl-10 pr-3 rounded-xl bg-white border border-slate-200 shadow-ops text-sm focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          data-testid="history-filter-btn"
          className="relative inline-flex items-center gap-1.5 h-11 px-3 rounded-xl bg-white border border-slate-200 shadow-ops text-sm font-semibold text-ops-ink active:scale-[0.97]"
        >
          <Filter className="w-4 h-4" /> Filters
          {activeFilters > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-ops-red text-white text-[10px] font-bold">
              {activeFilters}
            </span>
          )}
        </button>
        {activeFilters > 0 && (
          <button
            onClick={clear}
            data-testid="history-clear-btn"
            className="inline-flex items-center gap-1 h-11 px-3 rounded-xl bg-white border border-slate-200 shadow-ops text-sm text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {(from || to || q) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {q && <Chip label={`Company: ${q}`} onClear={() => setQ('')} />}
          {from && <Chip label={`From ${from}`} onClear={() => setFrom('')} />}
          {to && <Chip label={`To ${to}`} onClear={() => setTo('')} />}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <div className="ops-card p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ops-bg mx-auto flex items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div className="mt-3 font-display font-bold text-ops-ink">No matching jobs</div>
          <p className="text-sm text-slate-500 mt-0.5">Try adjusting the filters.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden space-y-2.5">
            <AnimatePresence initial={false}>
              {filtered.map((j, i) => (
                <motion.li
                  key={j.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, delay: i * 0.02 }}
                  data-testid={`history-row-${j.id}`}
                  className="ops-card border-l-4 border-emerald-500 p-3.5 flex items-center gap-3 active:scale-[0.99] transition"
                  onClick={() => navigate(`/jobs/${j.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-ops-ink truncate">{j.partyName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatDate(j.dispatchedAt)} · {relativeTime(j.dispatchedAt)}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-600">
                      <span>
                        <span className="font-mono font-bold text-ops-ink tabular-nums">{totalExt(j)}</span> ext
                      </span>
                      <span>
                        <span className="font-mono font-bold text-ops-ink tabular-nums">{totalParts(j)}</span> parts
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-emerald-700 tabular-nums text-base">
                      {formatINR(j.deliveryCharge)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                      Delivery
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-ops">
            <table className="w-full text-sm">
              <thead className="bg-ops-bg border-b border-slate-200 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Dispatched</th>
                  <th className="px-4 py-3 text-right">Ext.</th>
                  <th className="px-4 py-3 text-right">Parts</th>
                  <th className="px-4 py-3 text-right">Delivery</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr key={j.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-ops-ink">{j.partyName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(j.dispatchedAt)}
                      <span className="text-xs text-slate-400 ml-2">({relativeTime(j.dispatchedAt)})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{totalExt(j)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{totalParts(j)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                      {formatINR(j.deliveryCharge)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/jobs/${j.id}`)}
                        data-testid={`history-view-${j.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-ops-navy hover:text-ops-navy-dark"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-between items-center text-xs text-slate-600">
            <div data-testid="history-summary-count">
              Showing <span className="font-bold text-ops-ink">{filtered.length}</span> jobs
            </div>
            <div data-testid="history-summary-total">
              Total delivery:{' '}
              <span className="font-mono tabular-nums font-bold text-ops-ink">{formatINR(totalDelivery)}</span>
            </div>
          </div>
        </>
      )}

      {/* Filter drawer */}
      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Dispatches</DrawerTitle>
            <DrawerDescription>Narrow down by company or dispatch date range.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <FilterField label="Company">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
              />
            </FilterField>
            <div className="grid grid-cols-2 gap-2">
              <FilterField label="From">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  data-testid="history-from-input"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                />
              </FilterField>
              <FilterField label="To">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  data-testid="history-to-input"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                />
              </FilterField>
            </div>
          </div>
          <DrawerFooter className="grid grid-cols-2 gap-2 ops-fab-safe">
            <button
              onClick={() => {
                clear();
                setFilterOpen(false);
              }}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-ops-ink font-semibold text-sm"
            >
              Clear all
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              className="h-12 rounded-xl bg-ops-navy hover:bg-ops-navy-dark text-white font-semibold text-sm"
            >
              Apply
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Chip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-ops-navy/10 text-ops-navy">
      {label}
      <button onClick={onClear} className="hover:bg-ops-navy/20 rounded-full p-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function SummaryStat({ label, value, icon: Icon, accent, mono }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
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

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ops-card h-20 p-3">
          <div className="skeleton h-4 w-32 mb-2" />
          <div className="skeleton h-3 w-48" />
        </div>
      ))}
    </div>
  );
}
