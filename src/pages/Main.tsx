import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Location {
  name: string
  checked: boolean
  depos: { name: string; checked: boolean }[]
}

const Main = () => {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([
    {
      name: 'Uttar Pradesh',
      checked: false,
      depos: [
        { name: 'Agra', checked: false },
        { name: 'Lucknow', checked: true },
        { name: 'Kanpur', checked: false },
      ],
    },
    {
      name: 'Madhya Pradesh',
      checked: true,
      depos: [
        { name: 'Bhopal', checked: true },
        { name: 'Indore', checked: false },
        { name: 'Gwalior', checked: true },
      ],
    },
  ])
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({
    'Uttar Pradesh': false,
    'Madhya Pradesh': true,
  })

  const handleLogout = () => {
    navigate('/')
  }

  const toggleState = (stateName: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [stateName]: !prev[stateName],
    }))
  }

  const toggleStateCheck = (stateName: string) => {
    setLocations(prev =>
      prev.map(loc => {
        if (loc.name === stateName) {
          const newChecked = !loc.checked
          return {
            ...loc,
            checked: newChecked,
            depos: loc.depos.map(depo => ({ ...depo, checked: newChecked })),
          }
        }
        return loc
      })
    )
  }

  const toggleDepoCheck = (stateName: string, depoName: string) => {
    setLocations(prev =>
      prev.map(loc => {
        if (loc.name === stateName) {
          const updatedDepos = loc.depos.map(depo =>
            depo.name === depoName ? { ...depo, checked: !depo.checked } : depo
          )
          return {
            ...loc,
            checked: updatedDepos.every(depo => depo.checked),
            depos: updatedDepos,
          }
        }
        return loc
      })
    )
  }

  // Dummy order data
  const orders = [
    {
      id: 1,
      orderNo: 'ORD001',
      location: 'Bhopal',
      customer: 'John Doe',
      amount: 1500,
      status: 'Pending',
    },
    {
      id: 2,
      orderNo: 'ORD002',
      location: 'Gwalior',
      customer: 'Jane Smith',
      amount: 2300,
      status: 'Completed',
    },
    {
      id: 3,
      orderNo: 'ORD003',
      location: 'Lucknow',
      customer: 'Mike Johnson',
      amount: 1800,
      status: 'Processing',
    },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Office App</h1>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-gray-700 font-medium">
              <span>Orders</span>
            </div>
            <div className="mt-2 ml-2">
              {locations.map(location => (
                <div key={location.name} className="mb-2">
                  <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => toggleState(location.name)}
                  >
                    {expandedStates[location.name] ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={location.checked}
                        onChange={() => toggleStateCheck(location.name)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">{location.name}</span>
                    </div>
                  </div>
                  {expandedStates[location.name] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {location.depos.map(depo => (
                        <div key={depo.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={depo.checked}
                            onChange={() => toggleDepoCheck(location.name, depo.name)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm">{depo.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="p-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.orderNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{order.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'Processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Main