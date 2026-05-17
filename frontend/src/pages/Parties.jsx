import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  History as HistoryIc,
  Phone,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, formatDate } from '../lib/api';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '../components/ui/drawer';

export default function Parties() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // {id?, name, phone}
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/parties');
      setParties(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return parties;
    return parties.filter(
      (p) => p.name.toLowerCase().includes(ql) || (p.phone || '').includes(ql)
    );
  }, [parties, q]);

  const save = async () => {
    if (!editing.name.trim()) return toast.error('Name required');
    try {
      if (editing.id) {
        await api.put(`/parties/${editing.id}`, { name: editing.name, phone: editing.phone });
        toast.success('Party updated');
      } else {
        await api.post('/parties', { name: editing.name, phone: editing.phone });
        toast.success('Party added');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    }
  };

  const doDelete = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/parties/${id}`);
      toast.success('Party removed');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div>
      <div className="hidden md:flex md:items-end md:justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ops-ink">Parties</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Customer companies · {parties.length} total
          </p>
        </div>
        <button
          onClick={() => setEditing({ name: '', phone: '' })}
          data-testid="party-add-btn"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ops-navy hover:bg-ops-navy-dark text-white text-sm font-semibold active:scale-[0.97] transition"
        >
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="parties-search-input"
            placeholder="Search company or phone"
            className="h-11 w-full pl-10 pr-3 rounded-xl bg-white border border-slate-200 shadow-ops text-sm focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
          />
        </div>
        <button
          onClick={() => setEditing({ name: '', phone: '' })}
          data-testid="party-add-btn-mobile"
          className="md:hidden inline-flex items-center gap-1 h-11 px-3.5 rounded-xl bg-ops-navy text-white text-sm font-semibold active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <div className="ops-card p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ops-bg mx-auto flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <div className="mt-3 font-display font-bold text-ops-ink">
            {q.trim() ? 'No matches' : 'No parties yet'}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {q.trim() ? 'Try a different search.' : 'Add your first company to start tracking refills.'}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <AnimatePresence initial={false}>
            {filtered.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22, delay: i * 0.02 }}
                data-testid={`party-card-${p.id}`}
                className="ops-card p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-ops-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-ops-ink truncate">{p.name}</div>
                    {p.phone ? (
                      <a
                        href={`tel:${p.phone}`}
                        className="text-xs text-slate-600 font-mono inline-flex items-center gap-1 mt-0.5 hover:text-ops-navy"
                      >
                        <Phone className="w-3 h-3" /> {p.phone}
                      </a>
                    ) : (
                      <div className="text-xs text-slate-400 mt-0.5">No phone</div>
                    )}
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-bold">
                      Added {formatDate(p.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <ActionBtn
                    onClick={() => navigate(`/history?q=${encodeURIComponent(p.name)}`)}
                    icon={HistoryIc}
                    label="History"
                    testid={`party-history-btn-${p.id}`}
                  />
                  <ActionBtn
                    onClick={() => setEditing({ id: p.id, name: p.name, phone: p.phone || '' })}
                    icon={Edit2}
                    label="Edit"
                    testid={`party-edit-btn-${p.id}`}
                  />
                  <ActionBtn
                    onClick={() => setConfirmDelete(p.id)}
                    icon={Trash2}
                    label="Delete"
                    variant="danger"
                    testid={`party-delete-btn-${p.id}`}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Add/Edit drawer */}
      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent data-testid="party-dialog">
          <DrawerHeader>
            <DrawerTitle>{editing?.id ? 'Edit Party' : 'Add New Party'}</DrawerTitle>
            <DrawerDescription>
              {editing?.id ? 'Update name or phone for this company.' : 'Save a new company to use later in jobs.'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Company Name
              </div>
              <input
                value={editing?.name || ''}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                data-testid="party-name-input"
                placeholder="e.g. Acme Industries"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone (optional)
              </div>
              <input
                value={editing?.phone || ''}
                onChange={(e) => setEditing((p) => ({ ...p, phone: e.target.value }))}
                data-testid="party-phone-input"
                placeholder="e.g. +91 98765 43210"
                inputMode="tel"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-ops-navy/40"
              />
            </div>
          </div>
          <DrawerFooter className="grid grid-cols-2 gap-2 ops-fab-safe">
            <button
              onClick={() => setEditing(null)}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-ops-ink font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={save}
              data-testid="party-save-btn"
              className="h-12 rounded-xl bg-ops-navy hover:bg-ops-navy-dark text-white font-semibold text-sm"
            >
              {editing?.id ? 'Update' : 'Save Party'}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete confirm */}
      <Drawer open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Remove this party?</DrawerTitle>
            <DrawerDescription>
              The party will be deleted from the directory. Existing jobs remain unaffected.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="grid grid-cols-2 gap-2 ops-fab-safe">
            <button
              onClick={() => setConfirmDelete(null)}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-ops-ink font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={doDelete}
              data-testid="party-confirm-delete-btn"
              className="h-12 rounded-xl bg-ops-red hover:bg-red-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, variant = 'default', testid }) {
  const cls =
    variant === 'danger'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : 'border-slate-200 text-ops-ink hover:bg-slate-50';
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`inline-flex items-center justify-center gap-1 h-9 rounded-lg border ${cls} text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="ops-card h-32 p-3">
          <div className="skeleton h-11 w-11 mb-3 rounded-xl" />
          <div className="skeleton h-4 w-28 mb-2" />
          <div className="skeleton h-3 w-36" />
        </div>
      ))}
    </div>
  );
}
