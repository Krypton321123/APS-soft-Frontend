import { useState, useEffect } from "react"
import React from "react"
import { FaChevronDown, FaChevronRight, FaSearch, FaFilter, FaCheck, FaTimes } from "react-icons/fa"
import { CSVLink } from 'react-csv'
import { motion } from 'motion/react'
import { IoIosOpen } from "react-icons/io";

const API_BASE_URL = import.meta.env.VITE_API_URL


interface User {
  user_id: number
  username: string
  stnm: string
  stcd: string
  untnm: string
  untcd: string
  usrnm: string
}

interface OrderItem {
  id: string
  itemCode: string
  itemName: string
  quantity: number
  rate: number
  amount: number
  packType: string
}

interface Order {
  order_id: string
  partyId: string
  partyName: string
  empId: string
  empName: string 
  totalAmount: number
  discountAmount: number
  paymentMode: string
  status: string
  creditDays?: number
  createdAt: string
  consumerRate?: number
  bulkRate?: number
  orderItems: OrderItem[]
  outstanding: number
  collection: {
    amount: number, paymentMethod: string
  }
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



function Orders() {
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [locationTree, setLocationTree] = useState<LocationNode[]>([])
  const [loading, setLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const today = new Date().toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState<string>(today)
  const [toDate, setToDate] = useState<string>(today)
  const [totalConsumerQuantity, setTotalConsumerQuantity] = useState<number>(0);
  const [totalBulkQuantity, setTotalBulkQuantity] = useState<number>(0); 
  const [isSelectingDate, setIsSelectingDate] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(true) 

  console.log(users)

  // Fetch users and build location tree
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/user/fetchUsers`, {
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
        setUsers(result.data)
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
        {
          user_id: 2,
          username: "emp2",
          stnm: "ASSAM",
          stcd: "AS",
          untnm: "SILCHAR",
          untcd: "SIL",
          usrnm: "Jane Smith",
        },
        { user_id: 3, username: "emp3", stnm: "BIHAR", stcd: "BR", untnm: "PATNA", untcd: "PAT", usrnm: "Bob Wilson" },
        {
          user_id: 4,
          username: "emp4",
          stnm: "BIHAR",
          stcd: "BR",
          untnm: "KOCHAS",
          untcd: "KOC",
          usrnm: "Alice Brown",
        },
        {
          user_id: 5,
          username: "emp5",
          stnm: "BIHAR",
          stcd: "BR",
          untnm: "MUZAFFAR PUR",
          untcd: "MUZ",
          usrnm: "Charlie Davis",
        },
        {
          user_id: 6,
          username: "emp6",
          stnm: "DELHI",
          stcd: "DL",
          untnm: "DELHI",
          untcd: "DEL",
          usrnm: "Eva Martinez",
        },
        {
          user_id: 7,
          username: "emp7",
          stnm: "HIMANCHAL PRADESH",
          stcd: "HP",
          untnm: "DAMTAL",
          untcd: "DAM",
          usrnm: "Frank Miller",
        },
      ]
      setUsers(mockUsers)
      buildLocationTree(mockUsers)
    } finally {
      setLoading(false)
    }
  }

  const buildLocationTree = (users: User[]) => {
    const stateMap = new Map<string, LocationNode>()

    users.forEach((user) => {
      // Skip users with empty state or unit names
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

  // Fetch orders based on selection
  useEffect(() => {
    const { states, depots, employees } = getSelectedItems()
    if (states.length > 0 || depots.length > 0 || employees.length > 0) {
      fetchOrders(states, depots, employees)
    } else {
      setOrders([])
    }
  }, [locationTree, fromDate, toDate])

  const fetchOrders = async (states: string[], depots: string[], employees: string[]) => {
    setOrdersLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (states.length > 0) params.set("states", states.join(","))
      if (depots.length > 0) params.set("depots", depots.join(","))
      if (employees.length > 0) params.set("employees", employees.join(","))
      params.set("from", fromDate)
      params.set("to", toDate)

      const response = await fetch(`${API_BASE_URL}/orders/by-location?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Order[]> = await response.json()

      if (result.success && result.data) {
        setOrders(result.data)
      } else {
        throw new Error(result.message || "Failed to fetch orders")
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch orders")

      // Fallback to mock data for demo purposes
      const mockOrders: Order[] = [
        {
          order_id: "1",
          partyId: "P001",
          partyName: "ABC Company",
          empId: "emp1",
          empName: "emp1", 
          totalAmount: 15000,
          discountAmount: 500,
          paymentMode: "cash",
          status: "completed",
          createdAt: "2025-05-30T10:30:00Z",
          outstanding: 200, 
          collection: {
            amount: 200, paymentMethod: "Cash"
          },
          orderItems: [
            {
              id: "1",
              itemCode: "IT001",
              itemName: "Product A",
              quantity: 10,
              rate: 1500,
              amount: 15000,
              packType: "box",
            },
          ],
        },
        {
          order_id: "2",
          partyId: "P002",
          partyName: "XYZ Corp",
          empId: "emp3",
          empName: "emp3",
          totalAmount: 25000,
          discountAmount: 1000,
          paymentMode: "credit",
          status: "pending",
          creditDays: 30,
          createdAt: "2025-05-30T14:15:00Z",
          outstanding: 200, 
          collection: {
            amount: 200, paymentMethod: "Cash"
          },
          orderItems: [
            {
              id: "2",
              itemCode: "IT002",
              itemName: "Product B",
              quantity: 5,
              rate: 5000,
              amount: 25000,
              packType: "carton",
            },
          ],
        },
      ]
      setOrders(mockOrders)
    } finally {
      setOrdersLoading(false)
    }
  }

  // Order selection and expansion handlers
  const handleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })

    const order = orders.find((item) => item.order_id === orderId); 

    if (selectedOrders.has(order?.order_id!)) {
      setTotalConsumerQuantity((prev: number) => {
        const consumerQuantity = order?.orderItems.map((item) => item.packType === "Consumer Pack" ? item.quantity : 0).reduce((acc: number, curr: number) => {return acc + curr}, 0);

        if (consumerQuantity !== undefined) {
          return prev - consumerQuantity
        } else {
          return prev
        }
      })

      setTotalBulkQuantity((prev: number) => {
         const consumerQuantity = order?.orderItems.map((item) => item.packType === "Bulk Pack" ? item.quantity : 0).reduce((acc: number, curr: number) => {return acc + curr}, 0);
        if (consumerQuantity !== undefined) {
          return prev - consumerQuantity
        } else {
          return prev
        }
      })
    } else {
        setTotalConsumerQuantity((prev: number) => {
        const consumerQuantity = order?.orderItems.map((item) => item.packType === "Consumer Pack" ? item.quantity : 0).reduce((acc: number, curr: number) => {return acc + curr}, 0);
        if (consumerQuantity !== undefined) {
          return prev + consumerQuantity
        } else {
          return prev
        }
      })

      setTotalBulkQuantity((prev: number) => {
        const bulkQuantity = order?.orderItems.map((item) => item.packType === "Bulk Pack" ? item.quantity : 0).reduce((acc: number, curr: number) => {return acc + curr}, 0 ); 

        if (bulkQuantity !== undefined) {
          return prev + bulkQuantity
        } else {
          return prev 
        }
      })
    }
    
    
  }

  const handleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
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

