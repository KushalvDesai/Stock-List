"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToasts } from "@/components/toast";
import { Trash2 } from "lucide-react";

export interface ColumnDef {
  key: string;
  header: string;
  width?: string;
  type: "text" | "number" | "select" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
  uppercase?: boolean;
}

interface ExcelGridProps {
  columns: ColumnDef[];
  rows: any[];
  setRows: React.Dispatch<React.SetStateAction<any[]>>;
  generateEmptyRow: () => any;
  onAutoCalculate?: (row: any, field: string) => any;
  checkHasData: (row: any) => boolean;
}

export function ExcelGrid({
  columns,
  rows,
  setRows,
  generateEmptyRow,
  onAutoCalculate,
  checkHasData
}: ExcelGridProps) {
  const toast = useToasts();
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const performCopyDown = () => {
    if (selectedCol && selectedRows.length > 1) {
      const minRow = Math.min(...selectedRows);
      
      setRows(prev => {
        const newRows = [...prev];
        const sourceValue = newRows[minRow][selectedCol];
        
        selectedRows.forEach(rIdx => {
          if (rIdx !== minRow) {
            newRows[rIdx] = { ...newRows[rIdx], [selectedCol]: sourceValue };
            if (onAutoCalculate) {
              newRows[rIdx] = onAutoCalculate(newRows[rIdx], selectedCol);
            }
          }
        });
        
        let emptyCountAtEnd = 0;
        for (let i = newRows.length - 1; i >= 0; i--) {
          if (!checkHasData(newRows[i])) emptyCountAtEnd++;
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
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        performCopyDown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCol, selectedRows, toast, setRows, onAutoCalculate, checkHasData, generateEmptyRow]);

  const handleMouseDown = (e: React.MouseEvent, index: number, colName: string) => {
    const target = e.target as HTMLElement;
    const isAlreadySelected = selectedCol === colName && selectedRows.length === 1 && selectedRows[0] === index;
    
    // Prevent dropdown from opening if it's not already the only selected cell, 
    // this allows click-and-drag multiple selection across <select> elements!
    if (target.tagName === "SELECT" && (!isAlreadySelected || e.shiftKey)) {
      e.preventDefault();
      target.focus();
    }
    
    if (e.shiftKey && selectedCol === colName && selectedRows.length > 0) {
      e.preventDefault(); // prevent text selection
      const startRow = selectedRows[0];
      const minR = Math.min(startRow, index);
      const maxR = Math.max(startRow, index);
      const newSelected = [];
      for (let i = minR; i <= maxR; i++) newSelected.push(i);
      setSelectedRows(newSelected);
      target.focus();
    } else {
      setSelectedCol(colName);
      setSelectedRows([index]);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, index: number, colName: string) => {
    if (e.buttons === 1 && selectedCol === colName) {
      const startRow = selectedRows[0];
      const minR = Math.min(startRow, index);
      const maxR = Math.max(startRow, index);
      const newSelected = [];
      for (let i = minR; i <= maxR; i++) newSelected.push(i);
      setSelectedRows(newSelected);
      
      // Optionally focus the cell we dragged into
      const target = e.target as HTMLElement;
      if (target && target.focus) {
         target.focus();
      }
    }
  };

  const getCellClass = (index: number, colName: string, baseClass: string) => {
    const isSelected = selectedCol === colName && selectedRows.includes(index);
    return `${baseClass} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-white'}`;
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number, colName: string) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      e.stopPropagation();
      performCopyDown();
      return;
    }

    // Allow native select dropdown opening via Alt+ArrowDown
    if (e.key === "ArrowUp" && !e.altKey) {
      e.preventDefault();
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        setSelectedCol(colName);
        if (e.shiftKey) {
          const newSelected = [...selectedRows];
          if (!newSelected.includes(prevIndex)) newSelected.push(prevIndex);
          setSelectedRows(newSelected.sort((a,b) => a-b));
        } else {
          setSelectedRows([prevIndex]);
        }
        document.getElementById(`cell-${prevIndex}-${colName}`)?.focus();
      }
    } else if (e.key === "ArrowDown" && !e.altKey) {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < rows.length) {
        setSelectedCol(colName);
        if (e.shiftKey) {
          const newSelected = [...selectedRows];
          if (!newSelected.includes(nextIndex)) newSelected.push(nextIndex);
          setSelectedRows(newSelected.sort((a,b) => a-b));
        } else {
          setSelectedRows([nextIndex]);
        }
        document.getElementById(`cell-${nextIndex}-${colName}`)?.focus();
      }
    }
  };

  const handleChange = (id: string, field: string, value: string) => {
    setRows(prevRows => {
      let newRows = prevRows.map((r) => {
        if (r.id !== id) return r;
        let updatedRow = { ...r, [field]: value };
        if (onAutoCalculate) {
          updatedRow = onAutoCalculate(updatedRow, field);
        }
        return updatedRow;
      });

      let emptyCountAtEnd = 0;
      for (let i = newRows.length - 1; i >= 0; i--) {
        if (!checkHasData(newRows[i])) emptyCountAtEnd++;
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

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-white rounded-md shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 w-12 text-center">#</th>
              {columns.map(col => (
                <th key={col.key} className={`px-4 py-3 ${col.width || ''}`}>{col.header}</th>
              ))}
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
                  
                  {columns.map(col => (
                    <td key={col.key} className="px-2 py-2">
                      {col.type === "select" ? (
                        <select
                          id={`cell-${index}-${col.key}`}
                          value={row[col.key]}
                          onChange={(e) => handleChange(row.id, col.key, e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, col.key)}
                          onMouseEnter={(e) => handleMouseEnter(e, index, col.key)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, col.key)}
                          className={getCellClass(index, col.key, "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-gray-800 font-medium")}
                        >
                          <option value="">-- Select --</option>
                          {col.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`cell-${index}-${col.key}`}
                          type={col.type}
                          value={row[col.key]}
                          onChange={(e) => handleChange(row.id, col.key, col.uppercase ? e.target.value.toUpperCase() : e.target.value)}
                          onMouseDown={(e) => handleMouseDown(e, index, col.key)}
                          onMouseEnter={(e) => handleMouseEnter(e, index, col.key)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, col.key)}
                          className={getCellClass(index, col.key, "w-full px-3 py-1.5 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors placeholder:text-gray-400 text-gray-800")}
                          placeholder={col.placeholder || ""}
                        />
                      )}
                    </td>
                  ))}

                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove Row"
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
    </div>
  );
}
