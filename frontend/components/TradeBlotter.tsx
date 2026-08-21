import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import type { Trade, TradeBlotterProps } from '../types/trade'

const columnHelper = createColumnHelper<Trade>()

function TradeBlotter({ trades, onCreate, onAmend, onCancel, onRefresh }: TradeBlotterProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.accessor('tradeId', { header: 'Trade ID' }),
      columnHelper.accessor('symbol', { header: 'Symbol' }),
      columnHelper.accessor('side', { header: 'Side' }),
      columnHelper.accessor('quantity', { header: 'Quantity' }),
      columnHelper.accessor('price', { header: 'Price', cell: (info) => info.getValue().toFixed(2) }),
      columnHelper.accessor('trader', { header: 'Trader' }),
      columnHelper.accessor('book', { header: 'Book' }),
      columnHelper.accessor('counterparty', { header: 'Counterparty' }),
      columnHelper.accessor('tradeTimestamp', {
        header: 'Trade Timestamp',
        cell: (info) => info.getValue().replace('T', ' ').replace('Z', ''),
      }),
      columnHelper.accessor('status', { header: 'Status' }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const trade = info.row.original
          const isActive = trade.status === 'ACTIVE'
          return (
            <div className="actions">
              <button type="button" onClick={() => onAmend(trade)} disabled={!isActive}>
                Amend
              </button>
              <button type="button" onClick={() => onCancel(trade)} disabled={!isActive}>
                Cancel
              </button>
            </div>
          )
        },
      }),
    ],
    [onAmend, onCancel],
  )

  const table = useReactTable({
    data: trades,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const statusColumn = table.getColumn('status')
  const statusFilter = (statusColumn?.getFilterValue() as string) ?? ''

  return (
    <section className="trade-blotter">
      <div className="trade-blotter-header">
        <h1>Trade Blotter</h1>
        <button type="button" onClick={onCreate}>
          Create Trade
        </button>
      </div>

      <div className="trade-blotter-toolbar">
        <input
          type="text"
          placeholder="Search trades…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => statusColumn?.setFilterValue(e.target.value || undefined)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getCanSort() ? 'sortable' : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === 'asc' && ' ▲'}
                      {sorted === 'desc' && ' ▼'}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  No trades found.
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={row.original.status !== 'ACTIVE' ? 'cancelled' : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TradeBlotter
