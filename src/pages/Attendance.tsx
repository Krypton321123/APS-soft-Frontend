import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const Attendance: React.FC = () => {
  const [selectedDepot, setSelectedDepot] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<{ name: string; days: number }>({ name: 'June', days: 30 });
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [depots, setDepots] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const months = [
    { name: 'January', days: 31 }, { name: 'February', days: 28 },
    { name: 'March', days: 31 },   { name: 'April', days: 30 },
    { name: 'May', days: 31 },     { name: 'June', days: 30 },
    { name: 'July', days: 31 },    { name: 'August', days: 31 },
    { name: 'September', days: 30 },{ name: 'October', days: 31 },
    { name: 'November', days: 30 }, { name: 'December', days: 31 },
  ];
  const years = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

  useEffect(() => {
    const current = new Date();
    setSelectedMonth(months[current.getMonth()]);
    setSelectedYear(current.getFullYear());
  }, []);

  useEffect(() => {
    const fetchDepots = async () => {
      let allowedData: string[] = [];
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance/getDepots`);
        const data = await response.json();
        if (data.statusCode === 200) {
           
          const allowedLocations = JSON.parse(localStorage.getItem('allowedLocations') || '');
          console.log("allowed: ", allowedLocations);
          if (!allowedLocations || allowedLocations.length === 0) {
            setDepots(data.data);
            
          } else {
            allowedData = data.data.filter((item: string) =>
              allowedLocations.includes(item.toUpperCase().slice(0, 3))
            );
            setDepots(allowedData);
          }
          if (allowedData.length > 0) setSelectedDepot(allowedData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch depots:', error);
      }
    };
    fetchDepots();
  }, []);

  useEffect(() => {
    if (!selectedDepot) return;
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          depot: selectedDepot,
          month: selectedMonth.name,
          year: selectedYear.toString(),
        });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance/getAttendance?${params}`);
        const data = await response.json();
        if (data.statusCode === 200) setAttendanceData(data.data);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedDepot, selectedMonth, selectedYear]);

  const getCellVariant = (status: string) => {
    if (status === 'present' || status === 'P') return 'present';
    if (status === '-') return 'off';
    return 'absent';
  };

  const getCellDisplay = (status: string) => {
    if (status === 'present') return 'P';
    return status;
  };

  const SelectField = ({
    label,
    value,
    onChange,
    children,
    width = 'w-36',
  }: {
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
    width?: string;
  }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-widest uppercase text-zinc-400">
        {label}
      </span>
      <div className={`relative ${width}`}>
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 font-mono cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all hover:border-zinc-400 pr-8"
        >
          {children}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="w-full p-8 bg-zinc-50 min-h-screen">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-7"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Attendance Register
          </span>
          <span className="h-px w-8 bg-zinc-300 block" />
          <span className="text-[10px] font-mono text-zinc-400">
            {selectedMonth.name} {selectedYear}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          Attendance
        </h1>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-end gap-3 mb-5"
      >
        <SelectField
          label="Depot"
          value={selectedDepot}
          onChange={(e) => setSelectedDepot(e.target.value)}
          width="w-44"
        >
          {depots.map(depot => <option key={depot} value={depot}>{depot}</option>)}
        </SelectField>

        <SelectField
          label="Month"
          value={selectedMonth.name}
          onChange={(e) => setSelectedMonth(months.find(m => m.name === e.target.value)!)}
          width="w-36"
        >
          {months.map(month => <option key={month.name} value={month.name}>{month.name}</option>)}
        </SelectField>

        <SelectField
          label="Year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          width="w-24"
        >
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </SelectField>

        <AnimatePresence>
          {!loading && attendanceData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-xs font-mono text-zinc-500 self-end"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {attendanceData.length} employees
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-zinc-200 bg-white overflow-auto max-h-[56vh] shadow-sm"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e4e4e7 transparent' }}
      >
        <table className="border-collapse min-w-full text-sm">
          <thead>
            <tr>
              {/* Employee sticky header */}
              <th className="sticky left-0 top-0 z-20 bg-zinc-50 border-b border-r border-zinc-100 text-left px-5 py-3 text-[10px] font-medium tracking-widest uppercase text-zinc-400 min-w-[180px] whitespace-nowrap">
                Employee
              </th>

              {/* Day headers */}
              {Array.from({ length: selectedMonth.days }, (_, i) => i + 1).map(day => (
                <th
                  key={day}
                  className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-100 py-3 min-w-[32px] w-8 text-center text-[10px] font-mono font-normal text-zinc-400"
                >
                  {day}
                </th>
              ))}

              {/* Summary headers */}
              {[
                { label: 'Present', color: 'text-emerald-600' },
                { label: 'Days', color: 'text-zinc-500' },
                { label: 'Absent', color: 'text-rose-500' },
              ].map(({ label, color }) => (
                <th
                  key={label}
                  className={`sticky top-0 z-10 bg-zinc-50 border-b border-l border-zinc-100 px-4 py-3 text-[10px] font-medium tracking-widest uppercase whitespace-nowrap text-center ${color}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <motion.tr
                    key={`sk-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-zinc-50"
                  >
                    <td className="sticky left-0 bg-white border-r border-zinc-50 px-5 py-3">
                      <div
                        className="h-3 rounded bg-zinc-100 animate-pulse"
                        style={{ width: 90 + (i % 3) * 24 }}
                      />
                    </td>
                    {Array.from({ length: selectedMonth.days }).map((_, j) => (
                      <td key={j} className="py-3 px-0 text-center">
                        <div className="h-3 w-3 rounded bg-zinc-100 animate-pulse mx-auto" />
                      </td>
                    ))}
                    {[0, 1, 2].map(k => (
                      <td key={k} className="px-4 py-3 border-l border-zinc-50">
                        <div className="h-3 w-5 rounded bg-zinc-100 animate-pulse mx-auto" />
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                attendanceData.map((data, index) => (
                  <motion.tr
                    key={data.employee}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.015, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-zinc-50 hover:bg-zinc-50/80 transition-colors group"
                  >
                    {/* Employee name */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-zinc-50/80 border-r border-zinc-100 px-5 py-2.5 font-medium text-zinc-800 text-[13px] whitespace-nowrap transition-colors">
                      {data.employee}
                    </td>

                    {/* Daily status cells */}
                    {data.statuses.map((status: string, dayIndex: number) => {
                      const variant = getCellVariant(status);
                      return (
                        <td key={dayIndex} className="py-2.5 px-0 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded text-[10px] font-mono font-medium mx-auto
                              ${variant === 'present' ? 'bg-emerald-50 text-emerald-600' : ''}
                              ${variant === 'absent'  ? 'bg-rose-50 text-rose-500' : ''}
                              ${variant === 'off'     ? 'text-zinc-300' : ''}
                            `}
                          >
                            {getCellDisplay(status)}
                          </span>
                        </td>
                      );
                    })}

                    {/* Summary cells */}
                    <td className="px-4 py-2.5 text-center font-mono text-[13px] font-medium text-emerald-600 border-l border-zinc-100 bg-zinc-50/50">
                      {data.totalPresent}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-[13px] text-zinc-400 bg-zinc-50/50">
                      {data.totalDays}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-mono text-[13px] border-l border-zinc-100 bg-zinc-50/50 ${data.netAbsent > 0 ? 'text-rose-500 font-medium' : 'text-zinc-300'}`}>
                      {data.netAbsent}
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Empty state */}
        {!loading && attendanceData.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-2"
          >
            <svg className="text-zinc-300 mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-sm font-medium text-zinc-400">No records found</p>
            <p className="text-xs text-zinc-300">Select a depot to load attendance data</p>
          </motion.div>
        )}
      </motion.div>

      {/* Legend */}
      <AnimatePresence>
        {!loading && attendanceData.length > 0 && (
          <motion.div
            key="legend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-5 mt-4"
          >
            {[
              { label: 'Present', badge: 'P', bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { label: 'Absent', badge: 'A', bg: 'bg-rose-50', text: 'text-rose-500' },
              { label: 'Holiday / Off', badge: '—', bg: 'bg-zinc-50', text: 'text-zinc-300' },
            ].map(({ label, badge, bg, text }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-zinc-400">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-mono font-medium ${bg} ${text}`}>
                  {badge}
                </span>
                {label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Attendance;