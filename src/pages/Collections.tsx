import { useState, useEffect } from "react"
import React from "react"
import { FaChevronDown, FaChevronRight, FaSearch, FaFilter, FaCheck, FaMoneyBillWave, FaCreditCard, FaUniversity } from "react-icons/fa"
import { CSVLink } from "react-csv"


// Types
interface User {
  user_id: number
  username: string
  stnm: string
  stcd: string
  untnm: string
  untcd: string
  usrnm: string
}

interface Collection {
  collection_id: string
  partyId: string
  partyName: string
  empId: string
  amount: number
  paymentMethod: 'cash' | 'cheque' | 'online'
  chequeNumber?: string
  chequeDate?: string
  bankName?: string
  upiId?: string
  transactionId?: string
  createdAt: string
  empName: string
}

interface LocationNode {
  name: string
  code: string
  type: "state" | "depot" | "user"
  children?: LocationNode[]
  userId?: number
  isSelected: boolean
  isIndeterminate: boolean
  isExpanded: boolean
}

interface ApiResponse<T> {
  statusCode: number
  message: string
  data: T
  success: boolean
}

function Collections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [locationTree, setLocationTree] = useState<LocationNode[]>([])
  const [loading, setLoading] = useState(false)
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'cheque' | 'online'>('all')
  const [editedAmounts, setEditedAmounts] = useState<Record<string, number>>({})
  const [totalSelectedAmount, setTotalSelectedAmount] = useState<number>(0)
  const today = new Date().toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)

  // Fetch users and build location tree
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/fetchUsers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<User[]> = await response.json()

      if (result.success && result.data) {
        buildLocationTree(result.data)
      } else {
        throw new Error(result.message || "Failed to fetch users")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch users")

      // Fallback to mock data for demo purposes
      const mockUsers: User[] = [
        { user_id: 1, username: "emp1", stnm: "ASSAM", stcd: "AS", untnm: "GUWAHATI", untcd: "GUW", usrnm: "John Doe" },
        { user_id: 2, username: "emp2", stnm: "ASSAM", stcd: "AS", untnm: "SILCHAR", untcd: "SIL", usrnm: "Jane Smith" },
        { user_id: 3, username: "emp3", stnm: "BIHAR", stcd: "BR", untnm: "PATNA", untcd: "PAT", usrnm: "Bob Wilson" },
        { user_id: 4, username: "emp4", stnm: "BIHAR", stcd: "BR", untnm: "KOCHAS", untcd: "KOC", usrnm: "Alice Brown" },
        { user_id: 5, username: "emp5", stnm: "BIHAR", stcd: "BR", untnm: "MUZAFFAR PUR", untcd: "MUZ", usrnm: "Charlie Davis" },
        { user_id: 6, username: "emp6", stnm: "DELHI", stcd: "DL", untnm: "DELHI", untcd: "DEL", usrnm: "Eva Martinez" },
        { user_id: 7, username: "emp7", stnm: "HIMANCHAL PRADESH", stcd: "HP", untnm: "DAMTAL", untcd: "DAM", usrnm: "Frank Miller" },
      ]
      buildLocationTree(mockUsers)
    } finally {
      setLoading(false)
    }
  }

  const buildLocationTree = (users: User[]) => {
    const stateMap = new Map<string, LocationNode>()

    users.forEach((user) => {
      if (!user.stnm || !user.untnm) return

      // Get or create state
      if (!stateMap.has(user.stnm)) {
        stateMap.set(user.stnm, {
          name: user.stnm,
          code: user.stcd,
          type: "state",
          children: [],
          isSelected: false,
          isIndeterminate: false,
          isExpanded: false,
        })
      }

      const state = stateMap.get(user.stnm)!

      // Get or create depot
      let depot = state.children?.find((d) => d.name === user.untnm)
      if (!depot) {
        depot = {
          name: user.untnm,
          code: user.untcd,
          type: "depot",
          children: [],
          isSelected: false,
          isIndeterminate: false,
          isExpanded: false,
        }
        state.children?.push(depot)
      }

      // Add user
      depot.children?.push({
        name: user.usrnm,
        code: user.username,
        type: "user",
        userId: user.user_id,
        isSelected: false,
        isIndeterminate: false,
        isExpanded: false,
      })
    })

    const tree = Array.from(stateMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    setLocationTree(tree)
  }

  const toggleExpand = (path: number[]) => {
    setLocationTree((prev) => {
      const newTree = [...prev]
      let current: LocationNode[] = newTree

      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
          current[path[i]].isExpanded = !current[path[i]].isExpanded
        } else {
          current = current[path[i]].children!
        }
      }

      return newTree
    })
  }

  const toggleSelection = (path: number[]) => {
    setLocationTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev))

      const toggleNode = (nodes: LocationNode[], currentPath: number[], depth: number) => {
        if (depth === currentPath.length) return

        const node = nodes[currentPath[depth]]

        if (depth === currentPath.length - 1) {
          // Toggle this node
          node.isSelected = !node.isSelected
          node.isIndeterminate = false

          // Update all children
          const updateChildren = (n: LocationNode, selected: boolean) => {
            n.isSelected = selected
            n.isIndeterminate = false
            if (n.children) {
              n.children.forEach((child) => updateChildren(child, selected))
            }
          }


          if (node.children) {
            node.children.forEach((child) => updateChildren(child, node.isSelected))
          }
        } else {
          toggleNode(node.children!, currentPath, depth + 1)
        }

        // Update parent states
        if (node.children) {
          const selectedChildren = node.children.filter((c) => c.isSelected).length
          const indeterminateChildren = node.children.filter((c) => c.isIndeterminate).length

          if (selectedChildren === 0 && indeterminateChildren === 0) {
            node.isSelected = false
            node.isIndeterminate = false
          } else if (selectedChildren === node.children.length) {
            node.isSelected = true
            node.isIndeterminate = false
          } else {
            node.isSelected = false
            node.isIndeterminate = true
          }
        }
      }


      toggleNode(newTree, path, 0)
      return newTree
    })
  }

  // Get selected items for API call
  const getSelectedItems = () => {
    const states: string[] = []
    const depots: string[] = []
    const employees: string[] = []

    const traverse = (nodes: LocationNode[]) => {
      nodes.forEach((node) => {
        if (node.isSelected) {
          if (node.type === "state") states.push(node.name)
          else if (node.type === "depot") depots.push(node.name)
          else if (node.type === "user") employees.push(node.userId!.toString())
        }
        if (node.children) traverse(node.children)
      })
    }

    traverse(locationTree)
    return { states, depots, employees }
  }

  // Fetch collections based on selection
  useEffect(() => {
    const { states, depots, employees } = getSelectedItems()
    if (states.length > 0 || depots.length > 0 || employees.length > 0) {
      fetchCollections(states, depots, employees)
    } else {
      setCollections([])
    }
  }, [locationTree, paymentFilter, fromDate, toDate])

  const fetchCollections = async (states: string[], depots: string[], employees: string[]) => {
    setCollectionsLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (states.length > 0) params.set("states", states.join(","))
      if (depots.length > 0) params.set("depots", depots.join(","))
      if (employees.length > 0) params.set("employees", employees.join(","))
      if (paymentFilter !== 'all') params.set("paymentMethod", paymentFilter)
      params.set('fromDate', fromDate)
      params.set('toDate', toDate)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/collections/by-location?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Collection[]> = await response.json()

      if (result.success && result.data) {
        setCollections(result.data)
      } else {
        throw new Error(result.message || "Failed to fetch collections")
      }
    } catch (error) {
      console.error("Error fetching collections:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch collections")
    } finally {
      setCollectionsLoading(false)
    }
  }

  // Collection selection and expansion handlers
  const handleCollectionSelection = (collectionId: string) => {
	  const amount = collections.find(item => item.collection_id === collectionId)?.amount || 0; 
    setSelectedCollections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId)
	setTotalSelectedAmount(prev => prev - Number(amount))
	console.log(totalSelectedAmount); 
      } else {
        newSet.add(collectionId)
	setTotalSelectedAmount(prev => prev + Number(amount)); 
	console.log(totalSelectedAmount); 
      }
      return newSet
    })
  }

  const handleCollectionExpansion = (collectionId: string) => {
    setExpandedCollections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId)
      } else {
        newSet.add(collectionId)
      }
      return newSet
    })
  }

  const handleAmountChange = (collectionId: string, value: number) => {
    setEditedAmounts(prev => ({
      ...prev,
      [collectionId]: value
    }))
  }

  const handleSelectAllLocations = () => {
    setLocationTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev))
      
      // Check if all nodes are selected
      const allSelected = isAllLocationsSelected(newTree)
      
      // Toggle all nodes
      const toggleAllNodes = (nodes: LocationNode[], selected: boolean) => {
        nodes.forEach((node) => {
          node.isSelected = selected
          node.isIndeterminate = false
          if (node.children) {
            toggleAllNodes(node.children, selected)
          }
        })
      }
      
      toggleAllNodes(newTree, !allSelected)
      return newTree
    })
  }

  const isAllLocationsSelected = (tree: LocationNode[]): boolean => {
    const checkAllSelected = (nodes: LocationNode[]): boolean => {
      return nodes.every((node) => {
        if (node.children) {
          return node.isSelected && checkAllSelected(node.children)
        }
        return node.isSelected
      })
    }
    return checkAllSelected(tree)
  }

  const isAnyLocationSelected = (tree: LocationNode[]): boolean => {
    const checkAnySelected = (nodes: LocationNode[]): boolean => {
      return nodes.some((node) => {
        if (node.children) {
          return node.isSelected || node.isIndeterminate || checkAnySelected(node.children)
        }
        return node.isSelected
      })
    }
    return checkAnySelected(tree)
  }

  const handleSelectAllCollections = () => {
	  const totalAmount = collections.map(item => item.amount).reduce((acc: number, curr: number) => Number(acc) + Number(curr), 0); 
    if (selectedCollections.size === filteredCollections.length) {
      setSelectedCollections(new Set())
      setTotalSelectedAmount(0);
      console.log(totalSelectedAmount);
    } else {
      setSelectedCollections(new Set(filteredCollections.map((collection) => collection.collection_id)))
      setTotalSelectedAmount(Number(totalAmount))
	console.log(totalSelectedAmount)
    }
  }

  const handleVerifyCollections = async () => {
    const selectedCollectionsList = Array.from(selectedCollections).map(id => {
      const collection = collections.find(c => c.collection_id === id);
      return {
        collectionId: id,
        amount: editedAmounts[id] ?? collection?.amount
      };
    });

    console.log("Verifying collections with amounts:", selectedCollectionsList);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/collections/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          collections: selectedCollectionsList
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log('Collections verified successfully');
        // Clear selection after action
        setSelectedCollections(new Set());
        // Clear edited amounts for verified collections
        setEditedAmounts(prev => {
          const newState = { ...prev };
          selectedCollections.forEach(id => delete newState[id]);
          return newState;
        });
      } else {
        throw new Error(result.message || 'Failed to verify collections');
      }
    } catch (error) {
      console.error("Error verifying collections:", error);
      setError(error instanceof Error ? error.message : 'Failed to verify collections');
    }
  }

  const renderLocationNode = (node: LocationNode, path: number[], depth = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const indentClass = depth === 0 ? "" : depth === 1 ? "ml-6" : "ml-12"

    return (
      <div key={`${node.name}-${path.join("-")}`} className={indentClass}>
        <div className="flex items-center py-1 hover:bg-gray-50 rounded-lg px-2">
          {hasChildren && (
            <button onClick={() => toggleExpand(path)} className="mr-2 p-1 hover:bg-gray-200 rounded">
              {node.isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
            </button>
          )}

          <div className="flex items-center gap-2 flex-1">
            <input
              type="checkbox"
              checked={node.isSelected}
              ref={(el) => {
                if (el) el.indeterminate = node.isIndeterminate
              }}
              onChange={() => toggleSelection(path)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span
              className={`text-sm ${
                node.type === "state"
                  ? "font-semibold text-gray-800"
                  : node.type === "depot"
                    ? "font-medium text-gray-700"
                    : "text-gray-600"
              }`}
            >
              {node.name}
            </span>
          </div>
        </div>

        {hasChildren && node.isExpanded && (
          <div className="ml-4">
            {node.children!.map((child, index) => renderLocationNode(child, [...path, index], depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredCollections = collections.filter(
    (collection) =>
      (collection.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.partyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.empId.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const isAllSelected = filteredCollections.length > 0 && selectedCollections.size === filteredCollections.length
  const isIndeterminate = selectedCollections.size > 0 && selectedCollections.size < filteredCollections.length

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <FaMoneyBillWave className="text-green-600" />
      case 'cheque':
        return <FaUniversity className="text-blue-600" />
      case 'online':
        return <FaCreditCard className="text-purple-600" />
      default:
        return null
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash'
      case 'cheque':
        return 'Cheque'
      case 'online':
        return 'Online'
      default:
        return method
    }
  }

  return (
    <div className="flex h-full bg-gray-50 w-full max-w-full overflow-hidden">
      {/* Location Filter Panel */}
      <div
        className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0"
        style={{ width: "clamp(256px, 20vw, 320px)" }}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <FaFilter className="text-blue-600" />
            Filter by Location
          </h3>
          <div className="text-xs text-gray-500 mb-4">
            Select states, depots, or specific employees to filter collections
          </div>

           <div className="mb-4">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Date Range</h4>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
    </div>
  </div>

          {/* Select All Locations Checkbox */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllLocationsSelected(locationTree)}
                ref={(el) => {
                  if (el) el.indeterminate = !isAllLocationsSelected(locationTree) && isAnyLocationSelected(locationTree)
                }}
                onChange={handleSelectAllLocations}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All Locations
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 text-sm font-medium">Connection Error</div>
              <div className="text-red-600 text-xs mt-1">{error}</div>
              <div className="text-red-600 text-xs mt-1">Using demo data instead</div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-1">{locationTree.map((state, index) => renderLocationNode(state, [index]))}</div>
        )}
      </div>

      {/* Collections Panel */}
      <div className="flex-1 p-6 flex flex-col min-h-0">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Collections</h2>
            
            {/* Payment Method Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Payment Method:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative justify-between items-center flex flex-row">
            <div className="w-1/2 h-10 flex">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                type="text"
                placeholder="Search orders by party name, ID, or employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {collections.length > 0 && <div className="flex gap-3 justify-center items-center">
                  <button className="bg-blue-600 w-40 mb-2 rounded-lg text-white cursor-pointer">
                  <CSVLink data={[
                    ["Employee", "Party Name", "Date", "Method", "Amount"], 
                    ...collections.map((item) => {
                      return [item.empName, item.partyName, new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      }), item.paymentMethod, item.amount]
                    })
                  ]} filename="all-collection-csv">Download CSV (All collections)</CSVLink>
                  </button>
                  {selectedCollections.size > 0 && <button className="bg-blue-600 mb-2 w-40 rounded-lg text-white cursor-pointer">
                    <CSVLink data={
                          [
                          ["Employee", "Party Name", "Date", "Method", "Amount"], 
                          ...collections.filter(item => selectedCollections.has(item.collection_id)).map((item) => {
                          return [item.empName, item.partyName, new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        }), item.paymentMethod, item.amount]
                                      
                        })
                      ]
                    } filename="selected-collection-csv">Download CSV (Selected orders)</CSVLink>
                    </button>}
          </div>}
        </div>
      

        {/* Collections Table - Flex grow to take remaining space */}
        <div className="flex-1 overflow-y-scroll flex flex-col min-h-0">
          {collectionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No collections found</div>
              <div className="text-gray-400 text-sm">Select locations from the filter panel to view collections</div>
            </div>
          ) : (
            <>
  <div className="bg-white rounded-lg shadow flex-1 min-h-0 border border-gray-200">
    <div className="h-full overflow-x-auto overflow-y-auto">
      <table className="w-full divide-y divide-gray-200" style={{ minWidth: "800px" }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th
              className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "40px" }}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate
                }}
                onChange={handleSelectAllCollections}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </th>
            <th
              className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "50px" }}
            >
              Expand
            </th>
            <th
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "100px" }}
            >
              Employee
            </th>
            <th
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "200px", maxWidth: "200px" }}
            >
              Party Name
            </th>
            <th
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "100px" }}
            >
              Date
            </th>
            <th
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "120px" }}
            >
              Payment Method
            </th>
            <th
              className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "110px" }}
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCollections.map((collection) => {
            const isExpanded = expandedCollections.has(collection.collection_id)

            return (
              <React.Fragment key={collection.collection_id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-2 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCollections.has(collection.collection_id)}
                      onChange={() => handleCollectionSelection(collection.collection_id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleCollectionExpansion(collection.collection_id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isExpanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
                    </button>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {collection.empName}
                  </td>
                  <td className="px-3 py-4" style={{ width: "200px", maxWidth: "200px" }}>
                    <div className="text-sm font-medium text-gray-900 truncate" title={collection.partyName}>
                      {collection.partyName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{collection.partyId}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(collection.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(collection.paymentMethod)}
                      <span className="text-sm text-gray-900">
                        {getPaymentMethodLabel(collection.paymentMethod)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    <input
                      type="number"
                      value={editedAmounts[collection.collection_id] ?? collection.amount}
                      onChange={(e) => handleAmountChange(collection.collection_id, Number(e.target.value))}
                      className="w-24 text-right border rounded"
                    />
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Collection Details:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Collection ID</div>
                            <div className="text-sm text-gray-900">{collection.collection_id}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Payment Method</div>
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              {getPaymentMethodIcon(collection.paymentMethod)}
                              {getPaymentMethodLabel(collection.paymentMethod)}
                            </div>
                          </div>
                          {collection.paymentMethod === 'cheque' && (
                            <>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Cheque Number</div>
                                <div className="text-sm text-gray-900">{collection.chequeNumber || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Cheque Date</div>
                                <div className="text-sm text-gray-900">{collection.chequeDate || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Bank Name</div>
                                <div className="text-sm text-gray-900">{collection.bankName || 'N/A'}</div>
                              </div>
                            </>
                          )}
                          {collection.paymentMethod === 'online' && (
                            <>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">UPI ID</div>
                                <div className="text-sm text-gray-900">{collection.upiId || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Transaction ID</div>
                                <div className="text-sm text-gray-900">{collection.transactionId || 'N/A'}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>

  {/* Action Buttons - Fixed at bottom */}
  {selectedCollections.size > 0 && (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedCollections.size} collection{selectedCollections.size !== 1 ? 's' : ''} selected
        </div>
	<div className="text-sm text-gray-600">
		Total Amount: {totalSelectedAmount}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleVerifyCollections}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <FaCheck className="mr-2" size={14} />
            Verify Collections
          </button>
        </div>
      </div>
    </div>
  )}
</>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}

export default Collections
