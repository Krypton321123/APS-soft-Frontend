import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import React from "react";
import { CSVLink } from "react-csv";
import { motion, AnimatePresence } from "motion/react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  X,
  Download,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ── Types ──────────────────────────────────────────────────────────────────────
interface User {
  user_id: number;
  username: string;
  stnm: string;
  stcd: string;
  untnm: string;
  untcd: string;
  usrnm: string;
}

interface OrderItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  rate: number;
  amount: number;
  packType: string;
}

interface Order {
  order_id: string;
  partyId: string;
  partyName: string;
  empId: string;
  empName: string;
  totalAmount: number;
  discountAmount: number;
  discountAmountBulk: number;
  paymentMode: string;
  status: string;
  creditDays?: number;
  createdAt: string;
  consumerRate?: number;
  bulkRate?: number;
  orderItems: OrderItem[];
  outstanding: number;
  secFreight: number;
  vehno: string;
  collection: { amount: number; paymentMethod: string };
  derivedStatus: string;
  sicd: string;
  remarks?: string;
}

interface LocationNode {
  name: string;
  code: string;
  type: "state" | "depot" | "user";
  children?: LocationNode[];
  userId?: number;
  isSelected: boolean;
  isIndeterminate: boolean;
  isExpanded: boolean;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  success: boolean;
}

interface EditedEntry {
  discountConsumer: number;
  discountBulk: number;
  remarks: string;
}

// ── Shared numeric input style ─────────────────────────────────────────────────
const numericInputClass =
  "h-7 text-center rounded-lg border px-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#5b6af0]";
const numericInputStyle = {
  borderColor: "#e8e9ef",
  fontFamily: "'DM Sans', sans-serif",
  color: "#1a1a2e",
};

// ── Stable editable cell components (defined OUTSIDE Orders) ──────────────────
interface EditableRemarksCellProps {
  orderId: string;
  onChange: (orderId: string, field: string, value: string) => void;
  initialValue?: string;
  isDisabled?: boolean;
}

const discountChangeEmitter = new EventTarget();

interface EditableCellProps {
  initialValue: number | string;
  orderId: string;
  field: string;
  onChange: (orderId: string, field: string, value: number) => void;
  width?: string;
  align?: "center" | "right";
}

const EditableNumericCell = ({
  initialValue,
  orderId,
  field,
  onChange,
  width = "w-14",
  align = "center",
}: EditableCellProps) => {
  const [localValue, setLocalValue] = useState(String(initialValue));

  const prevOrderId = useRef(orderId);
  const prevInitial = useRef(initialValue);
  useEffect(() => {
    if (
      prevOrderId.current !== orderId ||
      prevInitial.current !== initialValue
    ) {
      setLocalValue(String(initialValue));
      prevOrderId.current = orderId;
      prevInitial.current = initialValue;
    }
  }, [orderId, initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setLocalValue(raw);
      onChange(orderId, field, raw === "" ? 0 : Number(raw));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      onChange={handleChange}
      className={`${width} ${align === "right" ? "text-right" : ""} ${numericInputClass}`}
      style={numericInputStyle}
    />
  );
};

const EditableRemarksCell = ({
  orderId,
  onChange,
  initialValue = "",
  isDisabled = false,
}: EditableRemarksCellProps) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    onChange(orderId, "remarks", e.target.value);
  };

  if (isDisabled) {
    return (
      <span
        style={{
          fontSize: 11,
          color: localValue ? "#4a4c6a" : "#c4c6d2",
          fontFamily: "'DM Sans', sans-serif",
          fontStyle: localValue ? "normal" : "italic",
        }}
      >
        {localValue || "—"}
      </span>
    );
  }

  return (
    <Textarea
      value={localValue}
      onChange={handleChange}
      className="w-36 text-xs min-h-[50px] resize-none rounded-lg border focus:outline-none"
      style={{
        borderColor: "#e8e9ef",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
      }}
    />
  );
};

// ── EditableDiscountCell — owns its own local state, initialises from the ref ──
interface EditableDiscountCellProps {
  orderId: string;
  field: "discountConsumer" | "discountBulk";
  fallbackValue: number;
  editedValuesRef: React.MutableRefObject<Record<string, EditedEntry>>;
  onChange: (orderId: string, field: string, value: number) => void;
  type: "consumer" | "bulk";
}

