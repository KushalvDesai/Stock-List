"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToasts } from "@/components/toast";
import { Trash2, Copy, CheckSquare, MousePointerSquareDashed } from "lucide-react";

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
  
  // Full Row Selection for Bulk Actions
  const [selectedFullRows, setSelectedFullRows] = useState<number[]>([]);

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

  const performClearCells = () => {
    if (selectedCol && selectedRows.length > 0) {
      setRows(prev => {
        const newRows = [...prev];
        selectedRows.forEach(rIdx => {
          newRows[rIdx] = { ...newRows[rIdx], [selectedCol]: "" };
          if (onAutoCalculate) {
            newRows[rIdx] = onAutoCalculate(newRows[rIdx], selectedCol);
          }
        });
        return newRows;
      });
      if (selectedRows.length > 1) {
        toast.success(`Cleared ${selectedRows.length} cells.`);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        performCopyDown();
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedCol && selectedRows.length > 1) {
        e.preventDefault();
        performClearCells();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCol, selectedRows, toast, setRows, onAutoCalculate, checkHasData, generateEmptyRow]);

  const toggleFullRow = (index: number, shiftKey: boolean) => {
    if (shiftKey && selectedFullRows.length > 0) {
      const startRow = selectedFullRows[selectedFullRows.length - 1];
      const minR = Math.min(startRow, index);
      const maxR = Math.max(startRow, index);
      const newSelected = new Set(selectedFullRows);
      for (let i = minR; i <= maxR; i++) newSelected.add(i);
      setSelectedFullRows(Array.from(newSelected));
    } else {
      if (selectedFullRows.includes(index)) {
        setSelectedFullRows(selectedFullRows.filter(i => i !== index));
      } else {
        setSelectedFullRows(prev => [...prev, index]);
      }
    }
  };

  const handleDuplicateSelectedRows = () => {
    if (selectedFullRows.length === 0) return;
    setRows(prevRows => {
      const newRows = [...prevRows];
      const rowsToDuplicate = selectedFullRows.map(idx => prevRows[idx]);
      const duplicatedRows = rowsToDuplicate.map(r => ({
        ...r,
        id: Math.random().toString(36).substring(7),
      }));
      const insertIndex = Math.max(...selectedFullRows) + 1;
      newRows.splice(insertIndex, 0, ...duplicatedRows);
      return newRows;
    });
    setSelectedFullRows([]);
    toast.success(`Duplicated ${selectedFullRows.length} rows`);
  };

  const handleDeleteSelectedRows = () => {
    if (selectedFullRows.length === 0) return;
    setRows(prevRows => {
      const newRows = prevRows.filter((_, idx) => !selectedFullRows.includes(idx));
      if (newRows.length === 0) {
        newRows.push(generateEmptyRow());
      }
      return newRows;
    });
    setSelectedFullRows([]);
    toast.success(`Deleted ${selectedFullRows.length} rows`);
  };

  const handleMouseDown = (e: React.MouseEvent, index: number, colName: string) => {
    const target = e.target as HTMLElement;
    const isAlreadySelected = selectedCol === colName && selectedRows.length === 1 && selectedRows[0] === index;
    
    if (target.tagName === "SELECT" && (!isAlreadySelected || e.shiftKey)) {
      e.preventDefault();
      target.focus();
    }
    
    if (e.shiftKey && selectedCol === colName && selectedRows.length > 0) {
      e.preventDefault(); 
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
      
      const target = e.target as HTMLElement;
      if (target && target.focus) {
         target.focus();
      }
    }
  };

  const getCellClass = (index: number, colName: string) => {
    const isSelected = selectedCol === colName && selectedRows.includes(index);
    let baseClass = "w-full h-full min-h-[32px] px-2 py-1 text-sm outline-none transition-colors border-none bg-transparent text-gray-800";
    
    if (isSelected) {
      baseClass += " shadow-[inset_0_0_0_2px_#4f46e5] bg-indigo-50/50 z-10 relative";
    }
    return baseClass;
  };

  const handleFocus = (index: number, colName: string) => {
    if (selectedCol !== colName || selectedRows[0] !== index || selectedRows.length > 1) {
      setSelectedCol(colName);
      setSelectedRows([index]);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number, colName: string) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      e.stopPropagation();
      performCopyDown();
      return;
    }

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
    } else if ((e.key === "ArrowDown" && !e.altKey) || e.key === "Enter") {
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

  const handleDuplicateRowSingle = (index: number) => {
    setRows(prevRows => {
      const newRows = [...prevRows];
      const rowToDuplicate = newRows[index];
      newRows.splice(index + 1, 0, {
        ...rowToDuplicate,
        id: Math.random().toString(36).substring(7),
      });
      return newRows;
    });
    toast.success("Row duplicated");
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-white overflow-hidden shadow-sm border border-gray-300">
      {selectedFullRows.length > 0 && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-indigo-700">
            <CheckSquare size={16} />
            <span className="text-sm font-bold">{selectedFullRows.length} rows selected</span>
          </div>
          <div className="h-4 w-px bg-indigo-200 mx-2"></div>
          <button onClick={handleDuplicateSelectedRows} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white text-indigo-700 border border-indigo-200 rounded shadow-sm hover:bg-indigo-100 transition-colors">
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={handleDeleteSelectedRows} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white text-red-600 border border-red-200 rounded shadow-sm hover:bg-red-50 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={() => setSelectedFullRows([])} className="ml-auto text-xs font-semibold text-indigo-400 hover:text-indigo-600 underline">
            Cancel
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left select-none border-collapse">
          <thead className="bg-gray-100 text-gray-600 font-medium border-b border-gray-300 text-xs text-center">
            <tr>
              <th className="border-r border-b border-gray-300 px-2 py-1.5 w-12 cursor-pointer hover:bg-gray-200 bg-gray-100" title="Click to select all" onClick={() => {
                if (selectedFullRows.length === rows.length) setSelectedFullRows([]);
                else setSelectedFullRows(rows.map((_, i) => i));
              }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-3 h-3 border-t border-l border-gray-400 transform -rotate-45" />
                </div>
              </th>
              {columns.map(col => (
                <th key={col.key} className={`border-r border-b border-gray-300 px-2 py-1.5 font-normal ${col.width || ''}`}>{col.header}</th>
              ))}
              <th className="border-b border-gray-300 px-2 py-1.5 w-20 font-normal">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {rows.map((row, index) => {
                const isRowSelected = selectedFullRows.includes(index);
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`transition-colors group ${isRowSelected ? 'bg-indigo-50/40' : 'bg-white'}`}
                  >
                    <td 
                      className={`border-r border-b border-gray-300 px-1 py-1 text-center text-xs font-normal cursor-pointer transition-colors ${isRowSelected ? 'bg-indigo-200 text-indigo-800 border-indigo-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      onClick={(e) => toggleFullRow(index, e.shiftKey)}
                      title="Click to select row (Shift+Click for multiple)"
                    >
                      {index + 1}
                    </td>
                    
                    {columns.map(col => (
                      <td key={col.key} className={`border-r border-b border-gray-300 p-0 relative ${isRowSelected ? 'bg-indigo-50/20' : 'bg-white hover:bg-gray-50'}`}>
                        {col.type === "select" ? (
                          <select
                            id={`cell-${index}-${col.key}`}
                            value={row[col.key]}
                            onChange={(e) => handleChange(row.id, col.key, e.target.value)}
                            onMouseDown={(e) => handleMouseDown(e, index, col.key)}
                            onMouseEnter={(e) => handleMouseEnter(e, index, col.key)}
                            onKeyDown={(e) => handleCellKeyDown(e, index, col.key)}
                            onFocus={() => handleFocus(index, col.key)}
                            className={getCellClass(index, col.key)}
                          >
                            <option value=""></option>
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
                            onFocus={() => handleFocus(index, col.key)}
                            className={getCellClass(index, col.key)}
                            placeholder={col.placeholder || ""}
                          />
                        )}
                      </td>
                    ))}

                    <td className="border-b border-gray-300 px-1 py-1 bg-white text-center flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicateRowSingle(index)}
                        className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Duplicate Row"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove Row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
