'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Search, Download, Filter, Trash2, AlertCircle, X, Settings2 } from 'lucide-react';
import { getDomainColors } from '@/lib/domainColors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
/**
 * @param {Object} props
 * @param {any[]} props.data
 * @param {any[]} props.columns
 * @param {boolean} [props.searchable]
 * @param {boolean} [props.exportable]
 * @param {Function} [props.onExport]
 * @param {Function} [props.onBulkDelete]
 * @param {string} [props.category]
 */
export function DataTable({
  data,
  columns: userColumns,
  searchable = true,
  exportable = false,
  onExport,
  onBulkDelete,
  category = 'retail-shop',
  emptyComponent,
}) {
  const colors = getDomainColors(category);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  // Add Selection Column + Domain Intelligent Columns
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] border-gray-400 bg-white"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] border-gray-400 bg-white"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    ...userColumns,
  ], [userColumns]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  return (
    <div className="w-full relative">
      {/* Selection Action Bar (Floating Premium Bar) */}
      {hasSelection && (
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(100vw-1.5rem,28rem)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300 lg:bottom-8">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700 backdrop-blur-md bg-opacity-95">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold">
                {selectedRows.length}
              </span>
              <span className="text-sm font-bold tracking-tight uppercase">Selected</span>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={() => {
                  if (onBulkDelete) {
                    const items = selectedRows.map(r => r.original);
                    onBulkDelete(items);
                    table.resetRowSelection();
                  }
                }}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-400 hover:text-red-300 transition-all hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Bulk Delete
              </button>

              <button
                onClick={() => {
                  if (onExport) {
                    onExport(selectedRows.map(r => r.original));
                  }
                }}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" />
                Export {selectedRows.length} items
              </button>

              <button
                onClick={() => table.resetRowSelection()}
                className="p-1.5 hover:bg-slate-800 rounded-full transition-colors group"
              >
                <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        {/* Search and Export Bar */}
        <div className="flex items-center justify-between mb-4 gap-4">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all"
                style={/** @type {React.CSSProperties} */ ({
                  '--tw-ring-color': `${colors.primary}30`,
                  borderColor: globalFilter ? colors.primary : '#D1D5DB'
                })}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = globalFilter ? colors.primary : '#D1D5DB'}
              />
            </div>
          )}
          {exportable && onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px] max-h-[300px] overflow-y-auto">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  // Check if it's a domain column (custom header string) or standard
                  let header = column.columnDef.header;
                  if (typeof header === 'function') {
                    // Try to extract text from React Element or just fallback to ID
                    header = column.id;
                  }

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {header}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table - with Sticky Header */}
        <div className="border border-gray-200 rounded-lg relative max-h-[600px] overflow-auto custom-scrollbar group/table">
          <table className="min-w-full table-auto relative bg-white border-separate border-spacing-0">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 transition-colors border-b-2 border-transparent",
                        header.column.getIsSorted() && "border-blue-500 text-blue-600 bg-blue-50/30",
                        index === 0 && "sticky left-0 z-30 bg-gray-50/95 backdrop-blur-sm shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)]"
                      )}
                      onClick={(e) => header.column.getToggleSortingHandler()?.(e)}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted()] ?? ' ↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-2 text-center text-gray-500">
                    {emptyComponent || (
                      <div className="flex flex-col items-center justify-center space-y-3 py-12">
                        <div className="p-3 bg-gray-50 rounded-full">
                          <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-bold text-gray-900">No results found</p>
                          <p className="text-sm text-gray-500">Try adjusting your search or filters to find what you&apos;re looking for.</p>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => (
                  <tr key={row.id} className={cn(
                    "hover:bg-gray-50 transition-colors",
                    rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  )}>
                    {row.getVisibleCells().map((cell, index) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-3 py-1.5 text-xs text-gray-700 font-medium border-b border-gray-100/50",
                          index === 0 && "sticky left-0 z-20 border-r border-gray-100/50 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.05)]",
                          index === 0 && rowIndex % 2 === 0 && "bg-white/95 backdrop-blur-sm",
                          index === 0 && rowIndex % 2 !== 0 && "bg-gray-50/95 backdrop-blur-sm"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            {table.getFilteredRowModel().rows.length > 0 ? (
              <>
                Showing{' '}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}{' '}
                to{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{' '}
                of {table.getFilteredRowModel().rows.length} results
              </>
            ) : (
              <span className="text-gray-400 italic">No entries to display</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {table.getPageCount() > 0 ? table.getState().pagination.pageIndex + 1 : 0} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              {[10, 20, 30, 50, 100].map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}








