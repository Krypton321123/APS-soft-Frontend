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
import { Flag, ChevronDown, ChevronUp } from 'lucide-react';

// Flag/Category options
const FLAG_OPTIONS = [
  { value: 'A', label: 'Flag A', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'B', label: 'Flag B', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'C', label: 'Flag C', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'D', label: 'Flag D', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'NONE', label: 'No Flag', color: 'bg-gray-100 text-gray-800 border-gray-300' }
];

function Images() {
  // State for selections
  const [depot, setDepot] = useState('');
  const [employee, setEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFlag, setSelectedFlag] = useState('ALL');
  const [groupByFlag, setGroupByFlag] = useState(false);
  
  // State for images and selected image
  const [images, setImages] = useState<any>([]);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [totals, setTotals] = useState<any>({}); 

  console.log(totals)
  
  // Frontend-only party flags state
  const [partyFlags, setPartyFlags] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('partyFlags');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);

  const [depotOptions, setDepotOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);

  // Save party flags to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('partyFlags', JSON.stringify(partyFlags));
  }, [partyFlags]);

  // Fetch depot options on component mount
  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/images/depots`);
        setDepotOptions(response.data);
      } catch (error) {
        console.error('Failed to fetch depots', error);
      }
    };
    fetchDepots();
  }, []);

  // Fetch employees when depot changes
  useEffect(() => {
    if (depot) {
      const fetchEmployees = async () => {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/images/employees?depot=${depot}`);
          setEmployeeOptions(response.data);
        } catch (error) {
          console.error('Failed to fetch employees', error);
        }
      };
      fetchEmployees();
    } else {
      setEmployeeOptions([]);
      setEmployee('');
    }
  }, [depot]);

  // Update party flag (frontend only)
  const updatePartyFlag = (partyId: string, flag: string) => {
    setPartyFlags(prev => ({ ...prev, [partyId]: flag }));
    setEditingPartyId(null);
  };

  // Get flag for a party
  const getPartyFlag = (partyId: string) => {
    return partyFlags[partyId] || 'NONE';
  };

  // Get flag color class
  const getFlagColorClass = (flag: string) => {
    const option = FLAG_OPTIONS.find(opt => opt.value === flag);
    return option?.color || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Filter and group images
  const processedData = useMemo(() => {
    let filtered = images;

    // Filter by selected flag
    if (selectedFlag !== 'ALL') {
      filtered = filtered.filter((img: any) => getPartyFlag(img.partyId) === selectedFlag);
    }

    // Group by flag if enabled
    if (groupByFlag) {
      const grouped: Record<string, any[]> = {};
      filtered.forEach((img: any) => {
        const flag = getPartyFlag(img.partyId);
        if (!grouped[flag]) {
          grouped[flag] = [];
        }
        grouped[flag].push(img);
      });
      return grouped;
    }

    return filtered;
  }, [images, selectedFlag, groupByFlag, partyFlags]);

  // Calculate totals for filtered data
  const filteredTotals = useMemo(() => {
    const data = groupByFlag ? Object.values(processedData).flat() : processedData;
    return {
      totalOrderQuantity: data.reduce((sum: number, img: any) => sum + (Number(img.orderQuantity) || 0), 0),
      totalCollectionAmt: data.reduce((sum: number, img: any) => sum + (Number(img.collectionAmount) || 0), 0),
      totalOutstanding: data.reduce((sum: number, img: any) => sum + (Number(img.outstanding) || 0), 0)
    };
  }, [processedData, groupByFlag]);

  const columnHelper = createColumnHelper<any>();

  const columns = [
    columnHelper.accessor((_, index) => index + 1, {
      id: 'serial',
      header: 'S. No.',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('profileImageUrl', {
      header: 'Image',
      cell: info => (
        <img 
          src={info.getValue()}
          className="w-16 h-16 object-cover cursor-pointer hover:opacity-75"
          onClick={() => setSelectedImage(info.row.original)}
        />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date Time',
      cell: info => {
        const dateForDisplay = new Date(info.getValue());
        const year = dateForDisplay.getFullYear(); 
        const month = dateForDisplay.getMonth() + 1; 
        const dd = dateForDisplay.getDate(); 
        return `${dd}-${month}-${year}`;
      },
    }),
    columnHelper.accessor('partyId', {
      header: 'Party ID',
      cell: info => (
        <div>
          <p className='text-md'>{info.row.original.partyName}</p>
          <p className='text-sm text-gray-500'>{info.getValue()}</p>
          <div className="mt-1">
            {editingPartyId === info.getValue() ? (
              <select
                value={getPartyFlag(info.getValue())}
                onChange={(e) => updatePartyFlag(info.getValue(), e.target.value)}
                className="text-xs border rounded px-1 py-0.5"
                onBlur={() => setEditingPartyId(null)}
                autoFocus
              >
                {FLAG_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingPartyId(info.getValue())}
                className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${getFlagColorClass(getPartyFlag(info.getValue()))}`}
              >
                <Flag className="w-3 h-3" />
                {FLAG_OPTIONS.find(opt => opt.value === getPartyFlag(info.getValue()))?.label}
              </button>
            )}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('orderQuantity', {
      header: 'Order Quantity',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('collectionAmount', {
      header: 'Collection Amount',
      cell: info => info.getValue() as number,
    }),
    columnHelper.accessor('outstanding', {
      header: 'Outstanding Amount',
      cell: info => info.getValue(),
    }),
  ];

  const table = useReactTable({
    data: groupByFlag ? [] : (processedData as any[]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleDownloadPDF = async () => {
    const canvas = await html2canvas(document.getElementById('table-div')!)

    try {
      const imgWidth = canvas.width / 3; 
      const imgHeight = canvas.height / 3; 
      const pdfHeight = imgHeight + 100;
      const imageData = canvas.toDataURL('image/png'); 
      const pdf = new jsPDF({
        orientation: 'p', 
        unit: 'px', 
        format: [imgWidth, pdfHeight]
      }); 
 
      const pageWidth = pdf.internal.pageSize.getWidth(); 
     
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("MAHESH EDIBLE OILS PRODUCTS PVT LTD", pageWidth / 2, 15, { align: "center" });
      pdf.setFont("helvetica", "regular")
      pdf.setFontSize(14)
      pdf.text("Daily Working Report", pageWidth / 2, 30, { align: "center" });
      pdf.text(`Employee Name - ${employee}`, pageWidth / 2, 45, { align: "center" });
      pdf.text(`From - ${startDate} To - ${endDate}`, pageWidth / 2, 60, { align: "center" });
      pdf.addImage(imageData, 'JPEG', 5, 75, imgWidth, imgHeight)
      const fileNameTimeStamp = new Date().toISOString().split('T')
      pdf.save(`dwr-${fileNameTimeStamp[0]}-${fileNameTimeStamp[1]}.pdf`)
    } catch (err: any) {
      console.log("unexpected error came: ", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowNoResults(false);
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/images/getImages`, {
        params: { depot, employee, startDate, endDate }
      });
      setImages(response.data.data.sendData);
      setTotals(response.data.data.total)
      if (response.data.length === 0) {
        setShowNoResults(true);
      }
    } catch (error) {
      console.error('Failed to fetch images', error);
      setImages([]);
      setShowNoResults(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDepot('');
    setEmployee('');
    setStartDate('');
    setEndDate('');
    setImages([]);
    setShowNoResults(false);
    setSelectedFlag('ALL');
    setGroupByFlag(false);
  };

  const handleClearAllFlags = () => {
    if (confirm('Are you sure you want to clear all party flags?')) {
      setPartyFlags({});
      localStorage.removeItem('partyFlags');
    }
  };

  return (
    <div className="container bg-white mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Image Gallery</h1>
      <div className="mb-4 text-sm text-gray-600 flex justify-between items-center">
        <span>Note: Depot names and employees are fetched from the backend. Party flags are stored locally in your browser.</span>
       {images.length !== 0 && <button onClick={handleDownloadPDF} className='p-2 bg-blue-600 rounded-lg text-white cursor-pointer mr-4 hover:opacity-75 transition-opacity duration-100'>
          Download PDF
        </button>}
      </div>
      
      {/* Selection form */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2">
                Depot:
              </label>
              <select
                value={depot}
                onChange={(e) => setDepot(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
              >
                <option value="">Select Depot</option>
                {depotOptions.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2">
                Employee:
              </label>
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
                disabled={!depot || employeeOptions.length === 0}
              >
                <option value="">{employeeOptions.length ? 'Select Employee' : 'Select depot first'}</option>
                {employeeOptions.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2">
                From:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
              />
            </div>
            
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2">
                To:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
              />
            </div>
            
            <div className="flex items-end space-x-4">
              <button
                type="button"
                onClick={handleReset}
                className="bg-gray-300 text-gray-800 rounded p-2.5 w-full h-12 hover:bg-gray-400 transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded p-2.5 w-full h-12 hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Flag Filter Controls */}
      {images.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-gray-600" />
            <span className="font-semibold">Filter by Flag:</span>
          </div>
          <select
            value={selectedFlag}
            onChange={(e) => setSelectedFlag(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5"
          >
            <option value="ALL">All Flags</option>
            {FLAG_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByFlag}
              onChange={(e) => setGroupByFlag(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Group by Flag</span>
          </label>

          <button
            onClick={handleClearAllFlags}
            className="ml-auto text-sm text-red-600 hover:text-red-800 underline"
          >
            Clear All Flags
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {showNoResults && !loading && (
        <div className="text-center py-8 bg-yellow-50 rounded-lg">
          <p className="text-lg">No images found. Please try different filters.</p>
        </div>
      )}

      {/* Table or Grouped View */}
      {images.length !== 0 && (
        <div id="table-div" className="rounded-t-2xl overflow-hidden border border-gray-200">
          {groupByFlag ? (
            // Grouped View
            <div className="divide-y divide-gray-300">
              {Object.entries(processedData as Record<string, any[]>).map(([flag, items]) => (
                <div key={flag} className="bg-white">
                  <div className={`px-4 py-3 font-semibold flex items-center gap-2 ${getFlagColorClass(flag)}`}>
                    <Flag className="w-4 h-4" />
                    {FLAG_OPTIONS.find(opt => opt.value === flag)?.label} ({items.length} items)
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-gray-500 font-normal p-4">S. No.</th>
                        <th className="text-gray-500 font-normal p-4">Image</th>
                        <th className="text-gray-500 font-normal p-4">Date Time</th>
                        <th className="text-gray-500 font-normal p-4">Party ID</th>
                        <th className="text-gray-500 font-normal p-4">Order Qty</th>
                        <th className="text-gray-500 font-normal p-4">Collection</th>
                        <th className="text-gray-500 font-normal p-4">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((img: any, index: number) => {
                        const dateForDisplay = new Date(img.createdAt);
                        const formattedDate = `${dateForDisplay.getDate()}-${dateForDisplay.getMonth() + 1}-${dateForDisplay.getFullYear()}`;
                        
                        return (
                          <tr key={index}>
                            <td className="px-4 py-2 text-center">{index + 1}</td>
                            <td className="px-4 py-2">
                              <img 
                                src={img.profileImageUrl}
                                className="w-16 h-16 object-cover cursor-pointer hover:opacity-75 mx-auto"
                                onClick={() => setSelectedImage(img)}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">{formattedDate}</td>
                            <td className="px-4 py-2">
                              <p className="text-md">{img.partyName}</p>
                              <p className="text-sm text-gray-500">{img.partyId}</p>
                            </td>
                            <td className="px-4 py-2 text-center">{img.orderQuantity}</td>
                            <td className="px-4 py-2 text-center">{img.collectionAmount}</td>
                            <td className="px-4 py-2 text-center">{img.outstanding}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            // TanStack Table View
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="text-gray-500 font-normal tracking-normal p-4 cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span>
                              {{
                                asc: <ChevronUp className="w-4 h-4" />,
                                desc: <ChevronDown className="w-4 h-4" />,
                              }[header.column.getIsSorted() as string] ?? null}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2 text-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-center">-</td>
                  <td className="px-4 py-2 text-center">-</td>
                  <td className="px-4 py-2 text-center">-</td>
                  <td className="px-4 py-2 text-center">Total</td>
                  <td className="px-4 py-2 text-center">{filteredTotals.totalOrderQuantity}</td>
                  <td className="px-4 py-2 text-center">{filteredTotals.totalCollectionAmt}</td>
                  <td className="px-4 py-2 text-center">{filteredTotals.totalOutstanding}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {/* Image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage?.profileImageUrl}
              alt="Full size"
              className="max-w-full max-h-[80vh] object-contain"
            />
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-100"
              onClick={() => setSelectedImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Images;