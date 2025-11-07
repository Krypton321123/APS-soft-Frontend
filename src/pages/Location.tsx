import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
// @ts-ignore
import { LatLng, LatLngExpression } from 'leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet'
import axios from 'axios'
import MapPanner from '../components/MapPanner';


export default function Location() {

    const [coordinates, setCoordinates] = useState<LatLngExpression[]>([])
    const [center, setCenter] = useState<LatLngExpression>([25.3863479, 82.9961421])
    const [depot, setDepot] = useState('');
    const [employee, setEmployee] = useState('');
    const [date, setDate] = useState('')
    
    const markerIcon = new L.Icon({
    iconUrl: "/map-marker.jpg", 
    iconSize: [30, 38],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    });

    const [depotOptions, setDepotOptions] = useState<string[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);
    useEffect(() => {
    const fetchDepots = async () => {
      try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/images/depots`);
            const allowedLocations = JSON.parse(localStorage.getItem('allowedLocations') || "")
            console.log(response.data)
            if (!allowedLocations || allowedLocations.length === 0) {
            
                return setDepotOptions(response.data);
            } else {
              const allowedData = response.data.filter((item: string) => allowedLocations.includes(item.toUpperCase().slice(0, 3)))
              console.log(allowedData)
              return setDepotOptions(allowedData); 
            }
        } catch (error) {
            console.error('Failed to fetch depots', error);
        }
        };
        fetchDepots();
    }, []);

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

    const handleSubmit = async () => {

        console.log('here')

        const response = await axios.get(`${import.meta.env.VITE_API_URL}/location/getLocationData`, {
            params: { depot, employee, date }
        }); 

        if (response.status === 200) {
            console.log(response)
            setCoordinates(response.data.data.coordinates)
            console.log(response.data.data.coordinates[0])
            setCenter(response.data.data.coordinates[0])   
        } else {
            alert('Failed to pull location data'); 
        }
    }

    const handleReset = () => {
        setDepot('');
        setEmployee('');
        setDate(''); 
    };
    

    return <div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
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
              <label className="font-bold text-base mb-2" aria-label="End date">
                Date:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!employee || !depot}
                className="border border-gray-300 rounded p-2.5"
                required
                aria-required="true"
              />
            </div>
            
            <div className="flex items-end space-x-4">
              <button
                
                onClick={handleReset}
                className="bg-gray-300 text-gray-800 rounded p-2.5 w-full h-12 hover:bg-gray-400 transition-colors"
                aria-label="Reset filters"
              >
                Reset
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white rounded p-2.5 w-full h-12 hover:bg-blue-700 transition-colors"
                aria-label="Search images"
              >
                Search
              </button>
            </div>
          </div>
        
      </div>

        <MapContainer
        center={center}
        zoom={15}
        style={{ height: '50vh', width: '100%' }}
        >

            <MapPanner center={center} />
        <TileLayer
        url="http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
        attribution="&copy; Google Maps"
        />
      <Polyline positions={coordinates} color="blue" weight={2} />

      {coordinates.map((item, idx) => {
        return <Marker key={idx} title={idx.toString()} position={item} icon={markerIcon} />
      })}     
    </MapContainer>
    </div>
}