"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { motion, AnimatePresence } from "framer-motion";

const GRADES = [
  "BPS", "BOP", "BOPSM", "BP", "BPSM", "PF", "PD", "DUST", "CD",
  "BPS1", "BOPL1", "BOP1", "BOPSM1", "BP1", "BPSM1", "PF1", "PD1",
  "DUST1", "CD1", "OF", "BOPL"
];

interface StockRow {
  id: string;
  inv: string;
  invNo: string;
  grade: string;
  totalBags: string;
  bagWt: string;
  netWt: string;
  dop: string;
}

export default function AddStockPage() {
  const toast = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  const generateEmptyRow = (): StockRow => ({
    id: Math.random().toString(36).substring(7),
    inv: "",
    invNo: "",
    grade: "BP", // default grade
    totalBags: "",
    bagWt: "",
    netWt: "",
    dop: today,
  });

  const [rows, setRows] = useState<StockRow[]>([]);
  const [selectedCol, setSelectedCol] = useState<keyof StockRow | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  useEffect(() => {
    setRows(Array.from({ length: 5 }, () => generateEmptyRow()));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (selectedCol && selectedRows.length > 1) {
          const minRow = Math.min(...selectedRows);
          
          setRows(prev => {
            const newRows = [...prev];
            const sourceValue = newRows[minRow][selectedCol];
            
            selectedRows.forEach(rIdx => {
              if (rIdx !== minRow) {
                newRows[rIdx] = { ...newRows[rIdx], [selectedCol]: sourceValue };
                
                // Recalculate netWt if totalBags or bagWt was copied
                if (selectedCol === "totalBags" || selectedCol === "bagWt") {
                  const tb = parseFloat(newRows[rIdx].totalBags);
                  const bw = parseFloat(newRows[rIdx].bagWt);
                  if (!isNaN(tb) && !isNaN(bw)) {
                    newRows[rIdx].netWt = (tb * bw).toFixed(2);
                  } else {
                    newRows[rIdx].netWt = "";
                  }
                }
              }
            });
            
            // Check for empty rows buffer
            const hasData = (row: StockRow) => !!(row.inv || row.invNo || row.totalBags || row.bagWt || row.netWt);
            let emptyCountAtEnd = 0;
            for (let i = newRows.length - 1; i >= 0; i--) {
              if (!hasData(newRows[i])) emptyCountAtEnd++;
              else break;
            }
            if (emptyCountAtEnd < 2) {
              const rowsToAdd = 2 - emptyCountAtEnd;
              for (let i = 0; i < rowsToAdd; i++) newRows.push(generateEmptyRow());
            }
            
            return newRows;
          });
          toast.success(`Copied values down to ${selectedRows.length - 1} rows!`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCol, selectedRows, toast]);

  const handleMouseDown = (e: React.MouseEvent, index: number, colName: keyof StockRow) => {
    if (e.shiftKey && selectedCol === colName && selectedRows.length > 0) {
      e.preventDefault();
      const startRow = selectedRows[0];
      const minR = Math.min(startRow, index);
      const maxR = Math.max(startRow, index);
      const newSelected = [];
      for (let i = minR; i <= maxR; i++) newSelected.push(i);
      setSelectedRows(newSelected);
    } else {
      setSelectedCol(colName);
      setSelectedRows([index]);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, index: number, colName: keyof StockRow) => {
    if (e.buttons === 1 && selectedCol === colName) {
      const startRow = selectedRows[0];
      const minR = Math.min(startRow, index);
      const maxR = Math.max(startRow, index);
      const newSelected = [];
      for (let i = minR; i <= maxR; i++) newSelected.push(i);
      setSelectedRows(newSelected);
    }
  };

  const getCellClass = (index: number, colName: keyof StockRow, baseClass: string) => {
    const isSelected = selectedCol === colName && selectedRows.includes(index);
    return `${baseClass} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-white'}`;
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number, colName: keyof StockRow) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT') return; // Let select dropdown handle its own arrows

    if (e.key === "ArrowUp") {
      e.preventDefault();
      document.getElementById(`cell-${index - 1}-${colName}`)?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      document.getElementById(`cell-${index + 1}-${colName}`)?.focus();
    }
  };

  const handleAddRow = () => {
    setRows([...rows, generateEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleChange = (id: string, field: keyof StockRow, value: string) => {
    setRows(prevRows => {
      let newRows = prevRows.map((r) => {
        if (r.id !== id) return r;

        const updatedRow = { ...r, [field]: value };

        // Auto-calculate netWt
        if (field === "totalBags" || field === "bagWt") {
          const tb = parseFloat(updatedRow.totalBags);
          const bw = parseFloat(updatedRow.bagWt);
          if (!isNaN(tb) && !isNaN(bw)) {
            updatedRow.netWt = (tb * bw).toFixed(2);
          } else {
            updatedRow.netWt = "";
          }
        }
        return updatedRow;
      });

      const hasData = (row: StockRow) => !!(row.inv || row.invNo || row.totalBags || row.bagWt || row.netWt);

      let emptyCountAtEnd = 0;
      for (let i = newRows.length - 1; i >= 0; i--) {
        if (!hasData(newRows[i])) emptyCountAtEnd++;
        else break;
      }

      if (emptyCountAtEnd < 2) {
        const rowsToAdd = 2 - emptyCountAtEnd;
        for (let i = 0; i < rowsToAdd; i++) {
          newRows.push(generateEmptyRow());
        }
      }

      return newRows;
    });
  };

  const handleSubmit = async () => {
    const rowsToSubmit: StockRow[] = [];

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // A row is considered manually untouched if all these inputs are blank
      const isCompletelyEmpty = !r.inv && !r.invNo && !r.totalBags && !r.bagWt && !r.netWt;
      
      if (isCompletelyEmpty) continue;

      const isCompletelyFilled = r.inv && r.invNo && r.grade && r.totalBags && r.bagWt && r.netWt && r.dop;
      
      if (!isCompletelyFilled) {
        toast.error(`Please fill all fields in row ${i + 1} (or leave it completely blank)`);
        return;
      }

      rowsToSubmit.push(r);
    }

    if (rowsToSubmit.length === 0) {
      toast.error("Please fill at least one row to submit.");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    try {
      for (const row of rowsToSubmit) {
        await api.post("/stock/upload", {
          INV: row.inv,
          INV_NO: row.invNo,
          GRADE: row.grade,
          TOTAL_BAGS: row.totalBags,
          BAG_WT: row.bagWt,
          NET_WT: row.netWt,
          DOP: row.dop,
        });
        successCount++;
      }
      toast.success(`Successfully saved ${successCount} stock entries`);
      setRows(Array.from({ length: 5 }, () => generateEmptyRow())); // reset back to 5 rows
    } catch (error) {
      console.error("Error submitting stock:", error);
      toast.error("Failed to submit entries. Check logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (rows.length === 0) return null; // Prevent hydration flash

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        <Link href="/staff" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 w-fit font-medium transition-colors">
          <ArrowLeft size={18} />
          Back to Staff Dashboard
        </Link>
        <div className="flex justify-between items-end mb-6 bg-white shadow-sm px-6 py-4 rounded-md border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Bulk Stock Entry</h1>
            <p className="text-sm text-gray-500 font-medium">Fast, Excel-like data entry for new stock. Use Tab to navigate.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Add Row
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? "Saving..." : "Save All to Database"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-md shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3 w-32">INV (UK, C, D)</th>
                  <th className="px-4 py-3 w-32">INV NO</th>
                  <th className="px-4 py-3 w-40">GRADE</th>
                  <th className="px-4 py-3 w-32">TOTAL BAGS</th>
                  <th className="px-4 py-3 w-32">BAG WT (kg)</th>
                  <th className="px-4 py-3 w-32">NET WT (kg)</th>
                  <th className="px-4 py-3">DOP</th>
                  <th className="px-4 py-3 w-16 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {rows.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group"
                    >
                      <td className="px-4 py-2 text-center text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`cell-${index}-inv`}
                          type="text"
                          value={row.inv}
                          onChange={(e) => handleChange(row.id, "inv", e.target.value.toUpperCase())}
                          onMouseDown={(e) => handleMouseDown(e, index, "inv")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "inv")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "inv")}
                          className={getCellClass(index, "inv", "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors placeholder:text-gray-400 text-gray-800")}
                          placeholder="ABC"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`cell-${index}-invNo`}
                          type="number"
                          value={row.invNo}
                          onChange={(e) => handleChange(row.id, "invNo", e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, "invNo")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "invNo")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "invNo")}
                          className={getCellClass(index, "invNo", "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors placeholder:text-gray-400 text-gray-800")}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          id={`cell-${index}-grade`}
                          value={row.grade}
                          onChange={(e) => handleChange(row.id, "grade", e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, "grade")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "grade")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "grade")}
                          className={getCellClass(index, "grade", "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-gray-800 font-medium")}
                        >
                          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`cell-${index}-totalBags`}
                          type="number"
                          value={row.totalBags}
                          onChange={(e) => handleChange(row.id, "totalBags", e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, "totalBags")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "totalBags")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "totalBags")}
                          className={getCellClass(index, "totalBags", "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors placeholder:text-gray-400 text-gray-800")}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`cell-${index}-bagWt`}
                          type="number"
                          step="0.1"
                          value={row.bagWt}
                          onChange={(e) => handleChange(row.id, "bagWt", e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, "bagWt")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "bagWt")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "bagWt")}
                          className={getCellClass(index, "bagWt", "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors placeholder:text-gray-400 text-gray-800")}
                          placeholder="0.0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`cell-${index}-netWt`}
                          type="number"
                          step="0.1"
                          value={row.netWt}
                          onChange={(e) => handleChange(row.id, "netWt", e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, "netWt")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "netWt")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "netWt")}
                          className={getCellClass(index, "netWt", "w-full px-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors font-semibold text-gray-900")}
                          placeholder="0.0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`cell-${index}-dop`}
                          type="date"
                          value={row.dop}
                          min={`${currentYear}-01-01`}
                          max={`${currentYear}-12-31`}
                          onChange={(e) => handleChange(row.id, "dop", e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, "dop")}
                          onMouseEnter={(e) => handleMouseEnter(e, index, "dop")}
                          onKeyDown={(e) => handleCellKeyDown(e, index, "dop")}
                          className={getCellClass(index, "dop", "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-gray-800")}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={rows.length === 1}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 p-3 px-4 flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700">{rows.length} row{rows.length > 1 ? 's' : ''} ready</span>
            <span className="text-gray-500">Use <kbd className="bg-white border border-gray-300 px-1.5 py-0.5 rounded-sm text-xs mx-1 text-gray-700 shadow-sm">↑</kbd><kbd className="bg-white border border-gray-300 px-1.5 py-0.5 rounded-sm text-xs mx-1 text-gray-700 shadow-sm">↓</kbd> or <kbd className="bg-white border border-gray-300 px-1.5 py-0.5 rounded-sm text-xs mx-1 text-gray-700 shadow-sm">Tab</kbd> to navigate cells, or drag cursor and press <kbd className="bg-white border border-gray-300 px-1.5 py-0.5 rounded-sm text-xs mx-1 text-gray-700 shadow-sm">Ctrl + D</kbd> to duplicate values.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
