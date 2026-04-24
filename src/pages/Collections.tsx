import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import React from "react";
import { CSVLink } from "react-csv";
import { motion, AnimatePresence } from "motion/react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
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
  Download,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Banknote,
  CreditCard,
  Landmark,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const amountChangeEmitter = new EventTarget();

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

interface Ledger {
  ledcd: string;
  lednm: string;
  buntcd: string;
  untshnm: string;
}

interface Collection {
  collection_id: string;
  partyId: string;
  partyName: string;
  empId: string;
  amount: number;
  paymentMethod: "cash" | "cheque" | "online";
  chequeNumber?: string;
  otp?: string;
  chequeDate?: string;
  bankName?: string;
  upiId?: string;
  transactionId?: string;
  createdAt: string;
  empName: string;
  verified: boolean;
  vchno: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  ledgerId?: string | null;
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

interface EditableAmountCellProps {
  collectionId: string;
  initialAmount: number;
  editedAmountsRef: React.MutableRefObject<Record<string, number>>;
  onChange: (id: string, value: number) => void;
}

const EditableAmountCell = ({
  collectionId,
  initialAmount,
  editedAmountsRef,
  onChange,
}: EditableAmountCellProps) => {
  const getInitial = () => {
    const entry = editedAmountsRef.current[collectionId];
    return entry !== undefined ? entry : initialAmount;
  };

  const [localValue, setLocalValue] = useState(getInitial);

  const prevId = useRef(collectionId);
  useEffect(() => {
    if (prevId.current !== collectionId) {
      setLocalValue(getInitial());
      prevId.current = collectionId;
    }
  }, [collectionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalValue(val);
    onChange(collectionId, val);
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={handleChange}
      className="w-24 h-7 text-right rounded-lg border px-2 text-xs focus:outline-none focus:ring-1"
      style={{
        borderColor: "#e8e9ef",
        fontFamily: "'DM Sans', sans-serif",
        color: "#1a1a2e",
      }}
    />
  );
};

type VerifiedFilter = "all" | "verified" | "unverified";

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
function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState({});
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "cash" | "cheque" | "online"
  >("all");
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("all");
  const [editedAmounts, setEditedAmounts] = useState<Record<string, number>>(
    {},
  );
  const [totalSelectedAmount, setTotalSelectedAmount] = useState<number>(0);
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const editedAmountsRef = useRef<Record<string, number>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [grouping, setGrouping] = useState<string[]>([]);

  const filteredCollections = useMemo(() => {
    if (verifiedFilter === "all") return collections;
    if (verifiedFilter === "verified")
      return collections.filter((c) => c.verified);
    return collections.filter((c) => !c.verified);
  }, [collections, verifiedFilter]);

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
        buildLocationTree(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch users");
      }
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
      if (userType === "OPERATOR") {
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
    if (states.length > 0 || depots.length > 0 || employees.length > 0) {
      fetchCollections(states, depots, employees);
    } else {
      setCollections([]);
    }
  }, [locationTree, paymentFilter, fromDate, toDate]);

  const fetchCollections = async (
    states: string[],
    depots: string[],
    employees: string[],
  ) => {
    setCollectionsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (states.length > 0) params.set("states", states.join(","));
      if (depots.length > 0) params.set("depots", depots.join(","));
      if (employees.length > 0) params.set("employees", employees.join(","));
      if (paymentFilter !== "all") params.set("paymentMethod", paymentFilter);
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);

