import { useState, useEffect, useMemo } from "react"
import React from "react"
import { FaChevronDown, FaChevronRight, FaSearch, FaFilter, FaCheck, FaMoneyBillWave, FaCreditCard, FaUniversity } from "react-icons/fa"
import { CSVLink } from "react-csv"
import { motion } from 'motion/react'
import { IoIosOpen } from "react-icons/io"
import { ChevronUp } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  flexRender,
} from '@tanstack/react-table'
import type { ColumnDef } from "@tanstack/react-table"

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
  const [globalFilter, setGlobalFilter] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState({})
  const [expanded, setExpanded] = useState({})
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'cheque' | 'online'>('all')
  const [editedAmounts, setEditedAmounts] = useState<Record<string, number>>({})
  const [totalSelectedAmount, setTotalSelectedAmount] = useState<number>(0)
  const today = new Date().toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const [grouping, setGrouping] = useState<string[]>([])

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

      const mockUsers: User[] = [
        { user_id: 1, username: "emp1", stnm: "ASSAM", stcd: "AS", untnm: "GUWAHATI", untcd: "GUW", usrnm: "John Doe" },
        { user_id: 2, username: "emp2", stnm: "ASSAM", stcd: "AS", untnm: "SILCHAR", untcd: "SIL", usrnm: "Jane Smith" },
        { user_id: 3, username: "emp3", stnm: "BIHAR", stcd: "BR", untnm: "PATNA", untcd: "PAT", usrnm: "Bob Wilson" },
      ]
      buildLocationTree(mockUsers)
    } finally {
      setLoading(false)
    }
  }

  const buildLocationTree = (users: User[]) => {
    const userType = localStorage.getItem('userType') || 'ADMIN'
    const allowedLocations = localStorage.getItem('allowedLocations') || '[]'
    
    let allowedLocationsArray: string[] = []
    try {
      allowedLocationsArray = JSON.parse(allowedLocations)
      if (!Array.isArray(allowedLocationsArray)) {
        allowedLocationsArray = []
      }
    } catch (error) {
      console.error('Error parsing allowedLocations:', error)
      allowedLocationsArray = []
    }

    const isLocationAllowed = (locationName: string): boolean => {
      if (userType === 'ADMIN') return true
      if (allowedLocationsArray.length === 0) return false
      console.log("location name", locationName)
      return allowedLocationsArray.some(loc => 
        loc.toLowerCase() === locationName.toLowerCase().slice(0, 3)
      )
    }

    const stateMap = new Map<string, LocationNode>()

    users.forEach((user) => {
      if (!user.stnm || !user.untnm) return

      if (userType === 'OPERATOR') {
        const isUserAllowed = isLocationAllowed(user.usrnm) || isLocationAllowed(user.username)
        const isDepotAllowed = isLocationAllowed(user.untnm)
        const isStateAllowed = isLocationAllowed(user.stnm)

        console.log(user.stnm, user.untnm)
        
        if (!isUserAllowed && !isDepotAllowed && !isStateAllowed) {
          return
        }
      }

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

    const tree = Array.from(stateMap.values())
      .filter(state => state.children && state.children.length > 0)
      .map(state => ({
        ...state,
        children: state.children?.filter(depot => depot.children && depot.children.length > 0)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

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
          node.isSelected = !node.isSelected
          node.isIndeterminate = false

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

  const handleAmountChange = (collectionId: string, value: number) => {
    setEditedAmounts(prev => ({
      ...prev,
      [collectionId]: value
    }))
  }

  const handleSelectAllLocations = () => {
    setLocationTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev))
      const allSelected = isAllLocationsSelected(newTree)
      
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

  const handleVerifyCollections = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    const selectedCollectionsList = selectedRows.map(row => ({
      collectionId: row.original.collection_id,
      amount: editedAmounts[row.original.collection_id] ?? row.original.amount
    }))

    console.log("Verifying collections with amounts:", selectedCollectionsList)

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
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log('Collections verified successfully')
        setRowSelection({})
        setEditedAmounts(prev => {
          const newState = { ...prev }
          selectedRows.forEach(row => delete newState[row.original.collection_id])
          return newState
        })
      } else {
        throw new Error(result.message || 'Failed to verify collections')
      }
    } catch (error) {
      console.error("Error verifying collections:", error)
      setError(error instanceof Error ? error.message : 'Failed to verify collections')
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

  const columns = useMemo<ColumnDef<Collection>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        ),
        size: 40,
      },
      {
        id: 'expander',
        header: 'Expand',
        cell: ({ row }) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {row.getIsExpanded() ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
          </button>
        ),
        size: 50,
      },
      {
        accessorKey: 'empName',
        header: 'Employee',
        cell: info => <span className="text-sm text-gray-900 font-medium">{info.getValue() as string}</span>,
        size: 120,
      },
      {
        accessorKey: 'partyName',
        header: 'Party Name',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-gray-900 w-52 truncate" title={row.original.partyName}>
              {row.original.partyName}
            </div>
            <div className="text-xs text-gray-500">{row.original.partyId}</div>
          </div>
        ),
        minSize: 200,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={column.getToggleSortingHandler()}
          >
            Date
            {column.getIsSorted() && (
              <span>
                {column.getIsSorted() === 'asc' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <FaChevronDown className="w-4 h-4" />
                )}
              </span>
            )}
          </div>
        ),
        cell: info => (
          <span className="text-sm text-gray-500">
            {new Date(info.getValue() as string).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment Method',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {getPaymentMethodIcon(row.original.paymentMethod)}
            <span className="text-sm text-gray-900">
              {getPaymentMethodLabel(row.original.paymentMethod)}
            </span>
          </div>
        ),
        size: 150,
      },
      {
        accessorKey: 'amount',
        accessorFn: (row) => Number(row.amount),
        header: ({ column }) => (
          <div 
            className="flex items-center gap-2 cursor-pointer select-none justify-end"
            onClick={column.getToggleSortingHandler()}
          >
            Amount
            {column.getIsSorted() && (
              <span>
                {column.getIsSorted() === 'asc' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <FaChevronDown className="w-4 h-4" />
                )}
              </span>
            )}
          </div>
        ),
        cell: ({ row }) => (
          <input
            type="number"
            value={editedAmounts[row.original.collection_id] ?? Number(row.original.amount)}
            onChange={(e) => handleAmountChange(row.original.collection_id, Number(e.target.value))}
            className="w-24 text-right border rounded px-2 py-1"
          />
        ),
        aggregationFn: 'sum',
        aggregatedCell: ({ getValue }) => (
          <span className="text-sm font-bold text-blue-600">
            Total: ₹{Math.round(getValue() as number).toLocaleString("en-IN")}
          </span>
        ),
        size: 120,
      },
    ],
    [editedAmounts]
  )

  const table = useReactTable({
    data: collections,
    columns,
    state: {
      globalFilter,
      rowSelection,
      grouping,
      expanded
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGroupingChange: setGrouping,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    getGroupedRowModel: getGroupedRowModel(),
    getRowCanExpand: () => true,
  })

  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows
    const total = selectedRows.reduce((sum, row) => {
      const amount = editedAmounts[row.original.collection_id] ?? row.original.amount
      return sum + Number(amount)
    }, 0)
    
    setTotalSelectedAmount(total)
  }, [rowSelection, collections, editedAmounts])

  const selectedCollections = table.getSelectedRowModel().rows.map(row => row.original)

  return (
    <div className="flex h-full bg-gray-50 w-full max-w-full overflow-hidden">
      <motion.div
        initial={{width: '20rem'}}
        animate={{width: isFilterOpen ? '20rem' : '2.5rem'}}
        transition={{duration: 0.3, ease: 'easeInOut'}}
        className="border-r border-gray-200 overflow-y-auto flex-shrink-0"
        style={{ width: "clamp(256px, 20vw, 320px)" }}
      >
        {isFilterOpen ? (
          <div className="p-4">
            <div className="mb-4">
              <IoIosOpen 
                onClick={() => setIsFilterOpen(false)} 
                className="mt-4 absolute cursor-pointer top-0 hover:bg-gray-200 transition-colors duration-100 ease-in w-8 h-8 left-2 flex justify-center items-center" 
                size={28}
              />
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
        ) : (
          <div onClick={() => setIsFilterOpen(true)} className="w-10 p-0 hover:bg-gray-200 transition-colors cursor-pointer duration-100 flex justify-center items-center ease-in absolute left-3 h-10">
            <IoIosOpen size={28}/>
          </div>
        )}
      </motion.div>

      <div className="flex-1 p-6 flex flex-col min-h-0 min-w-0">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Collections</h2>
            
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

          <div className="relative justify-between items-center flex flex-row">
            <div className="w-1/2 h-10 flex">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search collections by party name, ID, or employee..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {collections.length !== 0 && (
              <div className="flex gap-3 justify-center items-center">
                <button className="bg-blue-600 w-40 py-3 rounded-lg text-white cursor-pointer">
                  <CSVLink 
                    data={[
                      ["Employee", "Party Name", "Date", "Method", "Amount"], 
                      ...collections.map((item) => [
                        item.empName, 
                        item.partyName, 
                        new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        }), 
                        item.paymentMethod, 
                        item.amount
                      ])
                    ]} 
                    filename="all-collections-csv"
                  >
                    Download CSV (All)
                  </CSVLink>
                </button>
                {selectedCollections.length > 0 && (
                  <button className="bg-blue-600 w-40 py-3 rounded-lg text-white cursor-pointer">
                    <CSVLink 
                      data={[
                        ["Employee", "Party Name", "Date", "Method", "Amount"], 
                        ...selectedCollections.map((item) => [
                          item.empName, 
                          item.partyName, 
                          new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          }), 
                          item.paymentMethod, 
                          item.amount
                        ])
                      ]} 
                      filename="selected-collections-csv"
                    >
                      Download CSV (Selected)
                    </CSVLink>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          {['empName', 'paymentMethod'].map(col => (
            <button
              key={col}
              onClick={() =>
                setGrouping(prev =>
                  prev.includes(col)
                    ? prev.filter(p => p !== col)
                    : [...prev, col]
                )
              }
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                grouping.includes(col)
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {col === 'empName' ? 'Employee' : 'Payment Method'}
            </button>
          ))}
          {grouping.length > 0 && (
            <button
              onClick={() => setGrouping([])}
              className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              Clear Groups
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {collectionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No collections found</div>
              <div className="text-gray-400 text-sm">Select locations from the filter panel to view collections</div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow flex-1 min-h-0 border border-gray-200 overflow-hidden">
                <div className="h-full overflow-auto max-h-[50vh]">
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200" style={{ minWidth: "900px" }}>
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{ width: header.getSize() }}
                              >
                                {header.isPlaceholder ? null : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {table.getRowModel().rows.map(row => (
                          <React.Fragment key={row.id}>
                            <tr className="hover:bg-gray-50">
                              {row.getVisibleCells().map(cell => (
                                <td
                                  key={cell.id}
                                  className="px-3 py-4 whitespace-nowrap text-sm"
                                  style={{
                                    paddingLeft: cell.getIsGrouped() ? `${row.depth * 2 + 1}rem` : undefined,
                                  }}
                                >
                                  {cell.getIsGrouped() ? (
                                    <button
                                      onClick={row.getToggleExpandedHandler()}
                                      className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800"
                                    >
                                      {row.getIsExpanded() ? (
                                        <FaChevronDown className="w-4 h-4" />
                                      ) : (
                                        <FaChevronRight className="w-4 h-4" />
                                      )}
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                                    </button>
                                  ) : cell.getIsAggregated() ? (
                                    <span className="font-medium text-slate-600">
                                      {flexRender(
                                        cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </span>
                                  ) : cell.getIsPlaceholder() ? null : (
                                    flexRender(cell.column.columnDef.cell, cell.getContext())
                                  )}
                                </td>
                              ))}
                            </tr>
                            {row.getIsExpanded() && !row.getIsGrouped() && (
                              <tr>
                                <td colSpan={columns.length} className="px-6 py-4 bg-gray-50">
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                                      Collection Details:
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">
                                          Collection ID
                                        </div>
                                        <div className="text-sm text-gray-900">
                                          {row.original.collection_id}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">
                                          Payment Method
                                        </div>
                                        <div className="text-sm text-gray-900 flex items-center gap-2">
                                          {getPaymentMethodIcon(row.original.paymentMethod)}
                                          {getPaymentMethodLabel(row.original.paymentMethod)}
                                        </div>
                                      </div>

                                      {row.original.paymentMethod === "cheque" && (
                                        <>
                                          <div>
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              Cheque Number
                                            </div>
                                            <div className="text-sm text-gray-900">
                                              {row.original.chequeNumber || "N/A"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              Cheque Date
                                            </div>
                                            <div className="text-sm text-gray-900">
                                              {row.original.chequeDate || "N/A"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              Bank Name
                                            </div>
                                            <div className="text-sm text-gray-900">
                                              {row.original.bankName || "N/A"}
                                            </div>
                                          </div>
                                        </>
                                      )}

                                      {row.original.paymentMethod === "online" && (
                                        <>
                                          <div>
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              UPI ID
                                            </div>
                                            <div className="text-sm text-gray-900">
                                              {row.original.upiId || "N/A"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              Transaction ID
                                            </div>
                                            <div className="text-sm text-gray-900">
                                              {row.original.transactionId || "N/A"}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} collections
                </div>
              </div>

              {selectedCollections.length > 0 && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedCollections.length} collection{selectedCollections.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm">Total Amount: <span className="font-semibold">₹{totalSelectedAmount.toLocaleString("en-IN")}</span></p>
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
  )
}

export default Collections