import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowDownUp,
} from "lucide-react";

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

export default function DataTable({
  columns,
  data = [],
  searchPlaceholder = "Search records...",
  emptyMessage = "No records found",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        stringifyValue(val).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    const column = columns.find((col) => col.key === sortColumn);
    const accessor = column?.accessor;

    return [...filteredData].sort((a, b) => {
      const aVal = accessor ? accessor(a) : a[sortColumn];
      const bVal = accessor ? accessor(b) : b[sortColumn];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return sortDirection === "asc" ? res : -res;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = sortDirection === "asc" ? ArrowUpDown : ArrowDownUp;

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-sky-700 font-medium">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-sky-200 rounded-lg px-2.5 py-1 text-xs text-sky-900 focus:outline-none focus:border-sky-500 shadow-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-sky-100 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-sky-50/70 border-b border-sky-100">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key || col.header}
                    onClick={() => col.sortable !== false && col.key && handleSort(col.key)}
                    className={`px-5 py-3.5 select-none ${
                      col.sortable !== false && col.key
                        ? "cursor-pointer hover:bg-sky-100/60"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                        {col.header}
                      </span>
                      {col.sortable !== false && col.key && (
                        <SortIcon
                          className={`w-3.5 h-3.5 ${
                            sortColumn === col.key
                              ? "text-sky-600 opacity-100"
                              : "text-sky-300 opacity-50"
                          }`}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key || col.header}
                        className="px-5 py-3.5 text-sm text-slate-700"
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-12 text-center text-sm text-sky-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sky-100 flex items-center justify-between bg-white text-xs text-sky-600 font-medium">
          <div>
            Showing{" "}
            {sortedData.length > 0 ? (safePage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(safePage * pageSize, sortedData.length)} of {sortedData.length}{" "}
            records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg border border-sky-200 text-sky-600 hover:bg-sky-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-sky-900">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-lg border border-sky-200 text-sky-600 hover:bg-sky-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
