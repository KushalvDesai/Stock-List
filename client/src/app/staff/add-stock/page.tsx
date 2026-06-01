import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AddStockPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/staff" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8 w-fit font-medium">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Add Stock</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500">The stock entry upload form will be implemented here.</p>
        </div>
      </div>
    </div>
  );
}
