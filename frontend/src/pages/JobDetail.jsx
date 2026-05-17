import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Save,
  Truck,
  ArrowLeft,
  Flame,
  Wrench,
  IndianRupee,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  EXT_TYPES,
  EXT_SIZES,
  formatDate,
  formatINR,
  EXT_ACCENT,
  relativeTime,
  totalExt,
} from '../lib/api';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../components/ui/drawer';

const emptyExt = () => ({ type: 'CO2', size: '1', unit: 'kg', quantity: 1 });

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDispatch, setConfirmDispatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [j, sp] = await Promise.all([api.get(`/jobs/${id}`), api.get('/spareparts')]);
      setJob(j.data);
      setSpareParts(sp.data);
    } catch {
      toast.error('Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  if (loading || !job) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  const readonly = job.status === 'dispatched';

  const setField = (patch) => setJob((j) => ({ ...j, ...patch }));
  const setExt = (i, patch) =>
    setJob((j) => ({
      ...j,
      extinguishers: j.extinguishers.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e, ...patch };
        if (patch.type && patch.type !== e.type) {
          next.unit = EXT_SIZES[patch.type].unit;
          next.size = EXT_SIZES[patch.type].sizes[0];
        }
        return next;
      }),
    }));
  const setPart = (i, patch) =>
    setJob((j) => ({
      ...j,
      spareParts: j.spareParts.map((p, idx) => {
        if (idx !== i) return p;
        const next = { ...p, ...patch };
        if (patch.partId) {
          const sp = spareParts.find((x) => x.id === patch.partId);
          next.partName = sp?.name || '';
        }
        return next;
      }),
    }));

  const save = async () => {
    if (!job.partyName.trim()) return toast.error('Company name required');
    if (!job.extinguishers?.length) return toast.error('At least one extinguisher required');
    setSaving(true);
    try {
      const { data } = await api.put(`/jobs/${id}`, {
        partyName: job.partyName.trim(),
        partyId: job.partyId,
        extinguishers: job.extinguishers.map((e) => ({
          type: e.type,
          size: String(e.size),
          unit: e.unit,
          quantity: Number(e.quantity),
        })),
        spareParts: (job.spareParts || []).map((p) => ({
          partId: p.partId,
          partName: p.partName,
          quantityUsed: Number(p.quantityUsed),
        })),
        deliveryCharge: Number(job.deliveryCharge || 0),
      });
      setJob(data);
      toast.success('Changes saved');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const doDispatch = async () => {
    setConfirmDispatch(false);
    try {
      const { data } = await api.post(`/jobs/${id}/dispatch`);
      setJob(data);
      toast.success('Dispatched · stock updated');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to dispatch');
    }
  };

  return (
    <div className={readonly ? '' : 'pb-24'}>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        data-testid="job-detail-back-btn"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-ops-ink mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header card */}
      <div
        className={`relative overflow-hidden rounded-2xl text-white p-4 sm:p-5 mb-4 ${
          readonly
            ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900'
            : 'bg-gradient-to-br from-ops-navy via-ops-navy to-ops-navy-light'
        }`}
      >
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/70 font-bold">
              {readonly ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Dispatched
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" /> Active job
                </>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 truncate">
              {job.partyName}
            </h1>
            <div className="text-xs text-white/70 mt-1 flex items-center gap-2 flex-wrap">
              <span>Created {formatDate(job.createdAt)}</span>
              {readonly && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span>Dispatched {relativeTime(job.dispatchedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <HeaderStat label="Extinguishers" value={totalExt(job)} />
          <HeaderStat label="Parts Used" value={(job.spareParts || []).reduce((s, p) => s + Number(p.quantityUsed || 0), 0)} />
          <HeaderStat label="Delivery" value={formatINR(job.deliveryCharge)} mono />
        </div>

        {!readonly && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving}
              data-testid="job-save-changes-btn"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/20 active:scale-[0.97] transition text-sm font-semibold"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setConfirmDispatch(true)}
              data-testid="job-dispatch-btn"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ops-red hover:bg-red-700 active:scale-[0.97] transition text-sm font-bold"
            >
              <Truck className="w-4 h-4" /> Dispatch
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Company */}
        <FormCard title="Company" icon={<Building />}>
          <input
            value={job.partyName}
            readOnly={readonly}
            onChange={(e) => setField({ partyName: e.target.value })}
            data-testid="jobdetail-party-input"
            className={`h-12 w-full rounded-xl border border-slate-200 px-3.5 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40 ${
              readonly ? 'bg-ops-bg cursor-not-allowed' : 'bg-white'
            }`}
          />
        </FormCard>

        {/* Extinguishers */}
        <FormCard
          title="Extinguishers"
          icon={<Flame className="w-4 h-4" />}
          subtitle={`${totalExt(job)} total qty · ${job.extinguishers.length} rows`}
          action={
            !readonly && (
              <button
                type="button"
                onClick={() =>
                  setJob((j) => ({ ...j, extinguishers: [...j.extinguishers, emptyExt()] }))
                }
                data-testid="jobdetail-add-ext-btn"
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-ops-bg hover:bg-slate-200 text-ops-ink text-xs font-bold uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> Row
              </button>
            )
          }
        >
          <div className="space-y-2">
            {job.extinguishers.map((e, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                <div className="flex">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: EXT_ACCENT[e.type] }} />
                  <div className="flex-1 p-2.5 grid grid-cols-12 gap-2 items-center">
                    {readonly ? (
                      <>
                        <div className="col-span-5 sm:col-span-3 font-bold text-ops-ink">{e.type}</div>
                        <div className="col-span-4 sm:col-span-3 font-mono tabular-nums font-semibold">
                          {e.size}
                        </div>
                        <div className="col-span-3 sm:col-span-2 ops-pill bg-ops-bg text-ops-ink uppercase">
                          {e.unit}
                        </div>
                        <div className="col-span-12 sm:col-span-4 text-right">
                          <span className="font-mono tabular-nums font-extrabold text-lg text-ops-ink">
                            {e.quantity}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">
                            qty
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <NativeSelect
                          className="col-span-5 sm:col-span-3"
                          value={e.type}
                          onChange={(v) => setExt(i, { type: v })}
                          options={EXT_TYPES.map((t) => ({ v: t, l: t }))}
                        />
                        <NativeSelect
                          className="col-span-4 sm:col-span-3"
                          value={e.size}
                          onChange={(v) => setExt(i, { size: v })}
                          options={EXT_SIZES[e.type].sizes.map((s) => ({ v: s, l: s }))}
                        />
                        <div className="col-span-3 sm:col-span-2 h-10 rounded-lg bg-ops-bg border border-slate-200 flex items-center justify-center text-xs font-bold uppercase">
                          {e.unit}
                        </div>
                        <div className="col-span-9 sm:col-span-3">
                          <input
                            type="number"
                            min="1"
                            value={e.quantity}
                            onChange={(ev) => setExt(i, { quantity: ev.target.value })}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setJob((j) => ({
                                ...j,
                                extinguishers: j.extinguishers.filter((_, idx) => idx !== i),
                              }))
                            }
                            disabled={job.extinguishers.length === 1}
                            className="w-10 h-10 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FormCard>

        {/* Spare Parts */}
        <FormCard
          title="Spare Parts Used"
          icon={<Wrench className="w-4 h-4" />}
          action={
            !readonly && (
              <button
                type="button"
                onClick={() =>
                  setJob((j) => ({
                    ...j,
                    spareParts: [...(j.spareParts || []), { partId: '', partName: '', quantityUsed: 1 }],
                  }))
                }
                data-testid="jobdetail-add-part-btn"
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-ops-bg hover:bg-slate-200 text-ops-ink text-xs font-bold uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> Row
              </button>
            )
          }
        >
          {!job.spareParts || job.spareParts.length === 0 ? (
            <div className="text-sm text-slate-500 italic px-3 py-4 border border-dashed border-slate-200 rounded-xl text-center">
              No spare parts used.
            </div>
          ) : (
            <div className="space-y-2">
              {job.spareParts.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 grid grid-cols-12 gap-2 items-center"
                >
                  {readonly ? (
                    <>
                      <div className="col-span-9 font-semibold text-ops-ink">{p.partName}</div>
                      <div className="col-span-3 text-right">
                        <span className="font-mono tabular-nums font-extrabold text-lg text-ops-ink">
                          {p.quantityUsed}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">
                          used
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <NativeSelect
                        className="col-span-9 sm:col-span-8"
                        value={p.partId}
                        onChange={(v) => setPart(i, { partId: v })}
                        options={[
                          { v: '', l: 'Select part…' },
                          ...spareParts.map((sp) => ({
                            v: sp.id,
                            l: `${sp.name} · stock ${sp.currentStock}`,
                          })),
                        ]}
                      />
                      <input
                        type="number"
                        min="1"
                        value={p.quantityUsed}
                        onChange={(ev) => setPart(i, { quantityUsed: ev.target.value })}
                        className="col-span-9 sm:col-span-3 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setJob((j) => ({
                            ...j,
                            spareParts: j.spareParts.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="col-span-3 sm:col-span-1 w-10 h-10 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center justify-self-end"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </FormCard>

        {/* Delivery */}
        <FormCard title="Delivery Charge" icon={<IndianRupee className="w-4 h-4" />}>
          {readonly ? (
            <div className="font-mono tabular-nums font-extrabold text-2xl text-ops-ink">
              {formatINR(job.deliveryCharge)}
            </div>
          ) : (
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={job.deliveryCharge}
                onChange={(e) => setField({ deliveryCharge: e.target.value })}
                data-testid="jobdetail-delivery-input"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
              />
            </div>
          )}
        </FormCard>
      </div>

      {/* Sticky save bar (only when editable) */}
      {!readonly && (
        <div className="fixed left-0 right-0 bottom-16 md:bottom-0 md:left-60 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-ops-up ops-fab-safe">
          <div className="max-w-6xl mx-auto pl-4 pr-4 md:pl-8 md:pr-44 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-mono tabular-nums font-bold text-ops-ink">{totalExt(job)}</span> ext ·{' '}
              <span className="font-mono tabular-nums font-bold text-ops-ink">
                {(job.spareParts || []).length}
              </span>{' '}
              parts
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-ops-bg hover:bg-slate-200 disabled:opacity-60 text-ops-ink text-sm font-bold"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setConfirmDispatch(true)}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-ops-red hover:bg-red-700 text-white text-sm font-bold"
              >
                <Truck className="w-4 h-4" /> Dispatch
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch confirm */}
      <Drawer open={confirmDispatch} onOpenChange={setConfirmDispatch}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mark this job as dispatched?</DrawerTitle>
            <DrawerDescription>
              Used spare parts will be deducted from stock. This cannot be undone.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="grid grid-cols-2 gap-2 ops-fab-safe">
            <button
              onClick={() => setConfirmDispatch(false)}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-ops-ink font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={doDispatch}
              data-testid="jobdetail-confirm-dispatch-btn"
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

function HeaderStat({ label, value, mono }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider font-bold text-white/60">{label}</div>
      <div className={`font-display font-extrabold text-lg ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
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
            {subtitle && <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function NativeSelect({ value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
