import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Search,
  Eye,
  Trash2,
  Users,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

// Types
export interface Member {
  id: string;
  profile?: { avatarUrl?: string | null } | null;
  username: string;
  email: string;
  createdAt: string | Date;
}

interface MemberTableProps {
  data?: Member[];
  onDetail?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  onBulkDelete?: (members: Member[]) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

// Constants
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const sampleData: Member[] = [
  {
    id: "u_001",
    profile: { avatarUrl: null },
    username: "kenadams",
    email: "ken99@example.com",
    createdAt: "2024-12-01T09:12:00Z",
  },
  {
    id: "u_002",
    profile: { avatarUrl: null },
    username: "abel",
    email: "abe45@example.com",
    createdAt: "2025-02-12T14:03:00Z",
  },
  {
    id: "u_003",
    profile: { avatarUrl: null },
    username: "monduke",
    email: "monserrat44@example.com",
    createdAt: "2025-05-20T08:30:00Z",
  },
  {
    id: "u_004",
    profile: { avatarUrl: null },
    username: "silas",
    email: "silas22@example.com",
    createdAt: "2025-07-01T12:00:00Z",
  },
  {
    id: "u_005",
    profile: { avatarUrl: null },
    username: "carmella",
    email: "carmella@example.com",
    createdAt: "2025-07-22T17:45:00Z",
  },
];

// Utility functions
const formatDate = (date: string | Date): string => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const getInitials = (username: string): string => {
  return (
    username
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
};

// Components
const MemberAvatar = React.memo(({ member }: { member: Member }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer transition-transform hover:scale-105">
          {member.profile?.avatarUrl ? (
            <AvatarImage
              src={member.profile.avatarUrl}
              alt={`${member.username}'s avatar`}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="text-xs font-medium">
              {getInitials(member.username)}
            </AvatarFallback>
          )}
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p>@{member.username}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));

MemberAvatar.displayName = "MemberAvatar";

// Table columns factory
function createColumns({
  onDetail,
  onDelete,
}: Pick<MemberTableProps, "onDetail" | "onDelete">): ColumnDef<Member>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all members"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.username}`}
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => row.original.id,
    },
    {
      id: "profile",
      header: "รูปโปรไฟล์",
      cell: ({ row }) => (
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>{getInitials(row.original.username)}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      id: "username",
      header: "ชื่อผู้ใช้งาน",
      cell: ({ row }) => row.original.username,
    },
    {
      id: "email",
      header: "อีเมล",
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          เข้าร่วมเมื่อวันที่
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm cursor-help">
                {formatDate(row.getValue("createdAt"))}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{new Date(row.getValue("createdAt")).toISOString()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(rowA.getValue(columnId) as string).getTime();
        const b = new Date(rowB.getValue(columnId) as string).getTime();
        return a - b;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <span className="sr-only">Open menu for {member.username}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>ตัวเลือกเพิ่มเติม</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onDetail && (
                <DropdownMenuItem
                  onClick={() => onDetail(member)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  ดูรายละเอียด
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer focus:text-destructive"
                    onClick={() => onDelete(member)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    ลบ
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// Main component
export function MemberTable({
  data = sampleData,
  onDetail,
  onDelete,
  onBulkDelete,
  loading = false,
  error = null,
  className = "",
}: MemberTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [deleteQueue, setDeleteQueue] = React.useState<Member[]>([]);

  // Memoized columns
  const columns = React.useMemo(
    () =>
      createColumns({
        onDetail,
        onDelete: (member) => setDeleteQueue([member]),
      }),
    [onDetail],
  );

  // Table configuration
  const table = useReactTable({
    data,
    columns,
    // onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      // sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  });

  // Event handlers
  const handleConfirmDelete = React.useCallback(() => {
    if (deleteQueue.length === 1) {
      onDelete?.(deleteQueue[0]);
    } else if (deleteQueue.length > 1) {
      onBulkDelete?.(deleteQueue);
    }
    setDeleteQueue([]);
    setRowSelection({});
  }, [deleteQueue, onDelete, onBulkDelete]);

  const handleBulkDelete = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedMembers = selectedRows.map((row) => row.original);
    setDeleteQueue(selectedMembers);
  }, [table]);

  // Derived state
  const selectedCount = table.getSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const hasSelection = selectedCount > 0;
  const isAllSelected = table.getIsAllPageRowsSelected();

  // Error state
  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสมาชิก"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 w-80"
              disabled={loading}
            />
          </div>
        </div>

        {/* Bulk actions */}
        {hasSelection && (onDelete || onBulkDelete) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              เลือกแล้ว {selectedCount} รายการ
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              ลบรายการที่เลือก
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  // className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No members found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">แถวต่อหน้า</p>
          <select
            className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              เลือกแล้ว {selectedCount} จาก {totalCount} แถว
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              หน้า {table.getState().pagination.pageIndex + 1} จาก{" "}
              {table.getPageCount()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage() || loading}
            >
              หน้าแรก
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || loading}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || loading}
            >
              ถัดไป
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage() || loading}
            >
              หน้าสุดท้าย
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteQueue.length > 0}
        onOpenChange={(open) => !open && setDeleteQueue([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteQueue.length === 1 ? "Delete Member" : "Delete Members"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action cannot be undone.</p>
              {deleteQueue.length === 1 ? (
                <p>
                  Member <strong>@{deleteQueue[0]?.username}</strong> will be
                  permanently removed.
                </p>
              ) : (
                <p>
                  <strong>{deleteQueue.length} members</strong> will be
                  permanently removed.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteQueue.length === 1 ? "Delete Member" : "Delete Members"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
