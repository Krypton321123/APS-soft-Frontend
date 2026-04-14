import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Flag, ChevronDown, ChevronUp, Download, RotateCcw, Search, X, Layers, SlidersHorizontal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// ── Font import (add to index.html or global CSS if not already present) ──────
// <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">

// ── Constants ──────────────────────────────────────────────────────────────────
const FLAG_OPTIONS = [
  { value: 'A',    label: 'Flag A',  dot: '#ef4444' },
  { value: 'B',    label: 'Flag B',  dot: '#3b82f6' },
  { value: 'C',    label: 'Flag C',  dot: '#22c55e' },
  { value: 'D',    label: 'Flag D',  dot: '#eab308' },
  { value: 'NONE', label: 'No Flag', dot: '#d1d5db' },
];

const FLAG_PILL: Record<string, string> = {
  A:    'bg-red-50   text-red-600   border-red-200',
  B:    'bg-blue-50  text-blue-600  border-blue-200',
  C:    'bg-green-50 text-green-600 border-green-200',
  D:    'bg-yellow-50 text-yellow-600 border-yellow-200',
  NONE: 'bg-gray-50  text-gray-400  border-gray-200',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SelectField = ({
  label, value, onChange, children, disabled
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9496b0', fontWeight: 500 }}>
      {label}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 rounded-lg border px-3 text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-all duration-150"
      style={{
        borderColor: '#e8e9ef',
        color: value ? '#1a1a2e' : '#b0b2c0',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        boxShadow: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </select>
  </div>
);

const DateField = ({
  label, value, onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9496b0', fontWeight: 500 }}>
      {label}
    </label>
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-lg border px-3 text-sm bg-white focus:outline-none focus:ring-2 transition-all duration-150"
      style={{ borderColor: '#e8e9ef', color: value ? '#1a1a2e' : '#b0b2c0', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
    />
  </div>
);

const RemarksCell = ({ imageId, remarksList, setRemarksList }: any) => {
  const [local, setLocal] = useState(remarksList[imageId] || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(remarksList[imageId] || ''); }, [remarksList, imageId]);

  const handleSave = async () => {
    if (!local.trim()) return toast('Write something in the remark');
    setSaving(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/images/saveRemark`, {
        image_id: imageId, remark: local.trim()
      });
      if (res.status === 200) {
        setRemarksList((prev: any) => ({ ...prev, [imageId]: local.trim() }));
        toast('Remark saved');
      }
    } catch { toast('Failed to save remark'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-1.5 w-56">
      <Textarea
        value={local}
        onChange={e => setLocal(e.target.value)}
        className="text-xs resize-none min-h-[60px] rounded-lg border focus:outline-none focus:ring-2 transition-all"
        style={{ borderColor: '#e8e9ef', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="self-end text-xs px-3 py-1 rounded-lg font-medium transition-all duration-150"
        style={{ background: '#5b6af0', color: '#fff', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <div
    className="flex flex-col gap-1 rounded-xl px-4 py-3"
    style={{ background: '#f4f5fa', border: '0.5px solid #e8e9ef' }}
  >
    <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9496b0', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
      {label}
    </span>
    <span style={{ fontSize: 20, fontWeight: 500, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>
      {value}
    </span>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
function Images() {
  const [depot, setDepot]         = useState('');
  const [employee, setEmployee]   = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [selectedFlag, setSelectedFlag] = useState('ALL');
  const [groupByFlag, setGroupByFlag]   = useState(false);

  const [images, setImages]             = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);

  const [partyFlags, setPartyFlags]     = useState<Record<string, string>>({});
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [remarksList, setRemarksList]   = useState<Record<string, string>>({});

  const [depotOptions, setDepotOptions]       = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);

  // Fetch flags
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/images/getFlags`).then(res => {
      if (res.status === 200 && res.data.data?.length) {
        res.data.data.forEach((item: any) =>
          setPartyFlags(prev => ({ ...prev, [item.partyId]: item.flag }))
        );
      }
    });
  }, []);

  // Fetch depots
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/images/depots`).then(res => {
      const allowed = JSON.parse(localStorage.getItem('allowedLocations') || '[]');
      if (!allowed?.length) return setDepotOptions(res.data);
      setDepotOptions(res.data.filter((d: string) => allowed.includes(d.toUpperCase().slice(0, 3))));
    });
  }, []);

  // Fetch employees
  useEffect(() => {
    if (!depot) { setEmployeeOptions([]); setEmployee(''); return; }
    axios.get(`${import.meta.env.VITE_API_URL}/images/employees?depot=${depot}`)
      .then(res => setEmployeeOptions(res.data));
  }, [depot]);

  const getPartyFlag = (id: string) => partyFlags[id] || 'NONE';

  const updatePartyFlag = async (partyId: string, flag: string) => {
    setPartyFlags(prev => ({ ...prev, [partyId]: flag }));
    setEditingPartyId(null);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/images/saveFlag`, { partyId, flag });
      if (res.status === 200) toast('Flag saved');
    } catch { toast('Failed to save flag'); }
  };

  const processedData = useMemo(() => {
    let data = selectedFlag === 'ALL' ? images : images.filter((img: any) => getPartyFlag(img.partyId) === selectedFlag);
    if (!groupByFlag) return data;
    const grouped: Record<string, any[]> = {};
    data.forEach((img: any) => {
      const f = getPartyFlag(img.partyId);
      grouped[f] = grouped[f] ? [...grouped[f], img] : [img];
    });
    return grouped;
  }, [images, selectedFlag, groupByFlag, partyFlags]);

  const filteredTotals = useMemo(() => {
    const flat = groupByFlag ? Object.values(processedData as Record<string, any[]>).flat() : (processedData as any[]);
    return {
      qty:         flat.reduce((s: number, r: any) => s + (Number(r.orderQuantity)   || 0), 0),
      collection:  flat.reduce((s: number, r: any) => s + (Number(r.collectionAmount) || 0), 0),
      outstanding: flat.reduce((s: number, r: any) => s + (Number(r.outstanding)     || 0), 0),
    };
  }, [processedData, groupByFlag]);

  const columnHelper = createColumnHelper<any>();
  const columns = useMemo(() => [
    columnHelper.accessor((_, i) => i + 1, {
      id: 'serial', header: 'No.',
      cell: info => <span style={{ color: '#b0b2c0', fontSize: 12 }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('profileImageUrl', {
      header: 'Photo', enableSorting: false,
      cell: info => (
        <div
          className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border transition-all duration-150 hover:scale-105"
          style={{ borderColor: '#e8e9ef' }}
          onClick={() => setSelectedImage(info.row.original)}
        >
          <img src={info.getValue()} className="w-full h-full object-cover" />
        </div>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      cell: info => {
        const d = new Date(info.getValue());
        return <span style={{ fontSize: 12, color: '#6b6d85' }}>{d.getDate()}-{d.getMonth()+1}-{d.getFullYear()}</span>;
      },
    }),
    columnHelper.accessor('partyId', {
      header: 'Party',
      cell: info => (
        <div className="flex flex-col gap-1">
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{info.row.original.partyName}</span>
          <span style={{ fontSize: 11, color: '#b0b2c0' }}>{info.getValue()}</span>
          <div className="mt-0.5">
            {editingPartyId === info.getValue() ? (
              <select
                value={getPartyFlag(info.getValue())}
                onChange={e => updatePartyFlag(info.getValue(), e.target.value)}
                onBlur={() => setEditingPartyId(null)}
                autoFocus
                className="text-xs border rounded-md px-1.5 py-0.5 focus:outline-none"
                style={{ borderColor: '#e8e9ef', fontFamily: "'DM Sans', sans-serif" }}
              >
                {FLAG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <button
                onClick={() => setEditingPartyId(info.getValue())}
                className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all duration-150 hover:opacity-80 ${FLAG_PILL[getPartyFlag(info.getValue())]}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: FLAG_OPTIONS.find(o => o.value === getPartyFlag(info.getValue()))?.dot }}
                />
                {FLAG_OPTIONS.find(o => o.value === getPartyFlag(info.getValue()))?.label}
              </button>
            )}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('orderQuantity',   { header: 'Order Qty',   cell: info => <span style={{ fontSize: 13, color: '#1a1a2e' }}>{info.getValue()}</span> }),
    columnHelper.accessor('collectionAmount',{ header: 'Collection',  cell: info => <span style={{ fontSize: 13, color: '#1a1a2e' }}>{info.getValue()}</span> }),
    columnHelper.accessor('outstanding',     { header: 'Outstanding', cell: info => <span style={{ fontSize: 13, color: '#1a1a2e' }}>{info.getValue()}</span> }),
    columnHelper.accessor('Remarks', {
      header: 'Remarks',
      cell: ({ row }) => <RemarksCell imageId={row.original.image_id} remarksList={remarksList} setRemarksList={setRemarksList} />,
    }),
  ], [remarksList, editingPartyId, partyFlags]);

  const table = useReactTable({
    data: groupByFlag ? [] : (processedData as any[]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setShowNoResults(false);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/images/getImages`, {
        params: { depot, employee, startDate, endDate }
      });
      setImages(res.data.data.sendData);
      res.data.data.sendData.forEach((item: any) => {
        if (item.remarks) setRemarksList(prev => ({ ...prev, [item.image_id]: item.remarks }));
      });
      if (!res.data.data.sendData.length) setShowNoResults(true);
    } catch { setImages([]); setShowNoResults(true); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setDepot(''); setEmployee(''); setStartDate(''); setEndDate('');
    setImages([]); setShowNoResults(false); setSelectedFlag('ALL'); setGroupByFlag(false);
  };

  const handleDownloadPDF = async () => {
    const canvas = await html2canvas(document.getElementById('table-div')!);
    try {
      const iw = canvas.width / 3, ih = canvas.height / 3;
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [iw, ih + 100] });
      const pw = pdf.internal.pageSize.getWidth();
      pdf.setTextColor(0, 0, 0); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18);
      pdf.text('MAHESH EDIBLE OILS PRODUCTS PVT LTD', pw / 2, 15, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(14);
      pdf.text('Daily Working Report', pw / 2, 30, { align: 'center' });
      pdf.text(`Employee - ${employee}`, pw / 2, 45, { align: 'center' });
      pdf.text(`${startDate} to ${endDate}`, pw / 2, 60, { align: 'center' });
      pdf.addImage(canvas.toDataURL('image/png'), 'JPEG', 5, 75, iw, ih);
      const ts = new Date().toISOString().split('T');
      pdf.save(`dwr-${ts[0]}-${ts[1]}.pdf`);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-full overflow-auto" style={{ fontFamily: "'DM Sans', sans-serif", background: '#f2f3f7' }}>
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-5">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
              Daily Working
            </h1>
            <p style={{ fontSize: 12, color: '#b0b2c0', marginTop: 2 }}>
              View and manage daily image records by employee
            </p>
          </div>
          {images.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-85"
              style={{ background: '#5b6af0', color: '#fff', fontSize: 13 }}
            >
              <Download size={14} />
              Download PDF
            </motion.button>
          )}
        </motion.div>

        {/* ── Filter form card ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-xl p-5"
          style={{ background: '#ffffff', border: '0.5px solid #e8e9ef' }}
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <SelectField label="Depot" value={depot} onChange={setDepot}>
                <option value="">Select depot</option>
                {depotOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
              </SelectField>

              <SelectField label="Employee" value={employee} onChange={setEmployee} disabled={!depot || !employeeOptions.length}>
                <option value="">{employeeOptions.length ? 'Select employee' : 'Select depot first'}</option>
                {employeeOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
              </SelectField>

              <DateField label="From" value={startDate} onChange={setStartDate} />
              <DateField label="To"   value={endDate}   onChange={setEndDate} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm transition-all duration-150 hover:opacity-80"
                style={{ background: '#f4f5fa', color: '#6b6d85', border: '0.5px solid #e8e9ef', fontSize: 13 }}
              >
                <RotateCcw size={13} />
                Reset
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-85"
                style={{ background: '#5b6af0', color: '#fff', fontSize: 13 }}
              >
                <Search size={13} />
                Search
              </button>
            </div>
          </form>
        </motion.div>

        {/* ── Loading ── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#e8e9ef', borderTopColor: '#5b6af0' }}
                />
                <span style={{ fontSize: 12, color: '#b0b2c0' }}>Fetching records…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── No results ── */}
        <AnimatePresence>
          {showNoResults && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12 rounded-xl"
              style={{ background: '#fff', border: '0.5px solid #e8e9ef' }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f4f5fa' }}>
                  <Search size={16} style={{ color: '#b0b2c0' }} />
                </div>
                <p style={{ fontSize: 13, color: '#6b6d85', fontWeight: 500 }}>No records found</p>
                <p style={{ fontSize: 12, color: '#b0b2c0' }}>Try adjusting your filters</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results ── */}
        <AnimatePresence>
          {images.length > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-4"
            >
              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Order Qty"  value={filteredTotals.qty} />
                <StatCard label="Total Collection" value={filteredTotals.collection} />
                <StatCard label="Outstanding"      value={filteredTotals.outstanding} />
              </div>

              {/* Flag controls */}
              <div
                className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: '#ffffff', border: '0.5px solid #e8e9ef' }}
              >
                <SlidersHorizontal size={14} style={{ color: '#b0b2c0' }} />
                <span style={{ fontSize: 12, color: '#6b6d85', fontWeight: 500 }}>Filter</span>

                <div className="flex items-center gap-1.5">
                  {['ALL', ...FLAG_OPTIONS.map(o => o.value)].map(v => {
                    const opt = FLAG_OPTIONS.find(o => o.value === v);
                    const isActive = selectedFlag === v;
                    return (
                      <button
                        key={v}
                        onClick={() => setSelectedFlag(v)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-all duration-150"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 11,
                          fontWeight: isActive ? 500 : 400,
                          background: isActive ? '#5b6af0' : '#f4f5fa',
                          color: isActive ? '#fff' : '#6b6d85',
                          borderColor: isActive ? '#5b6af0' : '#e8e9ef',
                        }}
                      >
                        {opt && <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#fff' : opt.dot }} />}
                        {v === 'ALL' ? 'All' : opt?.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <div
                      onClick={() => setGroupByFlag(p => !p)}
                      className="w-8 h-4 rounded-full relative transition-all duration-200 flex-shrink-0"
                      style={{ background: groupByFlag ? '#5b6af0' : '#e8e9ef' }}
                    >
                      <div
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
                        style={{ left: groupByFlag ? 'calc(100% - 14px)' : '2px' }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: '#6b6d85' }}>Group by flag</span>
                  </label>
                  <button
                    onClick={() => {
                      if (confirm('Clear all party flags?')) setPartyFlags({});
                    }}
                    style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Clear flags
                  </button>
                </div>
              </div>

              {/* Table card */}
              <div
                id="table-div"
                className="rounded-xl overflow-hidden"
                style={{ border: '0.5px solid #e8e9ef', background: '#fff' }}
              >
                {groupByFlag ? (
                  // Grouped view
                  <div className="divide-y" style={{ borderColor: '#f0f1f6' }}>
                    {Object.entries(processedData as Record<string, any[]>).map(([flag, items]) => {
                      const opt = FLAG_OPTIONS.find(o => o.value === flag);
                      return (
                        <div key={flag}>
                          <div
                            className="flex items-center gap-2 px-5 py-3"
                            style={{ background: '#f4f5fa', borderBottom: '0.5px solid #e8e9ef' }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: opt?.dot }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a2e' }}>{opt?.label}</span>
                            <span
                              className="px-2 py-0.5 rounded-md text-xs"
                              style={{ background: '#eef0fd', color: '#5b6af0', fontWeight: 500 }}
                            >
                              {items.length}
                            </span>
                          </div>
                          <table className="w-full">
                            <thead>
                              <tr style={{ borderBottom: '0.5px solid #f0f1f6' }}>
                                {['No.', 'Photo', 'Date', 'Party', 'Order Qty', 'Collection', 'Outstanding', 'Remarks'].map(h => (
                                  <th key={h} className="text-left px-4 py-2.5" style={{ fontSize: 11, color: '#b0b2c0', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((img: any, i: number) => {
                                const d = new Date(img.createdAt);
                                return (
                                  <tr key={i} style={{ borderBottom: '0.5px solid #f4f5fa' }}>
                                    <td className="px-4 py-3" style={{ fontSize: 12, color: '#b0b2c0' }}>{i + 1}</td>
                                    <td className="px-4 py-3">
                                      <div className="w-10 h-10 rounded-lg overflow-hidden cursor-pointer border hover:scale-105 transition-transform" style={{ borderColor: '#e8e9ef' }} onClick={() => setSelectedImage(img)}>
                                        <img src={img.profileImageUrl} className="w-full h-full object-cover" />
                                      </div>
                                    </td>
                                    <td className="px-4 py-3" style={{ fontSize: 12, color: '#6b6d85' }}>{d.getDate()}-{d.getMonth()+1}-{d.getFullYear()}</td>
                                    <td className="px-4 py-3">
                                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{img.partyName}</p>
                                      <p style={{ fontSize: 11, color: '#b0b2c0' }}>{img.partyId}</p>
                                    </td>
                                    <td className="px-4 py-3" style={{ fontSize: 13, color: '#1a1a2e' }}>{img.orderQuantity}</td>
                                    <td className="px-4 py-3" style={{ fontSize: 13, color: '#1a1a2e' }}>{img.collectionAmount}</td>
                                    <td className="px-4 py-3" style={{ fontSize: 13, color: '#1a1a2e' }}>{img.outstanding}</td>
                                    <td className="px-4 py-3"><RemarksCell imageId={img.image_id} remarksList={remarksList} setRemarksList={setRemarksList} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // TanStack table
                  <table className="w-full">
                    <thead>
                      {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id} style={{ borderBottom: '0.5px solid #f0f1f6', background: '#fafafa' }}>
                          {hg.headers.map(h => (
                            <th
                              key={h.id}
                              className="text-left px-4 py-3 select-none"
                              style={{ fontSize: 11, color: '#b0b2c0', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: h.column.getCanSort() ? 'pointer' : 'default' }}
                              onClick={h.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-1">
                                {flexRender(h.column.columnDef.header, h.getContext())}
                                {h.column.getCanSort() && (
                                  <span>
                                    {{ asc: <ChevronUp size={12} />, desc: <ChevronDown size={12} /> }[h.column.getIsSorted() as string] ?? null}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row, ri) => (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: ri * 0.015 }}
                          style={{ borderBottom: '0.5px solid #f4f5fa' }}
                          className="hover:bg-[#fafafa] transition-colors duration-100"
                        >
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                      {/* Totals row */}
                      <tr style={{ borderTop: '0.5px solid #e8e9ef', background: '#fafafa' }}>
                        <td className="px-4 py-3" style={{ fontSize: 12, color: '#b0b2c0' }}>—</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Total</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{filteredTotals.qty}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{filteredTotals.collection}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{filteredTotals.outstanding}</td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Image modal ── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="relative rounded-2xl overflow-hidden"
              style={{ maxWidth: '90vw', maxHeight: '85vh', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedImage?.profileImageUrl}
                alt="Full view"
                className="max-w-full max-h-[80vh] object-contain block"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 hover:opacity-80"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                <X size={14} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Images;