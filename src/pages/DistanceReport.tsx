import { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface DayReport {
    date: string;
    distanceKm: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function DistanceReport() {
    const [depot,           setDepot]           = useState('');
    const [employee,        setEmployee]        = useState('');
    const [month,           setMonth]           = useState(String(new Date().getMonth() + 1));
    const [year,            setYear]            = useState(String(currentYear));
    const [isFilterOpen,    setIsFilterOpen]    = useState(true);
    const [depotOptions,    setDepotOptions]    = useState<string[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);
    const [report,          setReport]          = useState<DayReport[] | null>(null);
    const [loading,         setLoading]         = useState(false);

    const navigate = useNavigate();

    const goToRoute = (day: DayReport) => {
        const [dd, mm, yy] = day.date.split('/');
        const isoDate = `20${yy}-${mm}-${dd}`;
        const params = new URLSearchParams({ depot, employee, date: isoDate });
        navigate(`/location?${params.toString()}`);
    };

    useEffect(() => {
        const fetchDepots = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/images/depots`);
                const allowedLocations = JSON.parse(localStorage.getItem('allowedLocations') || '""');
                if (!allowedLocations || allowedLocations.length === 0) {
                    setDepotOptions(response.data);
                } else {
                    const filtered = response.data.filter((item: string) =>
                        allowedLocations.includes(item.toUpperCase().slice(0, 3))
                    );
                    setDepotOptions(filtered);
                }
            } catch (err) {
                console.error('Failed to fetch depots', err);
            }
        };
        fetchDepots();
    }, []);

    useEffect(() => {
        if (depot) {
            const fetchEmployees = async () => {
                try {
                    const response = await axios.get(
                        `${import.meta.env.VITE_API_URL}/images/employees?depot=${depot}`
                    );
                    setEmployeeOptions(response.data);
                } catch (err) {
                    console.error('Failed to fetch employees', err);
                }
            };
            fetchEmployees();
        } else {
            setEmployeeOptions([]);
            setEmployee('');
        }
    }, [depot]);

    const handleSubmit = async () => {
        if (!depot || !employee || !month || !year) return;
        setLoading(true);
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/location/monthlyDistanceReport`,
                { params: { employee, month, year } }
            );
            setReport(response.data.data.report);
        } catch (err) {
            console.error('Failed to fetch distance report', err);
            alert('Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setDepot('');
        setEmployee('');
        setMonth(String(new Date().getMonth() + 1));
        setYear(String(currentYear));
        setReport(null);
    };

    const totalKm    = report ? report.reduce((s, d) => s + d.distanceKm, 0) : 0;
    const activeDays = report ? report.filter(d => d.distanceKm > 0).length : 0;
    const avgKm      = activeDays > 0 ? totalKm / activeDays : 0;
    const maxKm      = report ? Math.max(...report.map(d => d.distanceKm)) : 1;

    const formatDate = (raw: string) => {
        const [dd, mm, yy] = raw.split('/');
        const d = new Date(parseInt(yy) + 2000, parseInt(mm) - 1, parseInt(dd));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const selectCls = "h-9 rounded-xl border px-3 text-xs focus:outline-none focus:ring-2 transition-all w-full appearance-none bg-white disabled:opacity-50 disabled:cursor-not-allowed";
    const selectStyle = { borderColor: '#e8e9ef', color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif" };

    return (
        <div className="flex h-full overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif", background: '#f2f3f7' }}>

            {/* ── Filter Sidebar ── */}
            <motion.div
                initial={{ width: '17rem' }}
                animate={{ width: isFilterOpen ? '17rem' : '0rem' }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="flex-shrink-0 overflow-hidden flex flex-col"
                style={{ borderRight: isFilterOpen ? '0.5px solid #e8e9ef' : 'none', background: '#fff' }}
            >
                <div style={{ minWidth: '17rem' }} className="flex flex-col h-full">
                    {/* Sidebar header */}
                    <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '0.5px solid #e8e9ef' }}>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} style={{ color: '#5b6af0' }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a2e' }}>Filters</span>
                        </div>
                        <button
                            onClick={() => setIsFilterOpen(false)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#f4f5fa] transition-colors"
                            style={{ color: '#b0b2c0' }}
                        >
                            <PanelLeftClose size={13} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                        {/* Depot */}
                        <div className="flex flex-col gap-1.5">
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Depot</span>
                            <select value={depot} onChange={e => setDepot(e.target.value)} className={selectCls} style={selectStyle}>
                                <option value="">Select depot</option>
                                {depotOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Employee */}
                        <div className="flex flex-col gap-1.5">
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Employee</span>
                            <select value={employee} onChange={e => setEmployee(e.target.value)} className={selectCls} style={selectStyle} disabled={!depot || employeeOptions.length === 0}>
                                <option value="">{employeeOptions.length ? 'Select employee' : 'Select depot first'}</option>
                                {employeeOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Month & Year */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1.5">
                                <span style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Month</span>
                                <select value={month} onChange={e => setMonth(e.target.value)} className={selectCls} style={selectStyle} disabled={!employee}>
                                    {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Year</span>
                                <select value={year} onChange={e => setYear(e.target.value)} className={selectCls} style={selectStyle} disabled={!employee}>
                                    {YEARS.map((y, i) => <option key={i} value={String(y)}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-1">
                            <button
                                onClick={handleSubmit}
                                disabled={!depot || !employee || loading}
                                className="h-9 rounded-xl text-xs font-medium transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: '#5b6af0', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin inline-block" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                                        Loading…
                                    </span>
                                ) : 'Search'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="h-9 rounded-xl text-xs font-medium transition-all hover:bg-[#f4f5fa]"
                                style={{ background: '#fafafa', color: '#6b6d85', border: '0.5px solid #e8e9ef', fontFamily: "'DM Sans', sans-serif" }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Main panel ── */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden p-4 gap-3">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-center gap-3 flex-shrink-0"
                >
                    {!isFilterOpen && (
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-white transition-colors"
                            style={{ borderColor: '#e8e9ef', color: '#6b6d85', background: '#fff' }}
                        >
                            <PanelLeftOpen size={13} />
                        </button>
                    )}
                    <div className="flex-1">
                        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.02em' }}>Distance Report</h1>
                        <p style={{ fontSize: 12, color: '#b0b2c0', marginTop: 1 }}>Monthly distance travelled by employee</p>
                    </div>

                    {report && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#f4f5fa', border: '0.5px solid #e8e9ef' }}>
                            <span style={{ fontSize: 11, color: '#6b6d85', fontFamily: "'DM Sans', sans-serif" }}>
                                {MONTHS[parseInt(month) - 1]} {year}
                            </span>
                            <span style={{ color: '#d1d5e0' }}>·</span>
                            <span style={{ fontSize: 11, color: '#5b6af0', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                                {employee}
                            </span>
                        </div>
                    )}
                </motion.div>

                <AnimatePresence mode="wait">
                    {!report ? (
                        /* Empty state */
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl"
                            style={{ border: '0.5px solid #e8e9ef', background: '#fff' }}
                        >
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f4f5fa' }}>
                                <MapPin size={20} style={{ color: '#b0b2c0' }} />
                            </div>
                            <p style={{ fontSize: 13, color: '#6b6d85', fontWeight: 500 }}>No report loaded</p>
                            <p style={{ fontSize: 12, color: '#b0b2c0' }}>Select filters and click Search to view the report</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="flex-1 flex flex-col min-h-0 gap-3"
                        >
                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                                {[
                                    { label: 'Total Distance', value: `${totalKm.toFixed(1)} km` },
                                    { label: 'Active Days', value: `${activeDays}`, sub: `/ ${report.length} days` },
                                    { label: 'Avg per Active Day', value: `${avgKm.toFixed(1)} km` },
                                ].map((card, i) => (
                                    <motion.div
                                        key={card.label}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.18, delay: i * 0.05 }}
                                        className="rounded-xl px-5 py-4"
                                        style={{ background: '#fff', border: '0.5px solid #e8e9ef' }}
                                    >
                                        <p style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
                                            {card.label}
                                        </p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span style={{ fontSize: 22, fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
                                                {card.value}
                                            </span>
                                            {card.sub && (
                                                <span style={{ fontSize: 12, color: '#b0b2c0', fontFamily: "'DM Sans', sans-serif" }}>{card.sub}</span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Table card */}
                            <div className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col" style={{ border: '0.5px solid #e8e9ef', background: '#fff' }}>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full" style={{ minWidth: 600 }}>
                                        <thead className="sticky top-0 z-10" style={{ background: '#fafafa', borderBottom: '0.5px solid #f0f1f6' }}>
                                            <tr>
                                                {['#', 'Date', 'Distance', 'Visual', 'Status', ''].map(h => (
                                                    <th key={h} className="text-left px-4 py-2.5" style={{ fontSize: 10, color: '#b0b2c0', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.map((day, idx) => {
                                                const barPct  = maxKm > 0 ? (day.distanceKm / maxKm) * 100 : 0;
                                                const isActive = day.distanceKm > 0;
                                                return (
                                                    <motion.tr
                                                        key={idx}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.12, delay: Math.min(idx * 0.008, 0.25) }}
                                                        className="hover:bg-[#fafafa] transition-colors duration-100"
                                                        style={{ borderBottom: '0.5px solid #f4f5fa' }}
                                                    >
                                                        <td className="px-4 py-3" style={{ fontSize: 12, color: '#b0b2c0', fontFamily: "'DM Sans', sans-serif" }}>{idx + 1}</td>
                                                        <td className="px-4 py-3" style={{ fontSize: 12, fontWeight: 500, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif" }}>
                                                            {formatDate(day.date)}
                                                        </td>
                                                        <td className="px-4 py-3" style={{ fontSize: 12.5, fontWeight: 500, color: isActive ? '#1a1a2e' : '#d1d5e0', fontFamily: "'DM Sans', sans-serif" }}>
                                                            {day.distanceKm.toFixed(1)} km
                                                        </td>
                                                        <td className="px-4 py-3" style={{ width: 160 }}>
                                                            <div className="w-full rounded-full h-1.5" style={{ background: '#f0f1f6' }}>
                                                                <div
                                                                    className="h-1.5 rounded-full transition-all"
                                                                    style={{ width: `${barPct}%`, background: isActive ? '#5b6af0' : '#e8e9ef' }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className="text-xs px-2 py-0.5 rounded-md border font-medium"
                                                                style={{
                                                                    fontFamily: "'DM Sans', sans-serif",
                                                                    ...(isActive
                                                                        ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
                                                                        : { background: '#f4f5fa', color: '#b0b2c0', borderColor: '#e8e9ef' })
                                                                }}
                                                            >
                                                                {isActive ? 'active' : 'no data'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => goToRoute(day)}
                                                                disabled={!isActive}
                                                                className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-all hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                style={{
                                                                    background: isActive ? '#eef0fd' : '#f4f5fa',
                                                                    color: isActive ? '#5b6af0' : '#b0b2c0',
                                                                    border: `0.5px solid ${isActive ? '#c7cdf7' : '#e8e9ef'}`,
                                                                    fontFamily: "'DM Sans', sans-serif",
                                                                }}
                                                            >
                                                                <MapPin size={11} />
                                                                View route
                                                            </button>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div className="flex-shrink-0 px-4 py-2.5 flex items-center" style={{ borderTop: '0.5px solid #f0f1f6', background: '#fafafa' }}>
                                    <span style={{ fontSize: 11, color: '#b0b2c0', fontFamily: "'DM Sans', sans-serif" }}>
                                        {MONTHS[parseInt(month) - 1]} {year} · {report.length} days · {employee}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}