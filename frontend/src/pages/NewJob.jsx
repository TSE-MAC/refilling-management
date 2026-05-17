import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Flame, Wrench, IndianRupee, ChevronDown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, EXT_TYPES, EXT_SIZES, formatDate, formatINR, EXT_ACCENT } from '../lib/api';

const emptyExt = () => ({
  type: 'CO2',
  size: EXT_SIZES.CO2.sizes[0],
  unit: EXT_SIZES.CO2.unit,
  quantity: 1,
});
const emptyPart = () => ({ partId: '', partName: '', quantityUsed: 1 });

export default function NewJob() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [exts, setExts] = useState([emptyExt()]);
  const [parts, setParts] = useState([]);
  const [delivery, setDelivery] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/parties').then((r) => setParties(r.data)).catch(() => {});
    api.get('/spareparts').then((r) => setSpareParts(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = partyName.trim().toLowerCase();
    if (!q) return parties.slice(0, 6);
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [parties, partyName]);

  const totalQty = useMemo(
    () => exts.reduce((s, e) => s + Number(e.quantity || 0), 0),
    [exts]
  );

  const updateExt = (i, patch) => {
    setExts((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e, ...patch };
        if (patch.type && patch.type !== e.type) {
          next.unit = EXT_SIZES[patch.type].unit;
          next.size = EXT_SIZES[patch.type].sizes[0];
        }
        return next;
      })
    );
  };

  const updatePart = (i, patch) => {
    setParts((prev) =>
      prev.map((p, idx) => {
        if (idx !== i) return p;
        const next = { ...p, ...patch };
        if (patch.partId) {
          const sp = spareParts.find((x) => x.id === patch.partId);
          next.partName = sp?.name || '';
        }
        return next;
      })
    );
  };

  const save = async () => {
    if (!partyName.trim()) return toast.error('Enter company name');
    if (exts.length === 0) return toast.error('Add at least one extinguisher');
    for (const e of exts) {
      if (!e.type || !e.size || !e.quantity || Number(e.quantity) <= 0)
        return toast.error('Fill all extinguisher rows');
    }
    for (const p of parts) {
      if (!p.partId || Number(p.quantityUsed) <= 0)
        return toast.error('Fill all spare part rows or remove them');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/jobs', {
        partyName: partyName.trim(),
        partyId: partyId || null,
        extinguishers: exts.map((e) => ({
          type: e.type,
          size: String(e.size),
          unit: e.unit,
          quantity: Number(e.quantity),
        })),
        spareParts: parts.map((p) => ({
          partId: p.partId,
          partName: p.partName,
          quantityUsed: Number(p.quantityUsed),
        })),
        deliveryCharge: Number(delivery || 0),
      });
      toast.success('Job created');
      navigate(`/jobs/${data.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="md:flex md:items-end md:justify-between mb-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="hidden md:inline-flex items-center gap-1 text-sm text-slate-600 hover:text-ops-ink mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="hidden md:block font-display text-3xl font-extrabold tracking-tight text-ops-ink">
            New Job
          </h1>
          <p className="hidden md:block text-sm text-slate-500 mt-0.5">
            Log incoming extinguishers and spare parts used.
          </p>
        </div>
        <div className="md:hidden flex items-center gap-2 mb-1">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Step · Single form</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Company section */}
        <FormCard
          title="Company"
          icon={<Building />}
          subtitle="Type a name or pick from previous parties. Walk-ins allowed."
        >
          <div className="relative">
            <input
              value={partyName}
              onChange={(e) => {
                setPartyName(e.target.value);
                setPartyId(null);
                setShowSuggest(true);
              }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              data-testid="newjob-party-input"
              placeholder="e.g. Acme Industries"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
            />
            <AnimatePresence>
              {showSuggest && filtered.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-ops-lg max-h-60 overflow-auto"
                >
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPartyName(p.name);
                        setPartyId(p.id);
                        setShowSuggest(false);
                      }}
                      data-testid={`newjob-party-suggest-${p.id}`}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <div className="font-semibold text-ops-ink">{p.name}</div>
                      {p.phone && <div className="text-xs text-slate-500 font-mono">{p.phone}</div>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Date:{' '}
              <span className="font-semibold text-ops-ink">{formatDate(new Date().toISOString())}</span>
            </span>
            {partyId && (
              <span className="ops-chip bg-emerald-50 text-emerald-700">Existing party</span>
            )}
            {!partyId && partyName.trim().length > 0 && (
              <span className="ops-chip bg-amber-50 text-amber-700">Walk-in</span>
            )}
          </div>
        </FormCard>

        {/* Extinguishers section */}
        <FormCard
          title="Extinguishers"
          icon={<Flame className="w-4 h-4" />}
          subtitle={`Total qty: ${totalQty} · ${exts.length} ${exts.length === 1 ? 'row' : 'rows'}`}
          action={
            <button
              type="button"
              onClick={() => setExts((p) => [...p, emptyExt()])}
              data-testid="add-extinguisher-row-btn"
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-ops-bg hover:bg-slate-200 text-ops-ink text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" /> Row
            </button>
          }
        >
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {exts.map((e, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <div className="flex">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: EXT_ACCENT[e.type] }} />
                    <div className="flex-1 p-2.5 grid grid-cols-12 gap-2 items-center">
                      <NativeSelect
                        className="col-span-5 sm:col-span-3"
                        value={e.type}
                        onChange={(v) => updateExt(i, { type: v })}
                        options={EXT_TYPES.map((t) => ({ v: t, l: t }))}
                        testid={`ext-type-${i}`}
                      />
                      <NativeSelect
                        className="col-span-4 sm:col-span-3"
                        value={e.size}
                        onChange={(v) => updateExt(i, { size: v })}
                        options={EXT_SIZES[e.type].sizes.map((s) => ({ v: s, l: s }))}
                        testid={`ext-size-${i}`}
                      />
                      <div
                        className="col-span-3 sm:col-span-2 h-10 rounded-lg bg-ops-bg border border-slate-200 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-ops-ink"
                        data-testid={`ext-unit-${i}`}
                      >
                        {e.unit}
                      </div>
                      <div className="col-span-9 sm:col-span-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={e.quantity}
                            onChange={(ev) => updateExt(i, { quantity: ev.target.value })}
                            data-testid={`ext-qty-${i}`}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-12 text-sm font-mono tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-slate-400 font-bold pointer-events-none">
                            QTY
                          </span>
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setExts((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          disabled={exts.length === 1}
                          data-testid={`ext-delete-${i}`}
                          className="w-10 h-10 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </FormCard>

        {/* Spare Parts section */}
        <FormCard
          title="Spare Parts Used"
          icon={<Wrench className="w-4 h-4" />}
          subtitle="Optional · deducted from stock on dispatch"
          action={
            <button
              type="button"
              onClick={() => setParts((p) => [...p, emptyPart()])}
              data-testid="add-part-row-btn"
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-ops-bg hover:bg-slate-200 text-ops-ink text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" /> Row
            </button>
          }
        >
          {parts.length === 0 ? (
            <div className="text-sm text-slate-500 italic px-3 py-4 border border-dashed border-slate-200 rounded-xl text-center">
              No spare parts added yet.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {parts.map((p, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 grid grid-cols-12 gap-2 items-center"
                  >
                    <NativeSelect
                      className="col-span-9 sm:col-span-8"
                      value={p.partId}
                      onChange={(v) => updatePart(i, { partId: v })}
                      options={[
                        { v: '', l: 'Select part…' },
                        ...spareParts.map((sp) => ({
                          v: sp.id,
                          l: `${sp.name} · stock ${sp.currentStock}`,
                        })),
                      ]}
                      testid={`part-select-${i}`}
                    />
                    <input
                      type="number"
                      min="1"
                      value={p.quantityUsed}
                      onChange={(ev) => updatePart(i, { quantityUsed: ev.target.value })}
                      data-testid={`part-qty-${i}`}
                      className="col-span-9 sm:col-span-3 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                    />
                    <button
                      type="button"
                      onClick={() => setParts((prev) => prev.filter((_, idx) => idx !== i))}
                      data-testid={`part-delete-${i}`}
                      className="col-span-3 sm:col-span-1 w-10 h-10 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center justify-self-end"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </FormCard>

        {/* Delivery section */}
        <FormCard
          title="Delivery Charge"
          icon={<IndianRupee className="w-4 h-4" />}
          subtitle="Cost owner pays to deliver this job"
        >
          <div className="relative max-w-xs">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              min="0"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              data-testid="newjob-delivery-input"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
            />
          </div>
        </FormCard>
      </div>

      {/* Sticky save bar */}
      <div className="fixed left-0 right-0 bottom-16 md:bottom-0 md:left-60 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-ops-up ops-fab-safe">
        <div className="max-w-6xl mx-auto pl-4 pr-4 md:pl-8 md:pr-44 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="font-mono tabular-nums font-bold text-ops-ink">{totalQty}</span> ext ·{' '}
            <span className="font-mono tabular-nums font-bold text-ops-ink">{parts.length}</span> parts ·{' '}
            <span className="font-mono tabular-nums font-bold text-ops-ink">
              {formatINR(delivery)}
            </span>{' '}
            delivery
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={save}
            disabled={saving}
            data-testid="save-job-btn"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-ops-navy hover:bg-ops-navy-dark disabled:opacity-60 text-white text-sm font-bold transition-colors"
          >
            {saving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Job
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function FormCard({ title, icon, subtitle, action, children }) {
  return (
    <section className="ops-card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-ops-bg/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-ops-navy">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-ops-ink text-sm">{title}</div>
            {subtitle && (
              <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function NativeSelect({ value, onChange, options, className = '', testid }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="appearance-none h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Building() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 22V12h6v10" />
      <path d="M7 7h.01M12 7h.01M17 7h.01" />
    </svg>
  );
}
