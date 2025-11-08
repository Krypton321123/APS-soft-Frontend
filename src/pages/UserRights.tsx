import { useState, useEffect } from 'react'
import { Users, Plus, Save, X, Shield, Search, Check, Loader2, Trash2 } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function UserManagement() {
  const [users, setUsers] = useState<any>([])
  const [availableScreens, setAvailableScreens] = useState<any>([])
  const [availableLocations, setAvailableLocations] = useState<any>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [newUser, setNewUser] = useState<any>({
    username: '',
    password: '',
    userType: 'OPERATOR',
    screens: [],
    locations: [],
    active: true
  })

  // Fetch initial data
  useEffect(() => {
    fetchUsers()
    fetchScreens()
    fetchLocations()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/admin/users`)
      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchScreens = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/screens`)
      console.log(response)
      if (response.data.success) {
        setAvailableScreens(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching screens:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/locations`)
      if (response.data.success) {
        setAvailableLocations(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const filteredUsers = users.filter((user: any) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectUser = (user: any) => {
    setSelectedUser({ ...user })
  }

  const handleUpdateUser = async () => {
    try {
      setLoading(true)
      const response = await axios.patch(
        `${API_URL}/admin/users/${selectedUser.id}`,
        {
          username: selectedUser.username,
          userType: selectedUser.role,
          screens: selectedUser.screens,
          locations: selectedUser.locations,
          active: selectedUser.active
        }
      )

      if (response.data.success) {
        await fetchUsers()
        alert('User updated successfully!')
      }
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(error.response?.data?.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(`${API_URL}/admin/users`, {
        username: newUser.username,
        password: newUser.password,
        userType: newUser.userType,
        screens: newUser.screens,
        locations: newUser.locations,
        active: newUser.active
      })

      if (response.data.success) {
        await fetchUsers()
        setShowCreateModal(false)
        setNewUser({
          username: '',
          password: '',
          userType: 'OPERATOR',
          screens: [],
          locations: [],
          active: true
        })
        alert('User created successfully!')
      }
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(error.response?.data?.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: any) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      setDeleteLoading(true)
      const response = await axios.delete(`${API_URL}/admin/users/${userId}`)

      if (response.data.success) {
        await fetchUsers()
        setSelectedUser(null)
        alert('User deleted successfully!')
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert(error.response?.data?.message || 'Failed to delete user')
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleScreen = (screenId: any, isNewUser = false) => {
    if (isNewUser) {
      setNewUser((prev: any) => ({
        ...prev,
        screens: prev.screens.includes(screenId)
          ? prev.screens.filter((s: any) => s !== screenId)
          : [...prev.screens, screenId]
      }))
    } else {
      setSelectedUser((prev: any) => ({
        ...prev,
        screens: prev.screens.includes(screenId)
          ? prev.screens.filter((s: any) => s !== screenId)
          : [...prev.screens, screenId]
      }))
    }
  }

  const toggleLocation = (locationId: any, isNewUser = false) => {
    if (isNewUser) {
      setNewUser((prev: any) => ({
        ...prev,
        locations: prev.locations.includes(locationId)
          ? prev.locations.filter((l: any) => l !== locationId)
          : [...prev.locations, locationId]
      }))
    } else {
      setSelectedUser((prev: any) => ({
        ...prev,
        locations: prev.locations.includes(locationId)
          ? prev.locations.filter((l: any) => l !== locationId)
          : [...prev.locations, locationId]
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-500">Manage access rights and permissions</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={18} />
              New User
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* User List */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[calc(100vh-250px)] overflow-y-auto">
                {loading && users.length === 0 ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No users found</div>
                ) : (
                  filteredUsers.map((user: any) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">{user.username}</span>
                            {user.active && (
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            )}
                          </div>
                      
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User Details */}
          {selectedUser ? (
            <div className="lg:col-span-8">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        disabled={deleteLoading}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleteLoading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Delete
                      </button>
                      <button
                        onClick={handleUpdateUser}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Save size={16} />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={selectedUser.username}
                        onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Role
                      </label>
                      <select
                        value={selectedUser.role}
                        onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="OPERATOR">Operator</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Status
                      </label>
                      <select
                        value={selectedUser.active}
                        onChange={(e) => setSelectedUser({ ...selectedUser, active: e.target.value === 'true' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Screen Access */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Screen Access
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableScreens.map((screen: any) => (
                        <label
                          key={screen.id}
                          className={`relative flex items-center gap-2 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedUser.screens.includes(screen.id)
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUser.screens.includes(screen.id)}
                            onChange={() => toggleScreen(screen.id)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedUser.screens.includes(screen.id)
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedUser.screens.includes(screen.id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${
                            selectedUser.screens.includes(screen.id) ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {screen.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location Access */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Location Access
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableLocations.map((location: any) => (
                        <label
                          key={location.id}
                          className={`relative flex items-center gap-2 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedUser.locations.includes(location.id)
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUser.locations.includes(location.id)}
                            onChange={() => toggleLocation(location.id)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedUser.locations.includes(location.id)
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedUser.locations.includes(location.id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${
                            selectedUser.locations.includes(location.id) ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {location.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8">
              <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">Select a user to view details</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select
                    value={newUser.userType}
                    onChange={(e) => setNewUser({ ...newUser, userType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="OPERATOR">Operator</option> // no buttons to do anything
                    <option value="ADMIN">Admin</option> 
                    <option value="HEAD-OFFICE">Head office</option> // accept
                    <option value="DEPOT-INCHARGE">Depot Incharge</option> // park 
                  </select>
                </div>
              </div>

              {/* Screen Access */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Screen Access
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {availableScreens.map((screen: any) => (
                    <label
                      key={screen.id}
                      className={`relative flex items-center gap-2 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                        newUser.screens.includes(screen.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newUser.screens.includes(screen.id)}
                        onChange={() => toggleScreen(screen.id, true)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        newUser.screens.includes(screen.id)
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {newUser.screens.includes(screen.id) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        newUser.screens.includes(screen.id) ? 'text-blue-900' : 'text-gray-700'
                      }`}>
                        {screen.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Access */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Location Access
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableLocations.map((location: any) => (
                    <label
                      key={location.id}
                      className={`relative flex items-center gap-2 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                        newUser.locations.includes(location.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newUser.locations.includes(location.id)}
                        onChange={() => toggleLocation(location.id, true)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        newUser.locations.includes(location.id)
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {newUser.locations.includes(location.id) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        newUser.locations.includes(location.id) ? 'text-blue-900' : 'text-gray-700'
                      }`}>
                        {location.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleCreateUser}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                Create User
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}