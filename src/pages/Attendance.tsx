import React, { useState, useEffect } from 'react';


const Attendance: React.FC = () => {
  // State for dropdown selections
  const [selectedDepot, setSelectedDepot] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<{name: string, days: number}>({name: 'June', days: 30});
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [depots, setDepots] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const months = [
  { name: 'January', days: 31 },
  { name: 'February', days: 28 }, 
  { name: 'March', days: 31 },
  { name: 'April', days: 30 },
  { name: 'May', days: 31 },
  { name: 'June', days: 30 },
  { name: 'July', days: 31 },
  { name: 'August', days: 31 },
  { name: 'September', days: 30 },
  { name: 'October', days: 31 },
  { name: 'November', days: 30 },
  { name: 'December', days: 31 }
];
  const years = [2023, 2024, 2025];

  // Fetch depot names on component mount
  useEffect(() => {
    const fetchDepots = async () => {
      try {
        console.log(import.meta.env)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance/getDepots`);
        const data = await response.json();
        if (data.statusCode === 200) {
          setDepots(data.data);
          if (data.data.length > 0) {
            setSelectedDepot(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch depots:', error);
      }
    };
    fetchDepots();
  }, []);

  // Fetch attendance data when filters change
  useEffect(() => {
    if (!selectedDepot) return;
    
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          depot: selectedDepot,
          month: selectedMonth.name,
          year: selectedYear.toString()
        });
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance/getAttendance?${params}`);
        const data = await response.json();
        
        if (data.statusCode === 200) {
          setAttendanceData(data.data);
          console.log(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendance();
  }, [selectedDepot, selectedMonth, selectedYear]);

  return (
    <div className="p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Depot Selector */}
        <div className="w-full md:w-48">
          <label htmlFor="depot-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Depot
          </label>
          <select
            id="depot-select"
            value={selectedDepot}
            onChange={(e) => setSelectedDepot(e.target.value)}
            className="w-full p-2 border border-blue-500 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {depots.map(depot => (
              <option key={depot} value={depot}>{depot}</option>
            ))}
          </select>
        </div>
        
        {/* Month Selector */}
        <div className="w-full md:w-48">
          <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <select
            id="month-select"
            value={selectedMonth.name}
            onChange={(e) => setSelectedMonth({name: e.target.value, days: (months.filter((item) => item.name === e.target.value)[0].days)})}
            className="w-full p-2 border border-blue-500 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map(month => (
              <option key={month.name} value={month.name}>{month.name}</option>
            ))}
          </select>
        </div>
        
        {/* Year Selector */}
        <div className="w-full md:w-32">
          <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full p-2 border border-blue-500 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="overflow-x-auto overflow-y-scroll border border-blue-500 rounded-md max-h-[68vh]">
        <table className="min-w-full">
          <thead>
            <tr className="bg-blue-500 text-white">
              {/* Employee column header */}
              <th className="sticky left-0 p-3 text-left bg-blue-500 z-10">Employee</th>
              
              {/* Day headers */}
              {Array.from({ length: selectedMonth.days }, (_, i) => i + 1).map(day => (
                <th key={day} className="p-3 text-center border-l border-blue-400">{day}</th>
              ))}
              
              {/* Summary headers */}
              <th className="p-3 text-center border-l border-blue-400 bg-blue-600">Total Present</th>
              <th className="p-3 text-center border-l border-blue-400 bg-blue-600">Total Days</th>
              <th className="p-3 text-center border-l border-blue-400 bg-blue-600">Net Absent</th>
            </tr>
          </thead>
          
          <tbody>
            {attendanceData.map((data, index) => (
              <tr 
                key={data.employee} 
                className={index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}
              >
                {/* Employee name (sticky) */}
                <td className="sticky left-0 p-3 font-medium bg-white border-r border-blue-200">
                  {data.employee}
                </td>
                
                {/* Daily status */}
                {data.statuses.map((status: string, dayIndex: number) => (
                  <td
                    key={`day-${dayIndex}`}
                    className={`p-2 text-center border-l border-t border-blue-200 ${
                      status === 'present' ? 'text-green-600' :
                      status === '-' ? 'text-black' : 'text-blue-600'
                    }`}
                  >
                    {status}
                  </td>
                ))}
                
                {/* Summary columns */}
                <td className="p-3 text-center font-medium border-l border-blue-200 bg-blue-100">
                  {data.totalPresent}
                </td>
                <td className="p-3 text-center border-l border-blue-200 bg-blue-100">
                  {data.totalDays}
                </td>
                <td className="p-3 text-center font-medium border-l border-blue-200 bg-blue-100">
                  {data.netAbsent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md">Loading attendance data...</div>
        </div>
      )}
    </div>
  );
};

export default Attendance;