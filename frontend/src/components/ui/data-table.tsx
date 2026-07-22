"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  sortable?: boolean
  hideOnMobile?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  pageSize?: number
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  onRowClick?: (item: T) => void
  className?: string
  mobileCard?: (item: T) => React.ReactNode
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 10,
  loading = false,
  emptyMessage = "No data found.",
  emptyIcon,
  onRowClick,
  className,
  mobileCard,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  const sorted = React.useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aRecord: DynamicRecord = Object.fromEntries(Object.entries(a ?? {}))
      const bRecord: DynamicRecord = Object.fromEntries(Object.entries(b ?? {}))
      const aVal = aRecord[sortKey]
      const bVal = bRecord[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp =
        typeof aVal === "string"
          ? aVal.localeCompare(String(bVal))
          : Number(aVal) - Number(bVal)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (key: string) => {
    setCurrentPage(1)
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null
    if (sortKey !== column.key) return <ChevronsUpDown className="ml-1 h-3 w-3" />
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    )
  }

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className
        )}
      >
        {emptyIcon || (
          <div className="rounded-full bg-muted p-3">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
        )}
        <h3 className="mt-4 text-sm font-semibold text-foreground">
          {emptyMessage}
        </h3>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "h-10 px-4 text-left align-middle font-medium text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center">
                    {col.header}
                    <SortIcon column={col} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("p-4 align-middle", col.className)}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {paginated.map((item) =>
          mobileCard ? (
            <div
              key={keyExtractor(item)}
              className={cn(
                "rounded-lg border p-4",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {mobileCard(item)}
            </div>
          ) : (
            <div
              key={keyExtractor(item)}
              className={cn(
                "rounded-lg border p-4 space-y-2",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {col.header}
                    </span>
                    <span className="text-sm font-medium">
                      {col.render(item)}
                    </span>
                  </div>
                ))}
            </div>
          )
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

export { DataTable }
