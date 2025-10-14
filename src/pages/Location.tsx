import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
// @ts-ignore
import { LatLng, LatLngExpression } from 'leaflet';
import { useEffect, useState } from 'react';
import axios from 'axios'


export default function Location() {

    const [coordinates, setCoordinates] = useState<LatLngExpression[]>([])
    const [center, setCenter] = useState<LatLngExpression>([25.3863479, 82.9961421])

    useEffect(() => {
        const getData = async () => {
            console.log("reached here")
            const data: any = await axios.get(`http://localhost:8000/location/test`)
            console.log("reached here again")
            console.log("here")
            console.log(data.data.data)
            setCoordinates(data.data.data)
            setCenter(coordinates[0])
        }

        getData()
        
    }, [])

    

    return <div>
        <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100vh', width: '100%' }}
        >
        <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        />
      <Polyline positions={coordinates} color="blue" weight={4} />

      {coordinates.map((item) => {
        return <Marker position={item}/>
      })}     
    </MapContainer>
    </div>
}