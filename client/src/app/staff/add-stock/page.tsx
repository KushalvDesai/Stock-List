"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Download, Upload } from "lucide-react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { ExcelGrid, ColumnDef } from "@/components/excel-grid";
import * as XLSX from "xlsx";

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
  markId: string;
  totalBags: string;
  bagWt: string;
  netWt: string;
  dop: string;
}

export default function AddStockPage() {
  const toast = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];

  const generateEmptyRow = (): StockRow => ({
    id: Math.random().toString(36).substring(7),
    inv: "",
    invNo: "",
    grade: "BP",
    markId: "",
    totalBags: "",
    bagWt: "",
    netWt: "",
    dop: today,
  });

  const [rows, setRows] = useState<StockRow[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);

  useEffect(() => {
    setRows(Array.from({ length: 5 }, () => generateEmptyRow()));
    const fetchFactory = async () => {
      try {
        const res = await api.get('/company/my-factory');
        const f = res.data || [];
        setFactories(f);
        
        let allMarks: any[] = [];
        f.forEach((factory: any) => {
          if (factory.marks) {
            allMarks = [...allMarks, ...factory.marks.map((m: any) => ({ ...m, factoryName: factory.name }))];
          }
        });
        setMarks(allMarks);
      } catch (error) {
        console.error('Error fetching factories:', error);
      }
    };
    fetchFactory();
  }, []);

  const handleAutoCalculate = (row: any, field: string) => {
    if (field === "totalBags" || field === "bagWt") {
      const tb = parseFloat(row.totalBags);
      const bw = parseFloat(row.bagWt);
      if (!isNaN(tb) && !isNaN(bw)) {
        row.netWt = (tb * bw).toFixed(2);
      } else {
        row.netWt = "";
      }
    }
    return row;
  };

  const checkHasData = (row: any) => {
    return !!(row.inv || row.invNo || row.totalBags || row.bagWt || row.netWt || row.markId);
  };

  const handleAddRow = () => {
    setRows([...rows, generateEmptyRow()]);
  };

  const handleSubmit = async () => {
    const rowsToSubmit: StockRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isCompletelyEmpty = !r.inv && !r.invNo && !r.totalBags && !r.bagWt && !r.netWt && !r.markId;
      if (isCompletelyEmpty) continue;

      const isCompletelyFilled = r.inv && r.invNo && r.grade && r.totalBags && r.bagWt && r.netWt && r.dop && r.markId;

      if (!isCompletelyFilled) {
        toast.error(`Please fill all fields in row ${i + 1}`);
        return;
      }
      rowsToSubmit.push(r);
    }

    if (rowsToSubmit.length === 0) {
      toast.error("Please fill at least one row to submit.");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const row of rowsToSubmit) {
        await api.post("/stock/upload", {
          INV: row.inv,
          INV_NO: row.invNo,
          GRADE: row.grade,
          MARK_ID: row.markId,
          TOTAL_BAGS: row.totalBags,
          BAG_WT: row.bagWt,
          NET_WT: row.netWt,
          DOP: row.dop,
        });
      }
      toast.success(`Successfully saved ${rowsToSubmit.length} stock entries`);
      setRows(Array.from({ length: 5 }, () => generateEmptyRow()));
    } catch (error) {
      toast.error("Failed to submit entries.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Define exactly the headers that the system expects
    const headers = [
      "MARK",
      "INV",
      "INV NO",
      "GRADE",
      "TOTAL BAGS",
      "BAG WT (kg)",
      "NET WT (kg)",
      "DOP"
    ];

    // Create a worksheet with just the headers
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Auto-size columns to look neat
    const wscols = headers.map(h => ({ wch: Math.max(12, h.length) }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Template");

    // Export the file
    XLSX.writeFile(wb, "Add_Stock_Template.xlsx");
    toast.success("Template downloaded!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        // Parse the workbook
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of objects
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast.error("The uploaded Excel file is empty.");
          return;
        }

        const newRows: StockRow[] = data.map((row: any) => {
          // Match mark name to mark ID
          const markName = row["MARK"] ? String(row["MARK"]).trim() : "";
          const foundMark = marks.find(m => m.name.toLowerCase() === markName.toLowerCase());
          
          // Safely parse the Date
          let dopStr = today;
          if (row["DOP"]) {
            if (row["DOP"] instanceof Date) {
              // Ensure timezone offset doesn't mess up the date
              const offset = row["DOP"].getTimezoneOffset() * 60000;
              dopStr = new Date(row["DOP"].getTime() - offset).toISOString().split('T')[0];
            } else {
              const d = new Date(row["DOP"]);
              if (!isNaN(d.getTime())) {
                dopStr = d.toISOString().split('T')[0];
              }
            }
          }

          return {
            id: Math.random().toString(36).substring(7),
            markId: foundMark ? foundMark.id : "",
            inv: row["INV"] ? String(row["INV"]) : "",
            invNo: row["INV NO"] ? String(row["INV NO"]) : "",
            grade: row["GRADE"] ? String(row["GRADE"]) : "BP",
            totalBags: row["TOTAL BAGS"] ? String(row["TOTAL BAGS"]) : "",
            bagWt: row["BAG WT (kg)"] ? String(row["BAG WT (kg)"]) : "",
            netWt: row["NET WT (kg)"] ? String(row["NET WT (kg)"]) : "",
            dop: dopStr,
          };
        });

        // Add extra empty rows if imported count is less than 5
        while (newRows.length < 5) {
          newRows.push(generateEmptyRow());
        }

        setRows(newRows);
        toast.success(`Successfully imported ${data.length} rows from Excel!`);
      } catch (err) {
        console.error("Error parsing Excel:", err);
        toast.error("Failed to parse the Excel file. Make sure it matches the template.");
      }
      
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  if (rows.length === 0) return null;

  const columns: ColumnDef[] = [
    { key: "markId", header: "MARK", width: "w-40", type: "select", options: marks.map(m => ({ value: m.id, label: `${m.name} (${m.factoryName})` })) },
    { key: "inv", header: "INV (UK, C, D)", width: "w-32", type: "text", placeholder: "ABC", uppercase: true },
    { key: "invNo", header: "INV NO", width: "w-32", type: "number", placeholder: "0" },
    { key: "grade", header: "GRADE", width: "w-40", type: "select", options: GRADES.map(g => ({ value: g, label: g })) },
    { key: "totalBags", header: "TOTAL BAGS", width: "w-32", type: "number", placeholder: "0" },
    { key: "bagWt", header: "BAG WT (kg)", width: "w-32", type: "number", placeholder: "0.0" },
    { key: "netWt", header: "NET WT (kg)", width: "w-32", type: "number", placeholder: "0.00" },
    { key: "dop", header: "DOP", type: "date" }
  ];

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
            <p className="text-sm text-gray-500 font-medium">
              {factories.length > 0 
                ? `Assigned Factories: ${factories.map(f => f.name).join(', ')}`
                : "No factories assigned."}
            </p>
          </div>
          <div className="flex gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 font-medium rounded-md hover:bg-blue-100 transition-colors shadow-sm"
            >
              <Upload size={18} />
              Upload Excel
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <Download size={18} />
              Download Template
            </button>
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

        <ExcelGrid 
          columns={columns} 
          rows={rows} 
          setRows={setRows} 
          generateEmptyRow={generateEmptyRow} 
          onAutoCalculate={handleAutoCalculate}
          checkHasData={checkHasData}
        />
        
      </div>
    </div>
  );
}
