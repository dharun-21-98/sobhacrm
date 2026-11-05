import React, { useState, useRef, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Download, Search, Info } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { exportRows, d1 } from "../lib";
import { config } from "../data/config";
export function Chip({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`chip ${tone || (/Closed|Completed|Active|Segment 1/.test(String(children)) ? "green" : /High|Overdue|Cancelled/.test(String(children)) ? "red" : "")}`}
    >
      {children}
    </span>
  );
}
export function Assumptions() {
  return (
    <details className="assumptions">
      <summary>
        <Info size={14} /> Prototype assumptions
      </summary>
      {Object.entries(config.assumptions).map(([k, v]) => (
        <p key={k}>
          <b>{k}</b>{" "}
          <span title="Assumption – pending Sobha confirmation">ⓘ</span> {v}
        </p>
      ))}
    </details>
  );
}
export function Kpi({
  label,
  value,
  source = "CRM",
  sub,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  source?: string;
  sub?: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="kpi">
      <div className="muted">
        {label} <span title="Assumption – pending Sobha confirmation">ⓘ</span>
      </div>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
      {progress !== undefined && (
        <div className="progress">
          <i
            style={{
              width: `${Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0}%`,
            }}
          />
        </div>
      )}
      <footer>
        {source} {source.includes("D365") && `· As of ${d1()} (D-1)`}
      </footer>
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(v) => !v && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="muted">
            Sobha relationship management · prototype
          </Dialog.Description>
          <Dialog.Close className="icon close" aria-label="Close">
            <X size={19} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Select({
  value,
  onChange,
  options,
  label,
  optionLabels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
  optionLabels?: Record<string, string>;
}) {
  return (
    <select
      aria-label={label || options[0]}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {label && <option value="">{label}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {optionLabels?.[o] || o || "All"}
        </option>
      ))}
    </select>
  );
}
export function Toolbar({
  search,
  setSearch,
  children,
  reset,
  searchLabel = "Search list",
}: {
  search: string;
  setSearch: (s: string) => void;
  children?: React.ReactNode;
  reset?: () => void;
  searchLabel?: string;
}) {
  return (
    <div className="toolbar">
      <label className="search">
        <Search size={16} />
        <input
          aria-label={searchLabel}
          placeholder="Search by customer, unit or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {children}
      {reset && (
        <button className="ghost" onClick={reset}>
          Clear all
        </button>
      )}
    </div>
  );
}
export function DataList({
  rows,
  columns,
  onRow,
  name = "Results",
  extra,
}: {
  rows: Record<string, unknown>[];
  columns?: string[];
  onRow?: (r: Record<string, unknown>) => void;
  name?: string;
  extra?: (r: Record<string, unknown>) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(30);
  const keys =
    columns || Object.keys(rows[0] || {}).filter((k) => !k.startsWith("_"));
  const defs: ColumnDef<Record<string, unknown>>[] = keys.map((k) => ({
    accessorKey: k,
    header: k,
    cell: (info) => (
      <span title={String(info.getValue() ?? "")}>
        {k === "Assigned RM" && String(info.getValue()).includes(", ")
          ? `${String(info.getValue()).split(", ")[0]} +${String(info.getValue()).split(", ").length - 1}`
          : String(info.getValue() ?? "—")}
      </span>
    ),
  }));
  const visibleRows = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const table = useReactTable({
    data: visibleRows,
    columns: defs,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
  });
  const virtual = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 64,
    overscan: 6,
  });
  return (
    <div className="data-list">
      <div className="list-heading">
        <span>
          {name} <Chip>{rows.length}</Chip>
        </span>
        <button
          onClick={() =>
            exportRows(
              rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]]))),
              name,
            )
          }
        >
          <Download size={14} />
          Export
        </button>
      </div>
      <div
        className="table-scroll"
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 180)
            setLimit((n) => Math.max(30, Math.min(rows.length, n + 30)));
        }}
      >
        <table>
          <thead>
            {table.getHeaderGroups().map((h) => (
              <tr key={h.id}>
                {h.headers.map((c) => (
                  <th key={c.id}>
                    {flexRender(c.column.columnDef.header, c.getContext())}
                  </th>
                ))}
                {extra && <th>Actions</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            <tr style={{ height: virtual.getVirtualItems()[0]?.start || 0 }} />
            {virtual.getVirtualItems().map((v) => {
              const row = table.getRowModel().rows[v.index];
              return (
                <tr
                  key={row.id}
                  style={{ height: 64 }}
                  onClick={() => onRow?.(row.original)}
                  tabIndex={onRow ? 0 : undefined}
                  onKeyDown={(e) =>
                    e.target === e.currentTarget &&
                    e.key === "Enter" &&
                    onRow?.(row.original)
                  }
                >
                  {row.getVisibleCells().map((c) => (
                    <td key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                  {extra && (
                    <td onClick={(e) => e.stopPropagation()}>
                      {extra(row.original)}
                    </td>
                  )}
                </tr>
              );
            })}
            <tr
              style={{
                height: Math.max(
                  0,
                  virtual.getTotalSize() -
                    (virtual.getVirtualItems().at(-1)?.end || 0),
                ),
              }}
            />
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            No results found. Try clearing your filters.
          </div>
        )}
      </div>
      <footer>
        Showing {Math.min(limit, rows.length)} of {rows.length}{" "}
        {name.toLowerCase()}
        {limit < rows.length && (
          <button
            className="ghost"
            onClick={() =>
              setLimit((n) => Math.max(30, Math.min(rows.length, n + 30)))
            }
          >
            Load more
          </button>
        )}
      </footer>
    </div>
  );
}
