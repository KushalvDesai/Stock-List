"use client";

import React, { useState } from "react";
import { ShoppingCart, Gavel, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function MobileSalesPage() {
  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Sales Operations</h2>
        <p className="text-slate-800 text-sm mt-1">Manage private and auction sales.</p>
      </div>

      <div className="space-y-4">
        {/* Private Sale Card */}
        <Link href="/owner-mobile/sales/private" className="block group">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                <ShoppingCart size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Private Sale</h3>
                <p className="text-xs text-slate-800 mt-0.5">Sell directly to buyers</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
        </Link>

        {/* Auction Sale Card */}
        <Link href="/owner-mobile/sales/auction" className="block group">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
                <Gavel size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Auction Sale</h3>
                <p className="text-xs text-slate-800 mt-0.5">Send stock to auction brokers</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
