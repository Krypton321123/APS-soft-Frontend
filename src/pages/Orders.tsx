import { useState, useEffect, useMemo } from "react"
import React from "react"
import { FaChevronDown, FaChevronRight, FaSearch, FaFilter, FaCheck, FaTimes } from "react-icons/fa"
import { CSVLink } from 'react-csv'
import { motion } from 'motion/react'
import { IoIosOpen } from "react-icons/io"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  flexRender,
} from '@tanstack/react-table'
import type { ColumnDef } from "@tanstack/react-table"
import { ChevronUp } from 'lucide-react'
import { toast } from "sonner"
import axios from "axios"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup } from "@/components/ui/select"

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
    amount: number
    paymentMethod: string
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
  console.log(users)
  const [expanded, setExpanded] = useState({})
  const [orders, setOrders] = useState<Order[]>([])
  const [adminType] = useState(localStorage.getItem("userType"))
  const [locationTree, setLocationTree] = useState<LocationNode[]>([])
  const [loading, setLoading] = useState(false)
  const [orderFilter, setOrderFilter] = useState("all"); 
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState({})
  const today = new Date().toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState<string>(today)
  const [toDate, setToDate] = useState<string>(today)
  const [totalConsumerQuantity, setTotalConsumerQuantity] = useState<number>(0)
  const [totalBulkQuantity, setTotalBulkQuantity] = useState<number>(0)
  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const [grouping, setGrouping] = useState<string[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, {
    consumerQuantity: number
    bulkQuantity: number
    consumerRate: number
    bulkRate: number, 
    remarks: string 
  }>>({})

  

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

      const mockUsers: User[] = [
        { user_id: 1, username: "emp1", stnm: "ASSAM", stcd: "AS", untnm: "GUWAHATI", untcd: "GUW", usrnm: "John Doe" },
        { user_id: 2, username: "emp2", stnm: "ASSAM", stcd: "AS", untnm: "SILCHAR", untcd: "SIL", usrnm: "Jane Smith" },
        { user_id: 3, username: "emp3", stnm: "BIHAR", stcd: "BR", untnm: "PATNA", untcd: "PAT", usrnm: "Bob Wilson" },
      ]
      setUsers(mockUsers)
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

  const isLocationAllowed = (locationName: string, locationType: 'state' | 'depot' | 'user'): boolean => {
    console.log(locationType)
    if (userType === 'ADMIN') return true
    if (allowedLocationsArray.length === 0) return false
    console.log(locationName.toLowerCase().slice(0, 3))
    return allowedLocationsArray.some(loc => 
      loc.toLowerCase() === locationName.toLowerCase().slice(0, 3)
    )
  }

  const stateMap = new Map<string, LocationNode>()

  users.forEach((user) => {
    if (!user.stnm || !user.untnm) return

    if (userType === 'OPERATOR') {
      const isUserAllowed = isLocationAllowed(user.usrnm, 'user') || 
                           isLocationAllowed(user.username, 'user')
      const isDepotAllowed = isLocationAllowed(user.untnm, 'depot')
      const isStateAllowed = isLocationAllowed(user.stnm, 'state')
      

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

  // Filter out empty states and depots
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
      fetchOrders(states, depots, employees)
    } else {
      setOrders([])
    }
  }, [locationTree, fromDate, toDate, orderFilter])

  const fetchOrders = async (states: string[], depots: string[], employees: string[]) => {
    setOrdersLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (states.length > 0) params.set("states", states.join(","))
      if (depots.length > 0) params.set("depots", depots.join(","))
      if (employees.length > 0) params.set("employees", employees.join(","))
      params.set("from", fromDate)
      params.set("to", toDate)
      params.set("user", localStorage.getItem("username") || "")
      params.set("filter", orderFilter); 
      params.set("admin", adminType as string)

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
        setOrders([]); 
        throw new Error(result.message || "Failed to fetch orders")
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch orders")

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
          consumerRate: 100,
          bulkRate: 80,
          collection: { amount: 200, paymentMethod: "Cash" },
          orderItems: [
            { id: "1", itemCode: "IT001", itemName: "Product A", quantity: 10, rate: 1500, amount: 15000, packType: "Consumer Pack" },
          ],
        },
      ]
      setOrders(mockOrders)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleEditChange = (orderId: string, field: string, value: number) => {
    setEditedValues(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }))
  }

  const calculateQuantities = (orderItems: OrderItem[] | null | undefined) => {
    if (!orderItems || !Array.isArray(orderItems)) return {
      totalQuantity: 0, bulkQuantity: 0, consumerQuantity: 0
    }; 

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

  const handleAcceptOrders = async (userType: string) => {

    let status = ''; 

    if (userType === "ADMIN" || userType === "HEAD-OFFICE") {
      status = "ACCEPT"
    } else if (userType === "DEPOT-INCHARGE") {
      status = "PARK"
    } else {
      return toast.info("Not a valid User Type"); 
    }

    const formatOrders = table.getSelectedRowModel().rows.map((row) => {
            console.log(row.original.consumerRate)
            return {
              id: row.original.order_id, consumerRate: editedValues[row.original.order_id]?.consumerRate ?? row.original.consumerRate, bulkRate: editedValues[row.original.order_id]?.bulkRate ?? row.original.bulkRate, remarks: editedValues[row.original.order_id]?.remarks ?? ""
          }
        }) 

    const dataToSend = {
        orders: formatOrders, 
        adminName: localStorage.getItem("username"), 
        status
    }

    try {
      
      const response = await axios.post(`${API_BASE_URL}/orders/accept`, dataToSend); 

      if (response.status === 200) {
        formatOrders.map((item) => {
          const updatedOrders = orders.filter((order) => item.id !== order.order_id); 

          setOrders(updatedOrders); 
          setRowSelection({}); 
        })
        return toast.success(status === "ACCEPT" ? "Orders Accepted Successfully" : "Orders parked successfully"); 
      }

    } catch (err: any) {
      console.log("Error posting orders: ", err); 
      return toast.error("Error accepting / parking orders")
    }
  }

  const handleRejectOrders = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    
    try {

      const formatOrders = selectedRows.map((row) => {
            console.log(row.original.consumerRate)
            return {
              id: row.original.order_id, consumerRate: editedValues[row.original.order_id]?.consumerRate ?? row.original.consumerRate, bulkRate: editedValues[row.original.order_id]?.bulkRate ?? row.original.bulkRate, remarks: editedValues[row.original.order_id]?.remarks ?? ""
          }
        })  

        const dataToSend = {
        orders: formatOrders, 
        adminName: localStorage.getItem("username"), 
      }

      const response = await axios.post(`${API_BASE_URL}/orders/reject`, dataToSend); 

      if (response.status === 200) {
        formatOrders.map((item) => {
          const updatedOrders = orders.filter((order) => item.id !== order.order_id); 

          setOrders(updatedOrders); 
          setRowSelection({}); 
        })
        return toast.success(status === "ACCEPT" ? "Orders Accepted Successfully" : "Orders parked successfully"); 
      }

    } catch (err: any) {
      console.log("Error posting orders: ", err); 
      return toast.error("Error accepting / parking orders")
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

  const columns = useMemo<ColumnDef<Order>[]>(
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
        cell: info => <span className="text-sm text-gray-900 font-light">{info.getValue() as string}</span>,
        size: 80,
      },
      {
        accessorKey: 'partyName',
        header: 'Party Name',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-gray-900 w-72" title={row.original.partyName}>
              {row.original.partyName}
            </div>
            <div className="text-xs text-gray-500">{row.original.partyId}</div>
          </div>
        ),
        minSize: 375,
      },
      {
        accessorKey: 'outstanding',
        header: 'Outstanding',
        cell: info => <div className="text-sm font-medium text-gray-900">{info.getValue() as number}</div>,
        minSize: 100,
      },
      {
        accessorKey: 'collection',
        header: 'Collection',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-gray-900">{row.original.collection.amount}</div>
            <div className="text-xs text-gray-500">{row.original.collection.paymentMethod}</div>
          </div>
        ),
        minSize: 75,
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
        id: 'bulkQuantity',
        header: 'Bulk Qty',
        cell: ({ row }) => {
          const { bulkQuantity } = calculateQuantities(row.original.orderItems)
          return (
            <input
              type="number"
              value={editedValues[row.original.order_id]?.bulkQuantity ?? bulkQuantity}
              onChange={(e) => handleEditChange(row.original.order_id, 'bulkQuantity', Number(e.target.value))}
              className="w-12 text-center border rounded"
            />
          )
        },
        size: 80,
      },
      {
        id: 'consumerQuantity',
        header: 'Consumer Qty',
        cell: ({ row }) => {
          const { consumerQuantity } = calculateQuantities(row.original.orderItems)
          return (
            <input
              type="number"
              value={editedValues[row.original.order_id]?.consumerQuantity ?? consumerQuantity}
              onChange={(e) => handleEditChange(row.original.order_id, 'consumerQuantity', Number(e.target.value))}
              className="w-12 text-center border rounded"
            />
          )
        },
        size: 90,
      },
      {
        id: 'totalQuantity',
        header: 'Total Qty',
        accessorFn: row => calculateQuantities(row.orderItems).totalQuantity,
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-gray-900">{getValue() as number}</span>
        ),
        size: 80,
         aggregationFn: 'sum', 
          aggregatedCell: ({ getValue }) => {
            console.log(getValue())
            return <span className="text-sm font-bold text-blue-600">
              {Math.round(getValue() as number)}
            </span>
          },
      },
      {
        accessorKey: 'consumerRate',
        header: 'Consumer Rate',
        cell: ({ row }) => (
          <input
            type="number"
            value={editedValues[row.original.order_id]?.consumerRate ?? (row.original.consumerRate || 0)}
            onChange={(e) => handleEditChange(row.original.order_id, 'consumerRate', Number(e.target.value))}
            className="w-12 text-right border rounded"
          />
        ),
        size: 100,
      },
      {
        accessorKey: 'bulkRate',
        header: 'Bulk Rate',
        cell: ({ row }) => (
          <input
            type="number"
            value={editedValues[row.original.order_id]?.bulkRate ?? (row.original.bulkRate || 3)}
            onChange={(e) => handleEditChange(row.original.order_id, 'bulkRate', Number(e.target.value))}
            className="w-12 text-right border rounded"
          />
        ),
        size: 90,
      },
      {
        accessorKey: 'discountAmount',
        header: 'Discount',
        cell: info => (
          <span className="text-sm text-gray-900">
            ₹{Number(info.getValue() || 0).toLocaleString("en-IN")}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: "amountAfterDiscount", 
        header: "Amount After Discount", 
        cell: ({ row }) => {
          return <span>{row.original.consumerRate! - row.original.discountAmount}</span>
        }
      },
      {
        accessorKey: 'totalAmount',
        accessorFn: row => Number(row.totalAmount),
        header: ({ column }) => (
          <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={column.getToggleSortingHandler()}
          >
            Total Amount
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
        
        cell: ({getValue}) => (
          <span className="text-sm font-semibold text-gray-900">
            ₹{Number(getValue())}
          </span>
        ),
        aggregationFn: 'sum', 
        aggregatedCell: ({ getValue }) => ( 
          <span className="text-sm font-bold text-blue-600">
            Total: ₹{Math.round(getValue() as number).toLocaleString("en-IN")}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'paymentMode',
        header: 'Payment',
        cell: info => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              info.getValue() === "cash"
                ? "bg-green-100 text-green-800"
                : info.getValue() === "credit"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {info.getValue() as string}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "remarks", 
        header: "Remarks (Accept / Park)", 
        cell: ({ row }) => {
          return <Textarea className="w-40" onChange={(e) => {editedValues[row.original.order_id].remarks = e.target.value}} />
        }
      }
    ],
    [editedValues]
  )

  const table = useReactTable({
    data: orders ?? [],
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
    getPaginationRowModel: getPaginationRowModel(),
    onGroupingChange: setGrouping,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    getGroupedRowModel: getGroupedRowModel(),
    getRowCanExpand: () => true,
  })

  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows
    let consTotal = 0
    let bulkTotal = 0
    
    selectedRows.forEach(row => {
      const { consumerQuantity, bulkQuantity } = calculateQuantities(row.original.orderItems)
      consTotal += consumerQuantity
      bulkTotal += bulkQuantity
    })
    
    setTotalConsumerQuantity(consTotal)
    setTotalBulkQuantity(bulkTotal)
  }, [rowSelection, orders])

  const selectedOrders = table.getSelectedRowModel().rows.map(row => row.original)

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
                Select states, depots, or specific employees to filter orders
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Date Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {setFromDate(e.target.value); setRowSelection({})}}
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
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {orders.length !== 0 && (
              <div className="flex gap-3 justify-center items-center">
                <button className="bg-blue-600 w-40 py-3 rounded-lg text-white cursor-pointer">
                  <CSVLink 
                    data={[
                      ["Employee", "Party Name", "Date", "Consumer Rate", "Bulk Rate", "Total Quantity", "Discount", "Amount After Discount","Total Amount", "Payment"], 
                      ...orders.map((item) => {
                        const { totalQuantity } = calculateQuantities(item.orderItems)
                        return [
                          item.empName, 
                          item.partyName, 
                          new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          }), 
                          item.consumerRate, 
                          item.bulkRate, 
                          totalQuantity,
                          item.discountAmount, 
                          item.consumerRate! - item.discountAmount,
                          item.totalAmount, 
                          item.paymentMode
                        ]
                      })
                    ]} 
                    filename={`all-order-CSV`}
                  >
                    Download CSV (All orders)
                  </CSVLink>
                </button>
                
                {selectedOrders.length > 0 && (
                  <button className="bg-blue-600 w-40 py-3 rounded-lg text-white cursor-pointer">
                    <CSVLink 
                      data={[
                        ["Employee", "Party Name", "Date", "Consumer Rate", "Bulk Rate", "Total Quantity", "Discount", "Amount After Discount", "Total Amount", "Payment"], 
                        ...selectedOrders.map((item) => {
                          const { totalQuantity } = calculateQuantities(item.orderItems)
                          return [
                            item.empName, 
                            item.partyName, 
                            new Date(item.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            }), 
                            item.consumerRate, 
                            item.bulkRate, 
                            totalQuantity,
                            item.discountAmount, 
                            item.consumerRate! - item.discountAmount, 
                            item.totalAmount, 
                            item.paymentMode
                          ]
                        })
                      ]} 
                      filename="selected-order-csv"
                    >
                      Download CSV (Selected orders)
                    </CSVLink>
                  </button>
                  
                )}
              </div>
              
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
              Order Filter:
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a type"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All</SelectItem>
                      {adminType === "DEPOT-INCHARGE"|| adminType === "ADMIN" && <SelectItem value="park">Parked</SelectItem>}
                      <SelectItem value="accept">Accepted</SelectItem>
                      <SelectItem value="reject">Rejected</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
        </div>

        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          {['empName', 'paymentMode', 'status'].map(col => (
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
              {col === 'empName' ? 'Employee' : col === 'paymentMode' ? 'Payment Mode' : 'Status'}
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

        {/* Orders Table */}
        <div className="flex-1 flex flex-col min-h-0">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
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
                                          {row.original.orderItems.map((item, index) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} orders
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedOrders.length > 0 && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedOrders.length} order{selectedOrders.length !== 1 ? "s" : ""} selected
                    </div>
                   {adminType !== "OPERATOR" && <div className="flex items-center gap-3">
                      <p className="text-sm">Consumer Quantity: <span className="font-semibold">{totalConsumerQuantity}</span></p>
                      <p className="text-sm">Bulk Quantity: <span className="font-semibold">{totalBulkQuantity}</span></p>
                      <button
                        onClick={() => handleAcceptOrders(adminType as string)}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        <FaCheck className="mr-2" size={14} />
                        {adminType === "DEPOT-INCHARGE" && "Park Orders"}
                        {adminType === "HEAD-OFFICE" && "Accept Orders"}
                        {adminType === "ADMIN" && "Accept Orders"}
                      </button>
                      <button
                        onClick={handleRejectOrders}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                      >
                        <FaTimes className="mr-2" size={14} />
                        Reject Orders
                      </button>
                    </div>}
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