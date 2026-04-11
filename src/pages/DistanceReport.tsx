import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowDownToLine, ArrowUpFromLine, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        // Convert DD/MM/YY back to YYYY-MM-DD for the date input on Location page
        const [dd, mm, yy] = day.date.split('/');
        const isoDate = `20${yy}-${mm}-${dd}`;
        const params = new URLSearchParams({ depot, employee, date: isoDate });
        navigate(`/location?${params.toString()}`);
    };

    // Fetch depots on mount (same logic as Location.tsx)
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

    // Fetch employees when depot changes (same logic as Location.tsx)
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

    // Summary stats
    const totalKm     = report ? report.reduce((s, d) => s + d.distanceKm, 0) : 0;
    const activeDays  = report ? report.filter(d => d.distanceKm > 0).length : 0;
    const avgKm       = activeDays > 0 ? totalKm / activeDays : 0;
    const maxKm       = report ? Math.max(...report.map(d => d.distanceKm)) : 1;

    // Pretty-print stored date (DD/MM/YY) → "01 Mar 2025"
    const formatDate  = (raw: string) => {
        const [dd, mm, yy] = raw.split('/');
        const fullYear = parseInt(yy) + 2000;
        const d = new Date(fullYear, parseInt(mm) - 1, parseInt(dd));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="relative">
            {/* Filter panel */}
            <div className={`bg-white rounded-xl shadow-md mb-8 overflow-hidden transition-all duration-500 ease-in-out ${
                isFilterOpen ? 'max-h-96 opacity-100 p-6' : 'max-h-0 opacity-0 p-0'
            }`}>
                <div className={`transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                        <div className="flex flex-col">
                            <label className="font-bold text-base mb-2">Depot:</label>
                            <select
                                value={depot}
                                onChange={e => setDepot(e.target.value)}
                                className="border border-gray-300 rounded p-2.5"
                            >
                                <option value="">Select Depot</option>
                                {depotOptions.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="font-bold text-base mb-2">Employee:</label>
                            <select
                                value={employee}
                                onChange={e => setEmployee(e.target.value)}
                                className="border border-gray-300 rounded p-2.5"
                                disabled={!depot || employeeOptions.length === 0}
                            >
                                <option value="">{employeeOptions.length ? 'Select Employee' : 'Select depot first'}</option>
                                {employeeOptions.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex flex-col">
                            <label className="font-bold text-base mb-2">Month:</label>
                            <select
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                disabled={!employee}
                                className="border border-gray-300 rounded p-2.5"
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i} value={String(i + 1)}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="font-bold text-base mb-2">Year:</label>
                            <select
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                disabled={!employee}
                                className="border border-gray-300 rounded p-2.5"
                            >
                                {YEARS.map((y, i) => (
                                    <option key={i} value={String(y)}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleReset}
                                className="bg-gray-300 text-gray-800 rounded p-2.5 w-full h-12 hover:bg-gray-400 transition-colors"
                            >
                                Reset
                            </button>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleSubmit}
                                disabled={!depot || !employee || loading}
                                className="bg-blue-600 text-white rounded p-2.5 w-full h-12 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Loading...' : 'Search'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toggle button */}
            <button
                onClick={() => setIsFilterOpen(prev => !prev)}
                className="absolute top-2 right-5 z-[1000] w-10 h-10 bg-white flex justify-center items-center border-2 border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 hover:scale-110"
            >
                {isFilterOpen ? <ArrowUpFromLine size={20} /> : <ArrowDownToLine size={20} />}
            </button>

            {/* Results */}
            {report && (
                <div>
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <p className="text-sm text-gray-500 mb-1">Total distance</p>
                            <p className="text-2xl font-semibold text-gray-800">{totalKm.toFixed(1)} km</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <p className="text-sm text-gray-500 mb-1">Active days</p>
                            <p className="text-2xl font-semibold text-gray-800">
                                {activeDays} <span className="text-base font-normal text-gray-400">/ {report.length}</span>
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <p className="text-sm text-gray-500 mb-1">Avg per active day</p>
                            <p className="text-2xl font-semibold text-gray-800">{avgKm.toFixed(1)} km</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-md">
                        <div className="overflow-auto max-h-[55vh]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-6 py-3 font-semibold text-gray-600">#</th>
                                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Distance</th>
                                    <th className="text-left px-6 py-3 font-semibold text-gray-600 w-48">Visual</th>
                                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.map((day, idx) => {
                                    const barPct = maxKm > 0 ? (day.distanceKm / maxKm) * 100 : 0;
                                    const isActive = day.distanceKm > 0;
                                    return (
                                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                                            <td className="px-6 py-3 text-gray-700 font-medium">
                                                {formatDate(day.date)}
                                            </td>
                                            <td className={`px-6 py-3 font-semibold ${isActive ? 'text-gray-800' : 'text-gray-300'}`}>
                                                {day.distanceKm.toFixed(1)} km
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${barPct}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                    isActive
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                    {isActive ? 'active' : 'no data'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <button
                                                    onClick={() => goToRoute(day)}
                                                    disabled={!isActive}
                                                    title={isActive ? 'View route on map' : 'No data for this day'}
                                                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-blue-200 text-blue-600 hover:bg-blue-50"
                                                >
                                                    <MapPin size={13} />
                                                    View route
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                        <p className="text-xs text-gray-400 px-6 py-3 border-t border-gray-50">
                            {MONTHS[parseInt(month) - 1]} {year} · {report.length} days · {employee}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}