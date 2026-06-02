"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { ExcelGrid, ColumnDef } from "@/components/excel-grid";

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
  const [factory, setFactory] = useState<any>(null);

  useEffect(() => {
    setRows(Array.from({ length: 5 }, () => generateEmptyRow()));
    const fetchFactory = async () => {
      try {
        const res = await api.get('/company/my-factory');
        setFactory(res.data);
        if (res.data?.marks) setMarks(res.data.marks);
      } catch (error) {
        console.error('Error fetching factory:', error);
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

  if (rows.length === 0) return null;

  const columns: ColumnDef[] = [
    { key: "markId", header: "MARK", width: "w-40", type: "select", options: marks.map(m => ({ value: m.id, label: m.name })) },
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
            <p className="text-sm text-gray-500 font-medium">Fast, Excel-like data entry for new stock.</p>
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