      const response = await fetch(
        `${API_BASE_URL}/collections/by-location?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result: ApiResponse<{
        collections: Collection[];
        ledgers: Ledger[];
      }> = await response.json();
      if (result.success && result.data) {
        setCollections(result.data.collections);
        setLedgers(result.data.ledgers);
      } else {
        throw new Error(result.message || "Failed to fetch collections");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch collections",
      );
    } finally {
      setCollectionsLoading(false);
    }
  };

  const handleAmountChange = useCallback(
    (collectionId: string, value: number) => {
      setEditedAmounts((prev) => {
        const next = { ...prev, [collectionId]: value };
        editedAmountsRef.current = next;
        return next;
      });
      amountChangeEmitter.dispatchEvent(
        new CustomEvent("change", { detail: collectionId }),
      );
    },
    [],
  );

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

  const handleVerifyCollections = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedCollectionsList = selectedRows.map((row) => ({
      collectionId: row.original.collection_id,
      amount: editedAmounts[row.original.collection_id] ?? row.original.amount,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/collections/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          collections: selectedCollectionsList,
          username: localStorage.getItem("username"),
        }),
      });

      const result = await response.json();

      if (result.statusCode === 422) {
        alert(result.message || "No cash ledger found for this location.");
        return;
      }
      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`,
        );
      }
      if (result.success) {
        setRowSelection({});
        setEditedAmounts((prev) => {
          const newState = { ...prev };
          selectedRows.forEach(
            (row) => delete newState[row.original.collection_id],
          );
          return newState;
        });
        const { states, depots, employees } = getSelectedItems();
        if (states.length > 0 || depots.length > 0 || employees.length > 0) {
          fetchCollections(states, depots, employees);
        }
      } else {
        throw new Error(result.message || "Failed to verify collections");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to verify collections",
      );
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote size={12} style={{ color: "#16a34a" }} />;
      case "cheque":
        return <Landmark size={12} style={{ color: "#2563eb" }} />;
      case "online":
        return <CreditCard size={12} style={{ color: "#7c3aed" }} />;
      default:
        return null;
    }
  };

  const paymentStyles: Record<string, string> = {
    cash: "bg-green-50 text-green-600 border-green-200",
    cheque: "bg-blue-50 text-blue-600 border-blue-200",
    online: "bg-purple-50 text-purple-600 border-purple-200",
  };

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Collection>[]>(
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
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-3.5 h-3.5 rounded cursor-pointer accent-[#5b6af0]"
          />
        ),
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
        minSize: 180,
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
        accessorKey: "paymentMethod",
        header: "Payment",
        cell: ({ row }) => {
          const v = row.original.paymentMethod;
          return (
            <span
              className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border font-medium w-fit ${paymentStyles[v] || "bg-gray-50 text-gray-500 border-gray-200"}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {getPaymentIcon(v)}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </span>
          );
        },
      },
      {
        accessorKey: "otp",
        header: "OTP",
        cell: ({ row }) => (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1a1a2e",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            {row.original.otp || "—"}
          </span>
        ),
        size: 70,
      },
      {
        accessorKey: "verified",
        header: "Status",
        cell: ({ row }) => {
          const { verified, verifiedBy } = row.original;
          return verified ? (
            <div className="flex flex-col gap-0.5">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium w-fit"
                style={{
                  background: "#f0fdf4",
                  color: "#16a34a",
                  borderColor: "#bbf7d0",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <ShieldCheck size={10} /> Verified
              </span>
              {verifiedBy && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#b0b2c0",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {verifiedBy}
                </span>
              )}
            </div>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium w-fit"
              style={{
                background: "#fff5f5",
                color: "#ef4444",
                borderColor: "#fecaca",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <ShieldX size={10} /> Unverified
            </span>
          );
        },
      },
      {
        accessorKey: "vchno",
        header: "Voucher No.",
        cell: ({ row }) => (
          <span
            style={{
              fontSize: 12,
              color: row.original.verified ? "#1a1a2e" : "#b0b2c0",
              fontFamily: "'DM Sans', sans-serif",
              fontStyle: !row.original.verified ? "italic" : "normal",
            }}
          >
            {!row.original.verified ? "Pending" : row.original.vchno || "—"}
          </span>
        ),
      },
      {
        id: "ledger",
        header: "Ledger",
        cell: ({ row }) => {
          const assignedLedger = ledgers.find(
            (l) => l.ledcd === row.original.ledgerId,
          );
          return (
            <span
              style={{
                fontSize: 11.5,
                color: assignedLedger ? "#4a4c6a" : "#b0b2c0",
                fontFamily: "'DM Sans', sans-serif",
                fontStyle: assignedLedger ? "normal" : "italic",
              }}
            >
              {assignedLedger
                ? `${assignedLedger.lednm} (${assignedLedger.untshnm})`
                : row.original.verified
                  ? "—"
                  : "Auto on verify"}
            </span>
          );
        },
        size: 200,
      },
      {
        accessorKey: "amount",
        accessorFn: (row) => Number(row.amount),
        header: ({  }) => {
          return null;
        },
        cell: ({ row }) => (
          <EditableAmountCell
            collectionId={row.original.collection_id}
            initialAmount={Number(row.original.amount)}
            editedAmountsRef={editedAmountsRef}
            onChange={handleAmountChange}
          />
        ),
        aggregationFn: "sum",
        aggregatedCell: ({  }) => {
          return null;
        },
      },
    ],
    [ledgers, handleAmountChange],
  );

  console.log("edited amounts", editedAmounts); 

  const table = useReactTable({
    data: filteredCollections,
    columns,
    state: { globalFilter, rowSelection, grouping, expanded },
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
  });

  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    const total = selectedRows.reduce((sum, row) => {
      const amount =
        editedAmounts[row.original.collection_id] ?? row.original.amount;
      return sum + Number(amount);
    }, 0);
    setTotalSelectedAmount(total);
  }, [rowSelection, collections, editedAmounts]);

  const selectedCollections = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);

  // Disable verify if ANY selected collection is already verified
  const hasVerifiedInSelection = selectedCollections.some((c) => c.verified);

  const csvData = (data: Collection[]) => [
    [
      "Employee",
      "Party Name",
      "Date",
      "Method",
      "Amount",
      "Verified",
      "Ledger",
    ],
    ...data.map((item) => {
      const ledger = ledgers.find((l) => l.ledcd === item.ledgerId);
      return [
        item.empName,
        item.partyName,
        new Date(item.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
        item.paymentMethod,
        item.amount,
        item.verified ? "Yes" : "No",
        ledger ? `${ledger.lednm} (${ledger.untshnm})` : "",
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
                    onChange: (v: string) => setFromDate(v),
                  },
                  {
                    label: "To",
                    value: toDate,
                    onChange: (v: string) => setToDate(v),
                  },
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
                  style={{
                    borderColor: "#e8e9ef",
                    borderTopColor: "#5b6af0",
                  }}
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

      {/* ── Collections panel ── */}
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
              Collections
            </h1>
            <p style={{ fontSize: 12, color: "#b0b2c0", marginTop: 1 }}>
              Manage and verify incoming collections
            </p>
          </div>

          {collections.length > 0 && (
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
                  data={csvData(collections)}
                  filename="all-collections.csv"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  All collections
                </CSVLink>
              </button>
              {selectedCollections.length > 0 && (
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
                    data={csvData(selectedCollections)}
                    filename="selected-collections.csv"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    Selected ({selectedCollections.length})
                  </CSVLink>
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          {/* Search */}
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

          {/* Payment filter */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: "#9496b0" }}>Method</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="h-9 rounded-lg border text-xs px-2 focus:outline-none bg-white"
              style={{
                borderColor: "#e8e9ef",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "#1a1a2e",
              }}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          {/* Verified filter */}
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: "#9496b0" }}>Status</span>
            {(
              [
                { value: "all", label: "All" },
                { value: "verified", label: "Verified" },
                { value: "unverified", label: "Unverified" },
              ] as { value: VerifiedFilter; label: string }[]
            ).map(({ value, label }) => {
              const isActive = verifiedFilter === value;
              const activeColors: Record<
                string,
                { bg: string; color: string; border: string }
              > = {
                all: { bg: "#5b6af0", color: "#fff", border: "#5b6af0" },
                verified: { bg: "#16a34a", color: "#fff", border: "#16a34a" },
                unverified: { bg: "#ef4444", color: "#fff", border: "#ef4444" },
              };
              const style = isActive
                ? activeColors[value]
                : { bg: "#f4f5fa", color: "#6b6d85", border: "#e8e9ef" };
              return (
                <button
                  key={value}
                  onClick={() => setVerifiedFilter(value)}
                  className="h-7 px-2.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: style.bg,
                    color: style.color,
                    border: "0.5px solid",
                    borderColor: style.border,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {label}
                  {value !== "all" && (
                    <span className="ml-1 opacity-75">
                      (
                      {value === "verified"
                        ? collections.filter((c) => c.verified).length
                        : collections.filter((c) => !c.verified).length}
                      )
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Group by */}
          <div className="flex items-center gap-1.5">
            <Layers size={12} style={{ color: "#b0b2c0" }} />
            <span style={{ fontSize: 11, color: "#9496b0" }}>Group</span>
            {[
              { key: "empName", label: "Employee" },
              { key: "paymentMethod", label: "Payment" },
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
          {collectionsLoading ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl bg-white"
              style={{ border: "0.5px solid #e8e9ef" }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "#e8e9ef", borderTopColor: "#5b6af0" }}
              />
              <span style={{ fontSize: 12, color: "#b0b2c0" }}>
                Loading collections…
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
                <Banknote size={16} style={{ color: "#b0b2c0" }} />
              </div>
              <p style={{ fontSize: 13, color: "#6b6d85", fontWeight: 500 }}>
                No collections found
              </p>
              <p style={{ fontSize: 12, color: "#b0b2c0" }}>
                Select locations from the panel to view collections
              </p>
            </div>
          ) : (
            <>
              {/* Table card */}
              <div
                className="flex-1 min-h-0 rounded-xl overflow-hidden"
                style={{ border: "0.5px solid #e8e9ef", background: "#fff" }}
              >
                <div className="h-full overflow-auto">
                  <table className="w-full" style={{ minWidth: 1100 }}>
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

                          {/* Expanded row — collection details */}
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
                                      Collection Details
                                    </span>
                                  </div>
                                  <div
                                    className="grid grid-cols-2 gap-x-8 gap-y-3 p-4"
                                    style={{ background: "#fff" }}
                                  >
                                    {/* Collection ID */}
                                    <div>
                                      <p
                                        style={{
                                          fontSize: 10,
                                          color: "#b0b2c0",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.06em",
                                          fontFamily: "'DM Sans', sans-serif",
                                          marginBottom: 3,
                                        }}
                                      >
                                        Collection ID
                                      </p>
                                      <p
                                        style={{
                                          fontSize: 12,
                                          color: "#4a4c6a",
                                          fontFamily: "'DM Sans', sans-serif",
                                        }}
                                      >
                                        {row.original.collection_id}
                                      </p>
                                    </div>

                                    {/* Verification status */}
                                    <div>
                                      <p
                                        style={{
                                          fontSize: 10,
                                          color: "#b0b2c0",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.06em",
                                          fontFamily: "'DM Sans', sans-serif",
                                          marginBottom: 3,
                                        }}
                                      >
                                        Verification
                                      </p>
                                      <p
                                        style={{
                                          fontSize: 12,
                                          fontFamily: "'DM Sans', sans-serif",
                                          color: row.original.verified
                                            ? "#16a34a"
                                            : "#ef4444",
                                        }}
                                      >
                                        {row.original.verified
                                          ? `✓ Verified by ${row.original.verifiedBy}${row.original.verifiedAt ? " on " + new Date(row.original.verifiedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}`
                                          : "✗ Not verified"}
                                      </p>
                                    </div>

                                    {/* Ledger */}
                                    <div>
                                      <p
                                        style={{
                                          fontSize: 10,
                                          color: "#b0b2c0",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.06em",
                                          fontFamily: "'DM Sans', sans-serif",
                                          marginBottom: 3,
                                        }}
                                      >
                                        Ledger
                                      </p>
                                      <p
                                        style={{
                                          fontSize: 12,
                                          color: "#4a4c6a",
                                          fontFamily: "'DM Sans', sans-serif",
                                          fontStyle: !ledgers.find(
                                            (l) =>
                                              l.ledcd === row.original.ledgerId,
                                          )
                                            ? "italic"
                                            : "normal",
                                        }}
                                      >
                                        {(() => {
                                          const ledger = ledgers.find(
                                            (l) =>
                                              l.ledcd === row.original.ledgerId,
                                          );
                                          return ledger
                                            ? `${ledger.lednm} (${ledger.untshnm})`
                                            : row.original.verified
                                              ? "No ledger assigned"
                                              : "Auto-assigned on verify";
                                        })()}
                                      </p>
                                    </div>

                                    {/* Payment-method-specific fields */}
                                    {row.original.paymentMethod ===
                                      "cheque" && (
                                      <>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: 10,
                                              color: "#b0b2c0",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.06em",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                              marginBottom: 3,
                                            }}
                                          >
                                            Cheque Number
                                          </p>
                                          <p
                                            style={{
                                              fontSize: 12,
                                              color: "#4a4c6a",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {row.original.chequeNumber || "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: 10,
                                              color: "#b0b2c0",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.06em",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                              marginBottom: 3,
                                            }}
                                          >
                                            Cheque Date
                                          </p>
                                          <p
                                            style={{
                                              fontSize: 12,
                                              color: "#4a4c6a",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {row.original.chequeDate || "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: 10,
                                              color: "#b0b2c0",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.06em",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                              marginBottom: 3,
                                            }}
                                          >
                                            Bank Name
                                          </p>
                                          <p
                                            style={{
                                              fontSize: 12,
                                              color: "#4a4c6a",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {row.original.bankName || "—"}
                                          </p>
                                        </div>
                                      </>
                                    )}

                                    {row.original.paymentMethod ===
                                      "online" && (
                                      <>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: 10,
                                              color: "#b0b2c0",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.06em",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                              marginBottom: 3,
                                            }}
                                          >
                                            UPI ID
                                          </p>
                                          <p
                                            style={{
                                              fontSize: 12,
                                              color: "#4a4c6a",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {row.original.upiId || "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: 10,
                                              color: "#b0b2c0",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.06em",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                              marginBottom: 3,
                                            }}
                                          >
                                            Transaction ID
                                          </p>
                                          <p
                                            style={{
                                              fontSize: 12,
                                              color: "#4a4c6a",
                                              fontFamily:
                                                "'DM Sans', sans-serif",
                                            }}
                                          >
                                            {row.original.transactionId || "—"}
                                          </p>
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
                  {table.getFilteredRowModel().rows.length} collections
                  {verifiedFilter !== "all" && (
                    <span style={{ color: "#c4c6d2" }}>
                      {" "}
                      · {verifiedFilter}
                    </span>
                  )}
                </span>
              </div>

              {/* Action bar */}
              <AnimatePresence>
                {selectedCollections.length > 0 && (
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
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: "#eef0fd",
                          color: "#5b6af0",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {selectedCollections.length} selected
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b6d85",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Total:{" "}
                        <strong style={{ color: "#1a1a2e" }}>
                          ₹{totalSelectedAmount.toLocaleString("en-IN")}
                        </strong>
                      </span>
                      {/* Warning shown when verified collections are in the selection */}
                      {hasVerifiedInSelection && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#f59e0b",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          ⚠ Selection includes already-verified collections
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleVerifyCollections}
                      disabled={hasVerifiedInSelection}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: hasVerifiedInSelection
                          ? "#e5e7eb"
                          : "#22c55e",
                        color: hasVerifiedInSelection ? "#9ca3af" : "#fff",
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: hasVerifiedInSelection
                          ? "not-allowed"
                          : "pointer",
                        opacity: 1,
                      }}
                    >
                      <Check size={13} />
                      {hasVerifiedInSelection ? "Can't Verify" : "Verify Now"}
                    </button>
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

export default Collections;