// 2. Add this helper function to check if all locations are selected:

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

// 3. Add this helper function to check if any location is selected:

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

  // Calculate quantities based on pack type
  // State for edited values
  const [editedValues, setEditedValues] = useState<Record<string, {
    consumerQuantity: number;
    bulkQuantity: number;
    consumerRate: number;
    bulkRate: number
  }>>({})

  const handleEditChange = (orderId: string, field: string, value: number) => {
    setEditedValues(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }))
  }

  const calculateQuantities = (orderItems: OrderItem[]) => {
    let consumerQuantity = 0
    let bulkQuantity = 0
    let totalQuantity = 0

    orderItems.forEach((item) => {
      const qty = Number(item.quantity) || 0
      totalQuantity += qty

      if (item.packType === "Consumer Pack") {
        consumerQuantity += qty
      } else if (item.packType === "Bulk Pack") {
        bulkQuantity += qty
      }
    })

    return { consumerQuantity, bulkQuantity, totalQuantity }
  }

  const handleSelectAllOrders = () => {

    console.log(selectedOrders)
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
      setTotalConsumerQuantity(0); 
    } else {
      let consQuant = 0; 
      orders.map((item) => item.orderItems.map((item) => item.packType === "Consumer Pack" ? item.quantity : 0)).map((item) => item.map((value: number) => {consQuant += value; return 0; }))
   
      setTotalConsumerQuantity(consQuant)
      setSelectedOrders(new Set(filteredOrders.map((order) => order.order_id)))
    }


  }

  const handleAcceptOrders = async () => {
    const selectedOrdersList = Array.from(selectedOrders).map(orderId => ({
      orderId,
      ...editedValues[orderId]
    }))

    console.log("Sending edited values:", selectedOrdersList)

    const response: any = await fetch('http://157.15.93.224:8000/api/v1/orders/statusUpdate', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: 'ACCEPT',
        orders: selectedOrdersList
      })
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json();

    if (result.status === 200) {
      console.log('orders accepted with edits')
      
    }

    setSelectedOrders(new Set())
  }

  const handleRejectOrders = () => {
    const selectedOrdersList = Array.from(selectedOrders)
    console.log("Rejecting orders:", selectedOrdersList)
    console.log(
      "Selected order details:",
      orders.filter((order) => selectedOrders.has(order.order_id)),
    )
    // Clear selection after action
    setSelectedOrders(new Set())
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

  const filteredOrders = orders.filter(
    (order) =>
      order.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.partyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.empId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const isAllSelected = filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length
  const isIndeterminate = selectedOrders.size > 0 && selectedOrders.size < filteredOrders.length

  return (
    <div className="flex h-full bg-gray-50 w-full max-w-full overflow-hidden">
     
      <motion.div
        initial={{width: '20rem'}}
        animate={{width: isFilterOpen ? '20rem' : '2.5rem'}}
        whileHover={{width: '20rem'}}
        transition={{duration: 0.3, ease: 'easeInOut'}}
        onHoverStart={() => {setIsFilterOpen(true)}}
        onHoverEnd={() => {if (!isSelectingDate) setIsFilterOpen(false)}}
        className=" bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0"
        style={{ width: "clamp(256px, 20vw, 320px)" }}
      >
      {isFilterOpen ? <div className="p-4">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
        <FaFilter className="text-blue-600" />
        Filter by Location
      </h3>
      <div className="text-xs text-gray-500 mb-4">
        Select states, depots, or specific employees to filter orders
    </div>

  {/* Date Range Filter */}
  <div className="mb-4">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Date Range</h4>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => {setFromDate(e.target.value); setIsSelectingDate(false)}}
          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          onClick={() => setIsSelectingDate(true)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => {setFromDate(e.target.value); setIsSelectingDate(false)}}
          onClick={() => setIsSelectingDate(true)}
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
        </div> : <div className="w-40 p-0 absolute left-4.5 h-20">
           <IoIosOpen size={28}/>
          </div>}
      </motion.div>

      {/* Orders Panel */}
      <div className="flex-1 p-6 flex flex-col min-h-0 min-w-0">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Orders</h2>

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
            {orders.length !== 0 && <div className="flex gap-3 justify-center items-center">
            <button className="bg-blue-600 w-40 py-3 rounded-lg text-white cursor-pointer">
              <CSVLink data={
                [
                  ["Employee", "Party Name", "Date", "Conumser Rate", "Bulk Rate", "Total Quantity", "Discount", "Total Amount", "Payment"], 
                  ...orders.map((item) => {return [item.empName, item.partyName, new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    }), item.consumerRate, item.bulkRate, item.orderItems.map((item) => item.quantity).reduce((acc, curr) => Number(acc) + Number(curr), 0),item.discountAmount, item.totalAmount, item.paymentMode]})
                ]
              } filename={`all-order-CSV`}>Download CSV (All orders)</CSVLink>
              {/* Employee	Party Name	Date	Bulk Qty	Consumer Qty	Total Qty	Consumer Rate	Bulk Rate	Discount	Total Amount	Payment */}
            </button>
            {(selectedOrders.size > 0) && <button className="bg-blue-600 w-40 py-3 rounded-lg text-white cursor-pointer">
              <CSVLink data={
                [
                  ["Employee", "Party Name", "Date", "Conumser Rate", "Bulk Rate", "Total Quantity", "Discount", "Total Amount", "Payment"], 
                  ...orders.filter(item => selectedOrders.has(item.order_id)).map((item) => {
                    return [item.empName, item.partyName, new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    }), item.consumerRate, item.bulkRate, item.orderItems.map((item) => item.quantity).reduce((acc, curr) => Number(acc) + Number(curr), 0),item.discountAmount, item.totalAmount, item.paymentMode]
                    
                  })
                ]
              } filename="selected-order-csv">Download CSV (Selected orders)</CSVLink>
              {/* Employee	Party Name	Date	Bulk Qty	Consumer Qty	Total Qty	Consumer Rate	Bulk Rate	Discount	Total Amount	Payment */}
            </button>}
          </div>}
          </div>
          
        </div>

        {/* Orders Table - Flex grow to take remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No pending orders found</div>
              <div className="text-gray-400 text-sm">Select locations from the filter panel to view orders</div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow flex-1 min-h-0 border border-gray-200 overflow-hidden">
                <div className="h-full overflow-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200" style={{ minWidth: "1000px" }}>
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
                              onChange={handleSelectAllOrders}
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
                            style={{ minWidth: "180px" }}
                          >
                            Party Name
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ minWidth: "100px" }}
                          >
                            Outstanding
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ minWidth: "100px" }}
                          >
                            Collection
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "100px" }}
                          >
                            Date
                          </th>
                          <th
                            className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "80px" }}
                          >
                            Bulk Qty
                          </th>
                          <th
                            className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "90px" }}
                          >
                            Consumer Qty
                          </th>
                          <th
                            className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "80px" }}
                          >
                            Total Qty
                          </th>
                          <th
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "100px" }}
                          >
                            Consumer Rate
                          </th>
                          <th
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "90px" }}
                          >
                            Bulk Rate
                          </th>
                          <th
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "80px" }}
                          >
                            Discount
                          </th>
                          <th
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "110px" }}
                          >
                            Total Amount
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: "100px" }}
                          >
                            Payment
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => {
                          const { consumerQuantity, bulkQuantity, totalQuantity } = calculateQuantities(
                            order.orderItems,
                          )
                          const isExpanded = expandedOrders.has(order.order_id)

                          return (
                            <React.Fragment key={order.order_id}>
                              <tr className="hover:bg-gray-50">
                                <td className="px-2 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedOrders.has(order.order_id)}
                                    onChange={() => handleOrderSelection(order.order_id)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => handleOrderExpansion(order.order_id)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    {isExpanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
                                  </button>
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {order.empName}
                                </td>
                                <td className="px-3 py-4 w-52">
                                  <div className="text-sm font-medium text-gray-900" title={order.partyName}>
                                    {order.partyName}
                                  </div>
                                  <div className="text-xs text-gray-500">{order.partyId}</div>
                                </td>
                                <td className="px-3 py-4 w-52">
                                  <div className="text-sm font-medium text-gray-900">
                                    {order.outstanding}
                                  </div>
                                </td>
                                <td className="px-3 py-4 w-52">
                                  <div className="text-sm font-medium text-gray-900">
                                    {order.collection.amount}
                                  </div>
                                  <div className="text-xs text-gray-500">{order.collection.paymentMethod}</div>
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                  })}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                  <input
                                    type="number"
                                    value={editedValues[order.order_id]?.bulkQuantity ?? bulkQuantity}
                                    onChange={(e) => handleEditChange(order.order_id, 'bulkQuantity', Number(e.target.value))}
                                    className="w-12 text-center border rounded"
                                  />
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                  <input
                                    type="number"
                                    value={editedValues[order.order_id]?.consumerQuantity ?? consumerQuantity}
                                    onChange={(e) => handleEditChange(order.order_id, 'consumerQuantity', Number(e.target.value))}
                                    className="w-12 text-center border rounded"
                                  />
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                  {totalQuantity}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                  <input
                                    type="number"
                                    value={editedValues[order.order_id]?.consumerRate ?? (order.consumerRate || 0)}
                                    onChange={(e) => handleEditChange(order.order_id, 'consumerRate', Number(e.target.value))}
                                    className="w-12 text-right border rounded"
                                  />
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                  <input
                                    type="number"
                                    value={editedValues[order.order_id]?.bulkRate ?? (order.bulkRate || 3)}
                                    onChange={(e) => handleEditChange(order.order_id, 'bulkRate', Number(e.target.value))}
                                    className="w-12 text-right border rounded"
                                  />
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                  ₹{Number(order.discountAmount || 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                  ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      order.paymentMode === "cash"
                                        ? "bg-green-100 text-green-800"
                                        : order.paymentMode === "credit"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {order.paymentMode}
                                  </span>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={13} className="px-6 py-4 bg-gray-50">
                                    <div className="space-y-3">
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items:</h4>
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full border border-gray-200 rounded-lg">
                                          <thead className="bg-white">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                Item Code
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                Item Name
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                Pack Type
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                Quantity
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                Rate
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                Amount
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white">
                                            {order.orderItems.map((item, index) => (
                                              <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                <td className="px-4 py-2 text-sm text-gray-900 border-b font-medium">
                                                  {item.itemCode}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                                  {item.itemName}
                                                </td>
                                                <td className="px-4 py-2 text-sm border-b">
                                                  <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                      item.packType === "Consumer Pack"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : item.packType === "Bulk Pack"
                                                          ? "bg-purple-100 text-purple-800"
                                                          : "bg-gray-100 text-gray-800"
                                                    }`}
                                                  >
                                                    {item.packType}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900 border-b text-center">
                                                  {item.quantity}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900 border-b text-right">
                                                  ₹{Number(item.rate).toLocaleString("en-IN")}
                                                </td>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900 border-b text-right">
                                                  ₹{Number(item.amount).toLocaleString("en-IN")}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
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
              </div>

              {/* Action Buttons - Fixed at bottom */}
              {selectedOrders.size > 0 && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedOrders.size} order{selectedOrders.size !== 1 ? "s" : ""} selected
                    </div>
                    <div className="flex items-center gap-3">
                      <p>Consumer Quantity: {totalConsumerQuantity}</p>
                      <p>Bulk Quantity: {totalBulkQuantity}</p>
                      <button
                        onClick={handleAcceptOrders}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        <FaCheck className="mr-2" size={14} />
                        Accept Orders
                      </button>
                      <button
                        onClick={handleRejectOrders}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                      >
                        <FaTimes className="mr-2" size={14} />
                        Reject Orders
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

export default Orders
