import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
// @ts-ignore
import { LatLngExpression } from 'leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import axios from 'axios';
import MapPanner from '../components/MapPanner';
import { RotateCcw, Search, SlidersHorizontal, ChevronsUpDown, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// ── Sub-components ─────────────────────────────────────────────────────────────

const SelectField = ({
  label, value, onChange, children, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: '#9496b0',
        fontWeight: 500,
      }}
    >
      {label}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 rounded-lg border px-3 text-sm bg-white appearance-none cursor-pointer focus:outline-none transition-all duration-150"
      style={{
        borderColor: '#e8e9ef',
        color: value ? '#1a1a2e' : '#b0b2c0',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </select>
  </div>
);

const DateField = ({
  label, value, onChange, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: '#9496b0',
        fontWeight: 500,
      }}
    >
      {label}
    </label>
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 rounded-lg border px-3 text-sm bg-white focus:outline-none transition-all duration-150"
      style={{
        borderColor: '#e8e9ef',
        color: value ? '#1a1a2e' : '#b0b2c0',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    />
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Location() {
  const [searchParams] = useSearchParams();

  const [coordinates, setCoordinates] = useState<LatLngExpression[]>([]);
  const [isFilterOpen, setIsFilterOpen]   = useState(true);
  const [center, setCenter]               = useState<LatLngExpression>([25.3863479, 82.9961421]);
  const [depot, setDepot]                 = useState(searchParams.get('depot') || '');
  const [employee, setEmployee]           = useState(searchParams.get('employee') || '');
  const [date, setDate]                   = useState(searchParams.get('date') || '');
  const [loading, setLoading]             = useState(false);

  const [depotOptions, setDepotOptions]       = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);

  const markerIcon = new L.Icon({
    iconUrl: '/map-marker.jpg',
    iconSize: [30, 38],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Fetch depots
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/images/depots`).then(res => {
      const allowed = JSON.parse(localStorage.getItem('allowedLocations') || '[]');
      if (!allowed?.length) return setDepotOptions(res.data);
      setDepotOptions(res.data.filter((d: string) => allowed.includes(d.toUpperCase().slice(0, 3))));
    }).catch(err => console.error('Failed to fetch depots', err));
  }, []);

  // Fetch employees on depot change
  useEffect(() => {
    if (!depot) { setEmployeeOptions([]); setEmployee(''); return; }
    axios.get(`${import.meta.env.VITE_API_URL}/images/employees?depot=${depot}`)
      .then(res => setEmployeeOptions(res.data))
      .catch(err => console.error('Failed to fetch employees', err));
  }, [depot]);

  // Auto-fetch from query params
  useEffect(() => {
    const pd = searchParams.get('depot');
    const pe = searchParams.get('employee');
    const pdt = searchParams.get('date');
    if (pd && pe && pdt && employeeOptions.length > 0) {
      fetchLocationData(pe, pdt);
    }
  }, [employeeOptions]);

  const fetchLocationData = async (emp: string, dt: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/location/getLocationData`, {
        params: { depot, employee: emp, date: dt },
      });
      if (res.status === 200) {
        if (!res.data.data.coordinates) {
          toast("This user doesn't have any location data for this date");
          return;
        }
        setCoordinates(res.data.data.coordinates);
        setCenter(res.data.data.coordinates[0]);
        setIsFilterOpen(false);
      } else {
        toast('Failed to pull location data');
      }
    } catch {
      toast('Failed to pull location data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => fetchLocationData(employee, date);

  const handleReset = () => {
    setDepot('');
    setEmployee('');
    setDate('');
    setCoordinates([]);
    setIsFilterOpen(true);
  };

  return (
    <div
      className="h-full flex flex-col gap-3 p-4"
      style={{ fontFamily: "'DM Sans', sans-serif", background: '#f2f3f7' }}
    >
      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center justify-between flex-shrink-0"
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
            Route Maps
          </h1>
          <p style={{ fontSize: 12, color: '#b0b2c0', marginTop: 2 }}>
            Track employee movement routes by date
          </p>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setIsFilterOpen(p => !p)}
          className="flex items-center gap-2 h-8 px-3 rounded-lg border transition-all duration-150 hover:opacity-80"
          style={{
            background: isFilterOpen ? '#eef0fd' : '#ffffff',
            borderColor: isFilterOpen ? '#c7cdf7' : '#e8e9ef',
            color: isFilterOpen ? '#5b6af0' : '#6b6d85',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <SlidersHorizontal size={13} />
          {isFilterOpen ? 'Hide filters' : 'Show filters'}
          <ChevronsUpDown size={12} style={{ opacity: 0.6 }} />
        </button>
      </motion.div>

      {/* ── Filter panel ── */}
      <AnimatePresence initial={false}>
        {isFilterOpen && (
          <motion.div
            key="filter-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden flex-shrink-0"
          >
            <div
              className="rounded-xl p-5"
              style={{ background: '#ffffff', border: '0.5px solid #e8e9ef' }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <SelectField label="Depot" value={depot} onChange={setDepot}>
                  <option value="">Select depot</option>
                  {depotOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
                </SelectField>

                <SelectField
                  label="Employee"
                  value={employee}
                  onChange={setEmployee}
                  disabled={!depot || !employeeOptions.length}
                >
                  <option value="">{employeeOptions.length ? 'Select employee' : 'Select depot first'}</option>
                  {employeeOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
                </SelectField>

                <DateField
                  label="Date"
                  value={date}
                  onChange={setDate}
                  disabled={!depot || !employee}
                />

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: 11, color: 'transparent', userSelect: 'none' }}>_</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center justify-center gap-1.5 h-9 flex-1 rounded-lg text-sm transition-all duration-150 hover:opacity-80"
                      style={{
                        background: '#f4f5fa',
                        color: '#6b6d85',
                        border: '0.5px solid #e8e9ef',
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!depot || !employee || !date || loading}
                      className="flex items-center justify-center gap-1.5 h-9 flex-1 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-85"
                      style={{
                        background: '#5b6af0',
                        color: '#fff',
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        opacity: (!depot || !employee || !date || loading) ? 0.6 : 1,
                      }}
                    >
                      {loading ? (
                        <div
                          className="w-4 h-4 rounded-full border-2 animate-spin"
                          style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                        />
                      ) : (
                        <>
                          <Search size={13} />
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active filter pills */}
              {(depot || employee || date) && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span style={{ fontSize: 11, color: '#b0b2c0' }}>Active:</span>
                  {depot && (
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#eef0fd', color: '#5b6af0', fontWeight: 500 }}>
                      {depot}
                    </span>
                  )}
                  {employee && (
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#eef0fd', color: '#5b6af0', fontWeight: 500 }}>
                      {employee}
                    </span>
                  )}
                  {date && (
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#eef0fd', color: '#5b6af0', fontWeight: 500 }}>
                      {date}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Map card ── */}
      <motion.div
        layout
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 rounded-xl overflow-hidden relative"
        style={{
          border: '0.5px solid #e8e9ef',
          minHeight: 300,
        }}
      >
        {/* Route badge */}
        <AnimatePresence>
          {coordinates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: '#ffffff', border: '0.5px solid #e8e9ef', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <MapPin size={12} style={{ color: '#5b6af0' }} />
              <span style={{ fontSize: 12, color: '#1a1a2e', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                {coordinates.length} waypoints
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#22c55e' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state overlay */}
        <AnimatePresence>
          {coordinates.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-[999] flex items-center justify-center pointer-events-none"
            >
              <div
                className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #e8e9ef', backdropFilter: 'blur(6px)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#f4f5fa' }}
                >
                  <MapPin size={18} style={{ color: '#b0b2c0' }} />
                </div>
                <p style={{ fontSize: 13, color: '#6b6d85', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                  No route loaded
                </p>
                <p style={{ fontSize: 11, color: '#b0b2c0', fontFamily: "'DM Sans', sans-serif" }}>
                  Select depot, employee and date to view route
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <MapPanner center={center} />
          <TileLayer
            url="http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps"
          />
          <Polyline positions={coordinates} color="#5b6af0" weight={3} opacity={0.8} />
          {coordinates.map((item, idx) => (
            <Marker key={idx} title={idx.toString()} position={item} icon={markerIcon} />
          ))}
        </MapContainer>
      </motion.div>
    </div>
  );
}