const EditableDiscountCell = ({
  orderId,
  field,
  fallbackValue,
  editedValuesRef,
  onChange,
  type,
}: EditableDiscountCellProps) => {
  const getInitial = () => {
    const entry = editedValuesRef.current[orderId];
    return entry ? String(entry[field]) : String(fallbackValue);
  };

  const [localValue, setLocalValue] = useState(getInitial);

  const prevOrderId = useRef(orderId);
  useEffect(() => {
    if (prevOrderId.current !== orderId) {
      setLocalValue(getInitial());
      prevOrderId.current = orderId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setLocalValue(raw);
      onChange(orderId, field, raw === "" ? 0 : Number(raw));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={handleChange}
        className={`w-20 ${numericInputClass}`}
        style={numericInputStyle}
      />
      <span
        className="text-xs px-1.5 py-0.5 rounded-md self-start"
        style={{
          background: type === "consumer" ? "#eff6ff" : "#f5f3ff",
          color: type === "consumer" ? "#2563eb" : "#7c3aed",
          fontSize: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {type === "consumer" ? "Consumer" : "Bulk"}
      </span>
    </div>
  );
};

// ── AfterDiscountLiveCell — listens to the emitter, reads from ref ─────────────
interface AfterDiscountLiveCellProps {
  orderId: string;
  baseRate: number;
  field: "discountConsumer" | "discountBulk";
  fallbackDiscount: number;
  editedValuesRef: React.MutableRefObject<Record<string, EditedEntry>>;
  type: "consumer" | "bulk";
}

const AfterDiscountLiveCell = ({
  orderId,
  baseRate,
  field,
  fallbackDiscount,
  editedValuesRef,
  type,
}: AfterDiscountLiveCellProps) => {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === orderId) forceRender((n) => n + 1);
    };
    discountChangeEmitter.addEventListener("change", handler);
    return () => discountChangeEmitter.removeEventListener("change", handler);
  }, [orderId]);

  const discount =
    editedValuesRef.current[orderId]?.[field] ?? fallbackDiscount;
  const result = Math.max(0, Number(baseRate || 0) - Number(discount || 0));

  return (
    <div className="flex flex-col gap-0.5">
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: type === "consumer" ? "#2563eb" : "#7c3aed",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        ₹{result.toLocaleString("en-IN")}
      </span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-md self-start"
        style={{
          background: type === "consumer" ? "#eff6ff" : "#f5f3ff",
          color: type === "consumer" ? "#2563eb" : "#7c3aed",
          fontSize: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {type === "consumer" ? "Consumer" : "Bulk"}
      </span>
    </div>
  );
};

// ── Status badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<
    string,
    { label: string; bg: string; color: string; border: string }
  > = {
    ACCEPT: {
      label: "Accepted",
      bg: "#f0fdf4",
      color: "#16a34a",
      border: "#bbf7d0",
    },
    PARK: {
      label: "Parked",
      bg: "#fffbeb",
      color: "#d97706",
      border: "#fde68a",
    },
    REJECT: {
      label: "Rejected",
      bg: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
    },
    UNVERIFIED: {
      label: "Unverified",
      bg: "#f4f5fa",
      color: "#9496b0",
      border: "#e8e9ef",
    },
  };
  const c = config[status] ?? config["UNVERIFIED"];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-md border font-medium"
      style={{
        background: c.bg,
        color: c.color,
        borderColor: c.border,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {c.label}
    </span>
  );
};

// ── Frozen rate cell ───────────────────────────────────────────────────────────
const FrozenRateCell = ({
  value,
  type,
}: {
  value: number;
  type: "consumer" | "bulk";
}) => (
  <div className="flex flex-col gap-0.5">
    <span
      style={{
        fontSize: 12.5,
        fontWeight: 500,
        color: "#1a1a2e",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      ₹{Number(value || 0).toLocaleString("en-IN")}
    </span>
    <span
      className="text-xs px-1.5 py-0.5 rounded-md self-start"
      style={{
        background: type === "consumer" ? "#eff6ff" : "#f5f3ff",
        color: type === "consumer" ? "#2563eb" : "#7c3aed",
        fontSize: 10,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {type === "consumer" ? "Consumer" : "Bulk"}
    </span>
  </div>
);

// ── Location Tree Node ─────────────────────────────────────────────────────────
const TreeNode = ({
  node,
  path,
  depth,
  onToggleExpand,
  onToggleSelection,
}: {
  node: LocationNode;
  path: number[];
  depth: number;
  onToggleExpand: (path: number[]) => void;
  onToggleSelection: (path: number[]) => void;
}) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors duration-100 hover:bg-[#f4f5fa] group"
        style={{ paddingLeft: depth === 0 ? 8 : depth === 1 ? 20 : 32 }}
      >
        <button
          onClick={() => hasChildren && onToggleExpand(path)}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          style={{
            color: "#b0b2c0",
            visibility: hasChildren ? "visible" : "hidden",
          }}
        >
          {node.isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
        </button>

        <input
          type="checkbox"
          checked={node.isSelected}
          ref={(el) => {
            if (el) el.indeterminate = node.isIndeterminate;
          }}
          onChange={() => onToggleSelection(path)}
          className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-pointer accent-[#5b6af0]"
        />

        <span
          style={{
            fontSize: node.type === "state" ? 12 : 11.5,
            fontWeight:
              node.type === "state" ? 500 : node.type === "depot" ? 400 : 400,
            color:
              node.type === "state"
                ? "#1a1a2e"
                : node.type === "depot"
                  ? "#4a4c6a"
                  : "#6b6d85",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {node.name}
        </span>

        {node.type === "state" && (
          <span
            className="ml-auto text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: "#f4f5fa", color: "#9496b0", fontSize: 10 }}
          >
            {node.children?.length}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && node.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {node.children!.map((child, i) => (
              <TreeNode
                key={`${child.name}-${i}`}
                node={child}
                path={[...path, i]}
                depth={depth + 1}
                onToggleExpand={onToggleExpand}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
function Orders() {
  const [_, setUsers] = useState<User[]>([]);
  const [expanded, setExpanded] = useState({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminType] = useState(localStorage.getItem("userType"));
  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState({});
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [totalConsumerQuantity, setTotalConsumerQuantity] = useState<number>(0);
  const [totalBulkQuantity, setTotalBulkQuantity] = useState<number>(0);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [grouping, setGrouping] = useState<string[]>([]);

  const [editedValues, setEditedValues] = useState<Record<string, EditedEntry>>(
    {},
  );
  const editedValuesRef = useRef(editedValues);
  useEffect(() => {
    editedValuesRef.current = editedValues;
  }, [editedValues]);

  const [globalVehno, setGlobalVehno] = useState<string>("");
  const [globalSecfreight, setGlobalSecfreight] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── unified change handler ─────────────────────────────────────────────────
  const handleEditChange = useCallback(
    (orderId: any, field: any, value: any) => {
      setEditedValues((prev) => {
        const next = {
          ...prev,
          [orderId]: { ...prev[orderId], [field]: value },
        };
        editedValuesRef.current = next;
        return next;
      });
      discountChangeEmitter.dispatchEvent(
        new CustomEvent("change", { detail: orderId }),
      );
    },
    [],
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/user/fetchUsers`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result: ApiResponse<User[]> = await response.json();
      if (result.success && result.data) {
        setUsers(result.data);
        buildLocationTree(result.data);
      } else throw new Error(result.message || "Failed to fetch users");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch users",
      );
      const mockUsers: User[] = [
        {
          user_id: 1,
          username: "emp1",
          stnm: "ASSAM",
          stcd: "AS",
          untnm: "GUWAHATI",
          untcd: "GUW",
          usrnm: "John Doe",
        },
        {
          user_id: 2,
          username: "emp2",
          stnm: "ASSAM",
          stcd: "AS",
          untnm: "SILCHAR",
          untcd: "SIL",
          usrnm: "Jane Smith",
        },
        {
          user_id: 3,
          username: "emp3",
          stnm: "BIHAR",
          stcd: "BR",
          untnm: "PATNA",
          untcd: "PAT",
          usrnm: "Bob Wilson",
        },
      ];
      setUsers(mockUsers);
      buildLocationTree(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const buildLocationTree = (users: User[]) => {
    const userType = localStorage.getItem("userType") || "ADMIN";
    let allowedLocationsArray: string[] = [];
    try {
      allowedLocationsArray = JSON.parse(
        localStorage.getItem("allowedLocations") || "[]",
      );
      if (!Array.isArray(allowedLocationsArray)) allowedLocationsArray = [];
    } catch {
      allowedLocationsArray = [];
    }

    const isLocationAllowed = (locationName: string): boolean => {
      if (userType === "ADMIN") return true;
      if (allowedLocationsArray.length === 0) return false;
      return allowedLocationsArray.some(
        (loc) => loc.toLowerCase() === locationName.toLowerCase().slice(0, 3),
      );
    };

    const stateMap = new Map<string, LocationNode>();
    users.forEach((user) => {
      if (!user.stnm || !user.untnm) return;
      if (userType !== "ADMIN") {
        const allowed =
          isLocationAllowed(user.usrnm) ||
          isLocationAllowed(user.username) ||
          isLocationAllowed(user.untnm) ||
          isLocationAllowed(user.stnm);
        if (!allowed) return;
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
        });
      }
      const state = stateMap.get(user.stnm)!;
      let depot = state.children?.find((d) => d.name === user.untnm);
      if (!depot) {
        depot = {
          name: user.untnm,
          code: user.untcd,
          type: "depot",
          children: [],
          isSelected: false,
          isIndeterminate: false,
          isExpanded: false,
        };
        state.children?.push(depot);
      }
      depot.children?.push({
        name: user.usrnm,
        code: user.username,
        type: "user",
        userId: user.user_id,
        isSelected: false,
        isIndeterminate: false,
        isExpanded: false,
      });
    });

    const tree = Array.from(stateMap.values())
      .filter((s) => s.children && s.children.length > 0)
      .map((s) => ({
        ...s,
        children: s.children?.filter(
          (d) => d.children && d.children.length > 0,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setLocationTree(tree);
  };

  const toggleExpand = (path: number[]) => {
    setLocationTree((prev) => {
      const newTree = [...prev];
      let current: LocationNode[] = newTree;
      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1)
          current[path[i]].isExpanded = !current[path[i]].isExpanded;
        else current = current[path[i]].children!;
      }
      return newTree;
    });
  };

  const toggleSelection = (path: number[]) => {
    setLocationTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev));
      const toggleNode = (
        nodes: LocationNode[],
        currentPath: number[],
        depth: number,
      ) => {
        if (depth === currentPath.length) return;
        const node = nodes[currentPath[depth]];
        if (depth === currentPath.length - 1) {
          node.isSelected = !node.isSelected;
          node.isIndeterminate = false;
          const updateChildren = (n: LocationNode, selected: boolean) => {
            n.isSelected = selected;
            n.isIndeterminate = false;
            if (n.children)
              n.children.forEach((c) => updateChildren(c, selected));
          };
          if (node.children)
            node.children.forEach((c) => updateChildren(c, node.isSelected));
        } else {
          toggleNode(node.children!, currentPath, depth + 1);
        }
        if (node.children) {
          const sel = node.children.filter((c) => c.isSelected).length;
          const ind = node.children.filter((c) => c.isIndeterminate).length;
          if (sel === 0 && ind === 0) {
            node.isSelected = false;
            node.isIndeterminate = false;
          } else if (sel === node.children.length) {
            node.isSelected = true;
            node.isIndeterminate = false;
          } else {
            node.isSelected = false;
            node.isIndeterminate = true;
          }
        }
      };
      toggleNode(newTree, path, 0);
      return newTree;
    });
  };

  const getSelectedItems = () => {
    const states: string[] = [],
      depots: string[] = [],
      employees: string[] = [];
    const traverse = (nodes: LocationNode[]) => {
      nodes.forEach((node) => {
        if (node.isSelected) {
          if (node.type === "state") states.push(node.name);
          else if (node.type === "depot") depots.push(node.name);
          else if (node.type === "user")
            employees.push(node.userId!.toString());
        }
        if (node.children) traverse(node.children);
      });
    };
    traverse(locationTree);
    return { states, depots, employees };
  };

  useEffect(() => {
    const { states, depots, employees } = getSelectedItems();
    if (states.length > 0 || depots.length > 0 || employees.length > 0)
      fetchOrders(states, depots, employees);
    else setOrders([]);
  }, [locationTree, fromDate, toDate, orderFilter]);

  const fetchOrders = async (
    states: string[],
    depots: string[],
    employees: string[],
  ) => {
    setOrdersLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (states.length > 0) params.set("states", states.join(","));
      if (depots.length > 0) params.set("depots", depots.join(","));
      if (employees.length > 0) params.set("employees", employees.join(","));
      params.set("from", fromDate);
      params.set("to", toDate);
      params.set("user", localStorage.getItem("username") || "");
      params.set("filter", orderFilter);
      params.set("admin", adminType as string);
      const response = await fetch(
        `${API_BASE_URL}/orders/by-location?${params.toString()}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result: ApiResponse<Order[]> = await response.json();
      if (result.success && result.data) setOrders(result.data);
      else {
        setOrders([]);
        throw new Error(result.message || "Failed to fetch orders");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch orders",
      );
      setOrders([
        {
          order_id: "1",
          partyId: "P001",
          partyName: "ABC Company",
          empId: "emp1",
          empName: "emp1",
          totalAmount: 15000,
          discountAmount: 500,
          discountAmountBulk: 300,
          paymentMode: "cash",
          status: "completed",
          createdAt: "2025-05-30T10:30:00Z",
          outstanding: 200,
          consumerRate: 100,
          bulkRate: 80,
          collection: { amount: 200, paymentMethod: "Cash" },
          derivedStatus: "UNVERIFIED",
          secFreight: 100,
          vehno: "kuch bhi",
          sicd: "",
          orderItems: [
            {
              id: "1",
              itemCode: "IT001",
              itemName: "Product A",
              quantity: 10,
              rate: 1500,
              amount: 15000,
              packType: "Consumer Pack",
            },
          ],
        },
      ]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const calculateQuantities = (orderItems: OrderItem[] | null | undefined) => {
    if (!orderItems || !Array.isArray(orderItems))
      return { totalQuantity: 0, bulkQuantity: 0, consumerQuantity: 0 };
    let consumerQuantity = 0,
      bulkQuantity = 0,
      totalQuantity = 0;
    orderItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      totalQuantity += qty;
      if (item.packType === "Consumer Pack") consumerQuantity += qty;
      else if (item.packType === "Bulk Pack") bulkQuantity += qty;
    });
    return { consumerQuantity, bulkQuantity, totalQuantity };
  };

  const handleSelectAllLocations = () => {
    setLocationTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev));
      const allSelected = isAllLocationsSelected(newTree);
      const toggleAllNodes = (nodes: LocationNode[], selected: boolean) => {
        nodes.forEach((node) => {
          node.isSelected = selected;
          node.isIndeterminate = false;
          if (node.children) toggleAllNodes(node.children, selected);
        });
      };
      toggleAllNodes(newTree, !allSelected);
      return newTree;
    });
  };

  const isAllLocationsSelected = (tree: LocationNode[]): boolean =>
    tree.every(
      (node) =>
        node.isSelected &&
        (!node.children || isAllLocationsSelected(node.children)),
    );

  const isAnyLocationSelected = (tree: LocationNode[]): boolean =>
    tree.some(
      (node) =>
        node.isSelected ||
        node.isIndeterminate ||
        (node.children ? isAnyLocationSelected(node.children) : false),
    );

  // ── Build the formatted order payload (shared by accept + reject) ──────────
  // This is the single source of truth for what gets sent to the backend.
  // It includes both the discount values (to be saved on Order) and the
  // post-discount rates (to be saved on AcceptedOrders / RejectedOrders).
  const buildFormatOrders = useCallback(() => {
    return table.getSelectedRowModel().rows.map((row) => {
      const order = row.original;

      // Discount the admin entered (falls back to what the order already has)
      const discConsumer =
        editedValuesRef.current[order.order_id]?.discountConsumer ??
        Number(order.discountAmount ?? 0);
      const discBulk =
        editedValuesRef.current[order.order_id]?.discountBulk ??
        Number(order.discountAmountBulk ?? 0);

      // Post-discount rates saved to AcceptedOrders / RejectedOrders
      const finalConsumerRate = Math.max(
        0,
        Number(order.consumerRate ?? 0) - discConsumer,
      );
      const finalBulkRate = Math.max(
        0,
        Number(order.bulkRate ?? 0) - discBulk,
      );

      return {
        id: order.order_id,
        // ── Saved to Order.discountAmount / discountAmountBulk ──
        discountConsumer: discConsumer,
        discountBulk: discBulk,
        // ── Saved to AcceptedOrders.consumerRate / bulkRate ─────
        consumerRate: finalConsumerRate,
        bulkRate: finalBulkRate,
        // ── Other fields ────────────────────────────────────────
        remarks: editedValuesRef.current[order.order_id]?.remarks ?? "",
        vehno: globalVehno,
        secfreight: globalSecfreight === "" ? 0 : Number(globalSecfreight),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalVehno, globalSecfreight]);

  // ── Accept / Reject ─────────────────────────────────────────────────────────
  const handleAcceptOrders = async (userType: string) => {
    if (actionLoading) return;
    let status = "";
    if (userType === "ADMIN" || userType === "HEAD-OFFICE") status = "ACCEPT";
    else if (userType === "DEPOT-INCHARGE") status = "PARK";
    else return toast.info("Not a valid User Type");

    const formatOrders = buildFormatOrders();

    setActionLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/orders/accept`, {
        orders: formatOrders,
        adminName: localStorage.getItem("username"),
        status,
      });
      if (response.status === 200) {
        formatOrders.forEach((item) =>
          setOrders((prev) => prev.filter((o) => item.id !== o.order_id)),
        );
        setRowSelection({});
        toast.success(
          status === "ACCEPT" ? "Orders accepted" : "Orders parked",
        );
      }
    } catch {
      toast.error("Error accepting / parking orders");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrders = async () => {
    if (actionLoading) return;
    const formatOrders = buildFormatOrders();

    setActionLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/orders/reject`, {
        orders: formatOrders,
        adminName: localStorage.getItem("username"),
      });
      if (response.status === 200) {
        formatOrders.forEach((item) =>
          setOrders((prev) => prev.filter((o) => item.id !== o.order_id)),
        );
        setRowSelection({});
        toast.success("Orders rejected");
      }
    } catch {
      toast.error("Error rejecting orders");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="w-3.5 h-3.5 rounded cursor-pointer accent-[#5b6af0]"
          />
        ),
        cell: ({ row }) => {
          const isAccepted = row.original.derivedStatus === "ACCEPT";
          return (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              disabled={isAccepted}
              onChange={row.getToggleSelectedHandler()}
              className="w-3.5 h-3.5 rounded cursor-pointer accent-[#5b6af0] disabled:opacity-30 disabled:cursor-not-allowed"
              title={isAccepted ? "Order already accepted" : undefined}
            />
          );
        },
        size: 36,
      },
      {
        id: "expander",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-[#f4f5fa]"
            style={{ color: "#b0b2c0" }}
          >
            {row.getIsExpanded() ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>
        ),
        size: 36,
      },
      {
        accessorKey: "empName",
        header: "Employee",
        cell: (info) => (
          <span
            style={{
              fontSize: 12,
              color: "#4a4c6a",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "partyName",
        header: "Party",
        cell: ({ row }) => (
          <div>
            <p
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "#1a1a2e",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {row.original.partyName}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#b0b2c0",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {row.original.partyId}
            </p>
          </div>
        ),
        minSize: 200,
      },
      {
        id: "derivedStatus",
        accessorKey: "derivedStatus",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.derivedStatus ?? "UNVERIFIED"} />
        ),
      },
      {
        id: "vehno",
        header: "Vehicle No",
        cell: ({ row }) => {
          const isAccepted = row.original.derivedStatus === "ACCEPT";
          if (!isAccepted) {
            return (
              <span
                style={{
                  fontSize: 12,
                  color: "#c4c6d2",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                N/A
              </span>
            );
          }
          const vehno = row.original.vehno;
          return (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#1a1a2e",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {vehno && vehno.trim() !== "" ? vehno : "—"}
            </span>
          );
        },
      },
      {
        id: "secfreight",
        header: "Sec. Freight",
        cell: ({ row }) => {
          const isAccepted = row.original.derivedStatus === "ACCEPT";
          if (!isAccepted) {
            return (
              <span
                style={{
                  fontSize: 12,
                  color: "#c4c6d2",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                N/A
              </span>
            );
          }
          return (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#1a1a2e",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {Number(row.original.secFreight ?? 0).toLocaleString("en-IN")}
            </span>
          );
        },
      },
      {
        id: "voucherNo",
        header: "Voucher No",
        cell: ({ row }) => {
          const isAccepted = row.original.derivedStatus === "ACCEPT";
          const sicd = row.original.sicd;
          if (!isAccepted) {
            return (
              <span
                style={{
                  fontSize: 12,
                  color: "#c4c6d2",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                —
              </span>
            );
          }
          return (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#1a1a2e",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {sicd && sicd.trim() !== "" ? sicd : "N/A"}
            </span>
          );
        },
      },
      {
        accessorKey: "outstanding",
        header: "Outstanding",
        cell: (info) => (
          <span
            style={{
              fontSize: 12.5,
              color: "#1a1a2e",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {info.getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: "collection",
        header: "Collection",
        cell: ({ row }) => (
          <div>
            <p
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "#1a1a2e",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {row.original.collection.amount}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#b0b2c0",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {row.original.collection.paymentMethod}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer select-none"
            onClick={column.getToggleSortingHandler()}
          >
            <span>Date</span>
            {column.getIsSorted() &&
              (column.getIsSorted() === "asc" ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              ))}
          </div>
        ),
        cell: (info) => (
          <span
            style={{
              fontSize: 12,
              color: "#9496b0",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {new Date(info.getValue() as string).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </span>
        ),
      },
      {
        id: "bulkQuantity",
        header: "Bulk Qty",
        cell: ({ row }) => {
          const { bulkQuantity } = calculateQuantities(row.original.orderItems);
          return (
            <EditableNumericCell
              initialValue={bulkQuantity}
              orderId={row.original.order_id}
              field="bulkQuantity"
              onChange={handleEditChange}
            />
          );
        },
      },
      {
        id: "consumerQuantity",
        header: "Consumer Qty",
        cell: ({ row }) => {
          const { consumerQuantity } = calculateQuantities(
            row.original.orderItems,
          );
          return (
            <EditableNumericCell
              initialValue={consumerQuantity}
              orderId={row.original.order_id}
              field="consumerQuantity"
              onChange={handleEditChange}
            />
          );
        },
      },
      {
        id: "totalQuantity",
        header: "Total Qty",
        accessorFn: (row) => calculateQuantities(row.orderItems).totalQuantity,
        cell: ({ getValue }) => (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "#1a1a2e",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {getValue() as number}
          </span>
        ),
        aggregationFn: "sum",
        aggregatedCell: ({ getValue }) => (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#5b6af0",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {Math.round(getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: "consumerRate",
        header: "Consumer Rate",
        cell: ({ row }) => (
          <FrozenRateCell
            value={Number(row.original.consumerRate ?? 0)}
            type="consumer"
          />
        ),
      },
      {
        accessorKey: "bulkRate",
        header: "Bulk Rate",
        cell: ({ row }) => (
          <FrozenRateCell
            value={Number(row.original.bulkRate ?? 0)}
            type="bulk"
          />
        ),
      },
      {
        id: "discountConsumer",
        header: "Discount (C)",
        cell: ({ row }) => (
          <EditableDiscountCell
            orderId={row.original.order_id}
            field="discountConsumer"
            fallbackValue={Number(row.original.discountAmount ?? 0)}
            editedValuesRef={editedValuesRef}
            onChange={handleEditChange}
            type="consumer"
          />
        ),
      },
      {
        id: "discountBulk",
        header: "Discount (B)",
        cell: ({ row }) => (
          <EditableDiscountCell
            orderId={row.original.order_id}
            field="discountBulk"
            fallbackValue={Number(row.original.discountAmountBulk ?? 0)}
            editedValuesRef={editedValuesRef}
            onChange={handleEditChange}
            type="bulk"
          />
        ),
      },
      {
        id: "afterDiscountConsumer",
        header: "After Disc (C)",
        cell: ({ row }) => (
          <AfterDiscountLiveCell
            orderId={row.original.order_id}
            baseRate={Number(row.original.consumerRate ?? 0)}
            field="discountConsumer"
            fallbackDiscount={Number(row.original.discountAmount ?? 0)}
            editedValuesRef={editedValuesRef}
            type="consumer"
          />
        ),
      },
      {
        id: "afterDiscountBulk",
        header: "After Disc (B)",
        cell: ({ row }) => (
          <AfterDiscountLiveCell
            orderId={row.original.order_id}
            baseRate={Number(row.original.bulkRate ?? 0)}
            field="discountBulk"
            fallbackDiscount={Number(row.original.discountAmountBulk ?? 0)}
            editedValuesRef={editedValuesRef}
            type="bulk"
          />
        ),
      },
      {
        accessorKey: "totalAmount",
        accessorFn: (row) => Number(row.totalAmount),
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer select-none"
            onClick={column.getToggleSortingHandler()}
          >
            <span>Total</span>
            {column.getIsSorted() &&
              (column.getIsSorted() === "asc" ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              ))}
          </div>
        ),
        cell: ({ getValue }) => (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "#1a1a2e",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ₹{Number(getValue())}
          </span>
        ),
        aggregationFn: "sum",
        aggregatedCell: ({ getValue }) => (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#5b6af0",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ₹{Math.round(getValue() as number).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        accessorKey: "paymentMode",
        header: "Payment",
        cell: (info) => {
          const v = info.getValue() as string;
          const styles: Record<string, string> = {
            cash: "bg-green-50 text-green-600 border-green-200",
            credit: "bg-blue-50 text-blue-600 border-blue-200",
          };
          return (
            <span
              className={`text-xs px-2 py-0.5 rounded-md border font-medium ${styles[v] || "bg-gray-50 text-gray-500 border-gray-200"}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {v}
            </span>
          );
        },
      },
      {
        accessorKey: "remarks",
        header: "Remarks",
        cell: ({ row }) => {
          const isAccepted = row.original.derivedStatus === "ACCEPT";
          return (
            <EditableRemarksCell
              orderId={row.original.order_id}
              onChange={handleEditChange}
              initialValue={row.original.remarks ?? ""}
              isDisabled={isAccepted}
            />
          );
        },
      },
    ],
    [handleEditChange],
  );

  const table = useReactTable({
    data: orders ?? [],
    columns,
    state: { globalFilter, rowSelection, grouping, expanded },
    enableRowSelection: (row) => row.original.derivedStatus !== "ACCEPT",
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
  });

  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    let consTotal = 0,
      bulkTotal = 0;
    selectedRows.forEach((row) => {
      const { consumerQuantity, bulkQuantity } = calculateQuantities(
        row.original.orderItems,
      );
      consTotal += consumerQuantity;
      bulkTotal += bulkQuantity;
    });
    setTotalConsumerQuantity(consTotal);
    setTotalBulkQuantity(bulkTotal);
  }, [rowSelection, orders]);

  const selectedOrders = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);

  const csvData = (data: Order[]) => [
    [
      "Employee",
      "Party Name",
      "Date",
      "Status",
      "Voucher No",
      "Vehicle No",
      "Sec. Freight",
      "Consumer Rate",
      "Bulk Rate",
      "Total Quantity",
      "Discount (Consumer)",
      "Discount (Bulk)",
      "After Discount (Consumer)",
      "After Discount (Bulk)",
      "Total Amount",
      "Payment",
    ],
    ...data.map((item) => {
      const { totalQuantity } = calculateQuantities(item.orderItems);
      const isAccepted = item.derivedStatus === "ACCEPT";
      const discConsumer =
        editedValues[item.order_id]?.discountConsumer ??
        Number(item.discountAmount ?? 0);
      const discBulk =
        editedValues[item.order_id]?.discountBulk ??
        Number(item.discountAmountBulk ?? 0);
      const afterDiscConsumer = Math.max(
        0,
        Number(item.consumerRate ?? 0) - discConsumer,
      );
      const afterDiscBulk = Math.max(
        0,
        Number(item.bulkRate ?? 0) - discBulk,
      );
      return [
        item.empName,
        item.partyName,
        new Date(item.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
        item.derivedStatus ?? "UNVERIFIED",
        isAccepted ? item.sicd || "N/A" : "—",
        isAccepted ? item.vehno || "—" : "N/A",
        isAccepted ? item.secFreight : "N/A",
        item.consumerRate,
        item.bulkRate,
        totalQuantity,
        discConsumer,
        discBulk,
        afterDiscConsumer,
        afterDiscBulk,
        item.totalAmount,
        item.paymentMode,
      ];
    }),
  ];

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif", background: "#f2f3f7" }}
    >
      {/* ── Location Sidebar ── */}
      <motion.div
        initial={{ width: "17rem" }}
        animate={{ width: isFilterOpen ? "17rem" : "0rem" }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          borderRight: isFilterOpen ? "0.5px solid #e8e9ef" : "none",
          background: "#fff",
        }}
      >
        <div className="flex-1 overflow-y-auto" style={{ minWidth: "17rem" }}>
          {/* Sidebar header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
            style={{ borderBottom: "0.5px solid #e8e9ef" }}
          >
            <div className="flex items-center gap-2">
              <MapPin size={14} style={{ color: "#5b6af0" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1a1a2e" }}>
                Filter by Location
              </span>
            </div>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#f4f5fa] transition-colors"
              style={{ color: "#b0b2c0" }}
            >
              <PanelLeftClose size={13} />
            </button>
          </div>

          <div className="p-3 flex flex-col gap-3">
            {/* Date range */}
            <div className="flex flex-col gap-2">
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "#b0b2c0",
                  fontWeight: 500,
                }}
              >
                Date Range
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "From",
                    value: fromDate,
                    onChange: (v: string) => {
                      setFromDate(v);
                      setRowSelection({});
                    },
                  },
                  { label: "To", value: toDate, onChange: setToDate },
                ].map(({ label, value, onChange }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span style={{ fontSize: 10, color: "#c4c6d2" }}>
                      {label}
                    </span>
                    <input
                      type="date"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="h-8 rounded-lg border px-2 text-xs focus:outline-none transition-all"
                      style={{
                        borderColor: "#e8e9ef",
                        color: value ? "#1a1a2e" : "#b0b2c0",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Select all */}
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: "#f4f5fa" }}
            >
              <input
                type="checkbox"
                checked={isAllLocationsSelected(locationTree)}
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      !isAllLocationsSelected(locationTree) &&
                      isAnyLocationSelected(locationTree);
                }}
                onChange={handleSelectAllLocations}
                className="w-3.5 h-3.5 rounded cursor-pointer accent-[#5b6af0]"
              />
              <span style={{ fontSize: 12, color: "#4a4c6a", fontWeight: 500 }}>
                Select all
              </span>
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{
                  background: "#fff5f5",
                  border: "0.5px solid #fecaca",
                  color: "#dc2626",
                }}
              >
                {error} — using demo data
              </div>
            )}

            {/* Tree */}
            {loading ? (
              <div className="flex justify-center py-6">
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: "#e8e9ef", borderTopColor: "#5b6af0" }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {locationTree.map((state, i) => (
                  <TreeNode
                    key={`${state.name}-${i}`}
                    node={state}
                    path={[i]}
                    depth={0}
                    onToggleExpand={toggleExpand}
                    onToggleSelection={toggleSelection}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Orders panel ── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden p-4 gap-3">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-3 flex-shrink-0"
        >
          {!isFilterOpen && (
            <button
              onClick={() => setIsFilterOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-white transition-colors"
              style={{
                borderColor: "#e8e9ef",
                color: "#6b6d85",
                background: "#fff",
              }}
            >
              <PanelLeftOpen size={13} />
            </button>
          )}
          <div className="flex-1">
            <h1
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "#1a1a2e",
                letterSpacing: "-0.02em",
              }}
            >
              Orders
            </h1>
            <p style={{ fontSize: 12, color: "#b0b2c0", marginTop: 1 }}>
              Manage and process incoming orders
            </p>
          </div>

          {orders.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all hover:opacity-85"
                style={{
                  background: "#f4f5fa",
                  color: "#6b6d85",
                  border: "0.5px solid #e8e9ef",
                }}
              >
                <Download size={12} />
                <CSVLink
                  data={csvData(orders)}
                  filename="all-orders.csv"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  All orders
                </CSVLink>
              </button>
              {selectedOrders.length > 0 && (
                <button
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all hover:opacity-85"
                  style={{
                    background: "#eef0fd",
                    color: "#5b6af0",
                    border: "0.5px solid #c7cdf7",
                  }}
                >
                  <Download size={12} />
                  <CSVLink
                    data={csvData(selectedOrders)}
                    filename="selected-orders.csv"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    Selected ({selectedOrders.length})
                  </CSVLink>
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#b0b2c0" }}
            />
            <input
              type="text"
              placeholder="Search by party, employee…"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg border bg-white text-sm focus:outline-none transition-all"
              style={{
                borderColor: "#e8e9ef",
                color: "#1a1a2e",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: "#9496b0" }}>Status</span>
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger
                className="h-9 rounded-lg border text-xs w-32"
                style={{
                  borderColor: "#e8e9ef",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                }}
              >
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  {(adminType === "DEPOT-INCHARGE" ||
                    adminType === "ADMIN") && (
                    <SelectItem value="park">Parked</SelectItem>
                  )}
                  <SelectItem value="accept">Accepted</SelectItem>
                  <SelectItem value="reject">Rejected</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers size={12} style={{ color: "#b0b2c0" }} />
            <span style={{ fontSize: 11, color: "#9496b0" }}>Group</span>
            {[
              { key: "empName", label: "Employee" },
              { key: "paymentMode", label: "Payment" },
              { key: "derivedStatus", label: "Status" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() =>
                  setGrouping((prev) =>
                    prev.includes(key)
                      ? prev.filter((p) => p !== key)
                      : [...prev, key],
                  )
                }
                className="h-7 px-2.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: grouping.includes(key) ? "#5b6af0" : "#f4f5fa",
                  color: grouping.includes(key) ? "#fff" : "#6b6d85",
                  border: "0.5px solid",
                  borderColor: grouping.includes(key) ? "#5b6af0" : "#e8e9ef",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {label}
              </button>
            ))}
            {grouping.length > 0 && (
              <button
                onClick={() => setGrouping([])}
                className="h-7 px-2 rounded-md text-xs transition-all hover:opacity-80"
                style={{
                  background: "#fff0f0",
                  color: "#ef4444",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {ordersLoading ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl bg-white"
              style={{ border: "0.5px solid #e8e9ef" }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "#e8e9ef", borderTopColor: "#5b6af0" }}
              />
              <span style={{ fontSize: 12, color: "#b0b2c0" }}>
                Loading orders…
              </span>
            </div>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl bg-white"
              style={{ border: "0.5px solid #e8e9ef" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#f4f5fa" }}
              >
                <Users size={16} style={{ color: "#b0b2c0" }} />
              </div>
              <p style={{ fontSize: 13, color: "#6b6d85", fontWeight: 500 }}>
                No orders found
              </p>
              <p style={{ fontSize: 12, color: "#b0b2c0" }}>
                Select locations from the panel to view orders
              </p>
            </div>
          ) : (
            <>
              <div
                className="flex-1 min-h-0 rounded-xl overflow-hidden"
                style={{ border: "0.5px solid #e8e9ef", background: "#fff" }}
              >
                <div className="h-full overflow-auto">
                  <table className="w-full" style={{ minWidth: 1400 }}>
                    <thead
                      className="sticky top-0 z-10"
                      style={{
                        background: "#fafafa",
                        borderBottom: "0.5px solid #f0f1f6",
                      }}
                    >
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((h) => (
                            <th
                              key={h.id}
                              className="text-left px-3 py-2.5"
                              style={{
                                fontSize: 10,
                                color: "#b0b2c0",
                                fontWeight: 500,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                fontFamily: "'DM Sans', sans-serif",
                                width: h.getSize(),
                              }}
                            >
                              {h.isPlaceholder
                                ? null
                                : flexRender(
                                    h.column.columnDef.header,
                                    h.getContext(),
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row, ri) => (
                        <React.Fragment key={row.id}>
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: 0.12,
                              delay: Math.min(ri * 0.01, 0.2),
                            }}
                            className="hover:bg-[#fafafa] transition-colors duration-100"
                            style={{ borderBottom: "0.5px solid #f4f5fa" }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-3 py-3"
                                style={{
                                  paddingLeft: cell.getIsGrouped()
                                    ? `${row.depth * 16 + 12}px`
                                    : undefined,
                                }}
                              >
                                {cell.getIsGrouped() ? (
                                  <button
                                    onClick={row.getToggleExpandedHandler()}
                                    className="flex items-center gap-1.5"
                                    style={{
                                      color: "#5b6af0",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      fontFamily: "'DM Sans', sans-serif",
                                    }}
                                  >
                                    {row.getIsExpanded() ? (
                                      <ChevronDown size={12} />
                                    ) : (
                                      <ChevronRight size={12} />
                                    )}
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                    <span
                                      style={{
                                        color: "#b0b2c0",
                                        fontWeight: 400,
                                      }}
                                    >
                                      ({row.subRows.length})
                                    </span>
                                  </button>
                                ) : cell.getIsAggregated() ? (
                                  flexRender(
                                    cell.column.columnDef.aggregatedCell ??
                                      cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )
                                ) : cell.getIsPlaceholder() ? null : (
                                  flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )
                                )}
                              </td>
                            ))}
                          </motion.tr>

                          {row.getIsExpanded() && !row.getIsGrouped() && (
                            <tr>
                              <td
                                colSpan={columns.length}
                                style={{
                                  background: "#fafafa",
                                  padding: "12px 16px",
                                  borderBottom: "0.5px solid #f0f1f6",
                                }}
                              >
                                <div
                                  className="rounded-xl overflow-hidden"
                                  style={{ border: "0.5px solid #e8e9ef" }}
                                >
                                  <div
                                    className="px-4 py-2.5 flex items-center gap-2"
                                    style={{
                                      background: "#f4f5fa",
                                      borderBottom: "0.5px solid #e8e9ef",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: "#6b6d85",
                                        letterSpacing: "0.05em",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      Order items
                                    </span>
                                    <span
                                      className="px-1.5 py-0.5 rounded-md text-xs"
                                      style={{
                                        background: "#eef0fd",
                                        color: "#5b6af0",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {row.original.orderItems.length}
                                    </span>
                                  </div>
                                  <table
                                    className="w-full"
                                    style={{ background: "#fff" }}
                                  >
                                    <thead>
                                      <tr
                                        style={{
                                          borderBottom: "0.5px solid #f0f1f6",
                                        }}
                                      >
                                        {[
                                          "Item Code",
                                          "Item Name",
                                          "Pack Type",
                                          "Qty",
                                          "Rate",
                                          "Amount",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            className="text-left px-4 py-2"
                                            style={{
                                              fontSize: 10,
                                              color: "#b0b2c0",
                                              fontWeight: 500,
                                              letterSpacing: "0.06em",
                                              textTransform: "uppercase",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.original.orderItems.map((item) => (
                                        <tr
                                          key={item.id}
                                          style={{
                                            borderBottom: "0.5px solid #f4f5fa",
                                          }}
                                        >
                                          <td
                                            className="px-4 py-2.5"
                                            style={{
                                              fontSize: 12,
                                              fontWeight: 500,
                                              color: "#1a1a2e",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {item.itemCode}
                                          </td>
                                          <td
                                            className="px-4 py-2.5"
                                            style={{
                                              fontSize: 12,
                                              color: "#4a4c6a",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {item.itemName}
                                          </td>
                                          <td className="px-4 py-2.5">
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded-md border ${item.packType === "Consumer Pack" ? "bg-blue-50 text-blue-600 border-blue-200" : item.packType === "Bulk Pack" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                                              style={{
                                                fontFamily:
                                                  "'DM Sans', sans-serif",
                                              }}
                                            >
                                              {item.packType}
                                            </span>
                                          </td>
                                          <td
                                            className="px-4 py-2.5 text-center"
                                            style={{
                                              fontSize: 12,
                                              color: "#1a1a2e",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {item.quantity}
                                          </td>
                                          <td
                                            className="px-4 py-2.5 text-right"
                                            style={{
                                              fontSize: 12,
                                              color: "#1a1a2e",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            ₹
                                            {Number(item.rate).toLocaleString(
                                              "en-IN",
                                            )}
                                          </td>
                                          <td
                                            className="px-4 py-2.5 text-right"
                                            style={{
                                              fontSize: 12,
                                              fontWeight: 500,
                                              color: "#1a1a2e",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            ₹
                                            {Number(item.amount).toLocaleString(
                                              "en-IN",
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
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

              {/* Pagination */}
              <div
                className="flex items-center justify-between flex-shrink-0 px-4 py-2.5 rounded-xl"
                style={{ background: "#fff", border: "0.5px solid #e8e9ef" }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "#9496b0",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {table.getRowModel().rows.length} of{" "}
                  {table.getFilteredRowModel().rows.length} orders
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-7 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                    style={{
                      background: "#f4f5fa",
                      color: "#6b6d85",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Previous
                  </button>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#9496b0",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {table.getState().pagination.pageIndex + 1} /{" "}
                    {table.getPageCount()}
                  </span>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-7 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                    style={{
                      background: "#f4f5fa",
                      color: "#6b6d85",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Action bar */}
              <AnimatePresence>
                {selectedOrders.length > 0 && adminType !== "OPERATOR" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-center justify-between flex-shrink-0 px-4 py-3 rounded-xl"
                    style={{
                      background: "#fff",
                      border: "0.5px solid #e8e9ef",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span
                            style={{
                              fontSize: 10,
                              color: "#b0b2c0",
                              fontFamily: "'DM Sans', sans-serif",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                            }}
                          >
                            Vehicle No
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. AS01AB1234"
                            value={globalVehno}
                            onChange={(e) => setGlobalVehno(e.target.value)}
                            className="h-8 w-36 rounded-lg border px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5b6af0] transition-all"
                            style={{
                              borderColor: "#e8e9ef",
                              fontFamily: "'DM Sans', sans-serif",
                              color: "#1a1a2e",
                            }}
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span
                            style={{
                              fontSize: 10,
                              color: "#b0b2c0",
                              fontFamily: "'DM Sans', sans-serif",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                            }}
                          >
                            Sec. Freight
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={globalSecfreight}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "" || /^\d*\.?\d*$/.test(raw))
                                setGlobalSecfreight(raw);
                            }}
                            className="h-8 w-24 rounded-lg border px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5b6af0] transition-all"
                            style={{
                              borderColor: "#e8e9ef",
                              fontFamily: "'DM Sans', sans-serif",
                              color: "#1a1a2e",
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: "#eef0fd",
                          color: "#5b6af0",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {selectedOrders.length} selected
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b6d85",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Consumer qty:{" "}
                        <strong style={{ color: "#1a1a2e" }}>
                          {totalConsumerQuantity}
                        </strong>
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b6d85",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Bulk qty:{" "}
                        <strong style={{ color: "#1a1a2e" }}>
                          {totalBulkQuantity}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptOrders(adminType as string)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium transition-all hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: "#22c55e",
                          color: "#fff",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {actionLoading ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        {adminType === "DEPOT-INCHARGE"
                          ? "Park orders"
                          : "Accept orders"}
                      </button>
                      <button
                        onClick={handleRejectOrders}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium transition-all hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {actionLoading ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <X size={13} />
                        )}
                        Reject
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Orders;