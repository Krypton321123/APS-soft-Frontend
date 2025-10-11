import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Images() {
  // State for selections
  const [depot, setDepot] = useState('');
  const [employee, setEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for images and selected image
  const [images, setImages] = useState<any>([]);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [totals, setTotals] = useState<any>({}); 

  const [depotOptions, setDepotOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowNoResults(false);
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/images/getImages`, {
        params: { depot, employee, startDate, endDate }
      });
      console.log(response)
      setImages(response.data.data.sendData);
      setTotals(response.data.data.total)
      if (response.data.length === 0) {
        setShowNoResults(true);
      }
      console.log(images)
    } catch (error) {
      console.error('Failed to fetch images', error);
      setImages([]);
      setShowNoResults(true);
    } finally {
      setLoading(false);
    }
  };

  // Reset all filters
  const handleReset = () => {
    setDepot('');
    setEmployee('');
    setStartDate('');
    setEndDate('');
    setImages([]);
    setShowNoResults(false);
  };

  return (
    <div className="container bg-white mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Image Gallery</h1>
      <div className="mb-4 text-sm text-gray-600">
        Note: Depot names and employees are fetched from the backend
      </div>
      
      {/* Selection form */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2" aria-label="Depot selection">
                Depot:
              </label>
              <select
                value={depot}
                onChange={(e) => setDepot(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
                aria-required="true"
              >
                <option value="">Select Depot</option>
                {depotOptions.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2" aria-label="Employee selection">
                Employee:
              </label>
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
                aria-required="true"
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
              <label className="font-bold text-base mb-2" aria-label="Start date">
                From:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
                aria-required="true"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="font-bold text-base mb-2" aria-label="End date">
                To:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded p-2.5"
                required
                aria-required="true"
              />
            </div>
            
            <div className="flex items-end space-x-4">
              <button
                type="button"
                onClick={handleReset}
                className="bg-gray-300 text-gray-800 rounded p-2.5 w-full h-12 hover:bg-gray-400 transition-colors"
                aria-label="Reset filters"
              >
                Reset
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded p-2.5 w-full h-12 hover:bg-blue-700 transition-colors"
                aria-label="Search images"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>
      

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
      

      {images.length !== 0 && <div className="grid grid-cols-1">
        <div className='py-4'>
          <p></p>
        </div>
        <div className='rounded-t-2xl overflow-hidden border border-gray-200'>
        <table className='w-full divide-y divide-gray-200 '>
          <thead className=''>
                <tr className='bg-gray-100'>
                  <th className='text-gray-500 font-normal tracking-normal p-4 px-10'>
                    Image
                  </th>
                  <th className='text-gray-500 font-normal tracking-normal p-4'>
                    Date Time
                  </th>
                 <th className='text-gray-500 font-normal tracking-normal p-4'>
                    Party ID 
                  </th>
                  <th className='text-gray-500 font-normal tracking-normal p-4'>
                    Order Quantity
                  </th>
                  <th className='text-gray-500 font-normal tracking-normal p-4'>
                    Collection Amount
                  </th>
                  <th className='text-gray-500 font-normal tracking-normal p-4'>
                    Outstanding Amount
                  </th>
                </tr>
          </thead>
          <tbody className='divide-y divide-gray-400'>
          {images.map((img: any, index: number) => { 
            let dateForDisplay = new Date(img.createdAt);
            const year = dateForDisplay.getFullYear(); 
            const month = dateForDisplay.getMonth()
            const dd = dateForDisplay.getDate(); 
            const formattedDate = `${dd}-${month}-${year}`
    
            return (
   
             <tr className='' key={index}>
            {/* <div
              key={index}
              className="cursor-pointer bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => setSelectedImage(img)}
              aria-label={`Image ${index + 1}`}
            > */}
  
               
                  <td className='px-4 py-2 w-24 h-24' onClick={() => setSelectedImage(img)}>
                    <img 
                    src={img.profileImageUrl}/>
                  </td>
                  <td className='px-4 py-2 text-center text-md'>
                    <p>{formattedDate}</p>
                  </td>
                  <td className='px-2 py-2 text-left'>
                    <p className='text-md'>{img.partyName}</p>
                    <p className='text-sm text-gray-500'>{img.partyId}</p>
                  </td>
                  <td className='px-4 py-2 text-center'>
                    {img.orderQuantity}
                  </td> 
                  <td className='px-4 py-2 text-center'>
                    {img.collectionAmount}
                  </td>
                  <td className='px-4 py-2 text-center'>
                    {img.outstanding}
                  </td>
              

             {/* </div> */}
            </tr>
          )})}
          {/* totalOutstanding, totalOrderQuantity, totalCollectionAmt */}
          <tr>
            <td className='px-4 py-2 text-center'>-</td>
            <td className='px-4 py-2 text-center'>-</td>
            <td className='px-4 py-2 text-center'>-</td>
            <td className='px-4 py-2 text-center'>
              {totals?.totalOrderQuantity}
            </td>
            <td className='px-4 py-2 text-center'>
              {totals.totalCollectionAmt}
            </td>
            <td className='px-4 py-2 text-center'>
              {totals.totalOutstanding}
            </td>
          </tr>
          </tbody>
           
        </table>
        </div>
      </div>}
      
      {/* Image modal */}
      {selectedImage && (
        <div
          className="sticky inset-30 bg-white bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
          aria-modal="true"
          role="dialog"
        >
          <div className="max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage?.profileImageUrl}
              alt="Full size"
              className="max-w-full max-h-[62vh] object-contain"
            />
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-100"
              onClick={() => setSelectedImage(null)}
              aria-label="Close image"
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