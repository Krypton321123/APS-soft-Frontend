import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Orders from './pages/Orders'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Collections from './pages/Collections'
import Attendance from './pages/Attendance'
import Images from './pages/Images'
import Rate from './pages/Rate'
import Location from './pages/Location'
import "leaflet/dist/leaflet.css"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/orders" element={<ProtectedRoute><Sidebar><Orders /></Sidebar></ProtectedRoute>} />
        <Route path='/collections' element={<ProtectedRoute><Sidebar><Collections /></Sidebar></ProtectedRoute>} />
        <Route path='/attendance'  element={<ProtectedRoute><Sidebar><Attendance /></Sidebar></ProtectedRoute>} />
        <Route path='/images' element={<ProtectedRoute><Sidebar><Images /></Sidebar></ProtectedRoute>} />
        <Route path='/ratelist' element={<ProtectedRoute><Sidebar><Rate /></Sidebar></ProtectedRoute>} />
        <Route path='/location' element={<ProtectedRoute><Sidebar><Location /></Sidebar></ProtectedRoute>}/>
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </Router>
  )
}

export default App
