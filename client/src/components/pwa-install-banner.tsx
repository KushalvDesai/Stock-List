"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, PlusSquare } from "lucide-react";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isSamsung, setIsSamsung] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid hydration flicker
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone;
    setIsStandalone(checkStandalone);

    // Detect iOS
    const iOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent.toLowerCase()) 
             && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detect Samsung Internet (which doesn't consistently fire beforeinstallprompt)
    const isSamsungBrowser = /SamsungBrowser/i.test(window.navigator.userAgent);
    setIsSamsung(isSamsungBrowser);

    // Listen for the install prompt on Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User selected: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Do not show if already installed or in standalone mode
  if (isStandalone || isAppInstalled) return null;

  // Show install button for Android/Chrome
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-[80px] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] z-50 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-5">
        <div className="flex flex-col">
          <span className="font-bold">Install StockList App</span>
          <span className="text-xs text-indigo-100">For a faster, full-screen experience</span>
        </div>
        <button 
          onClick={handleInstallClick}
          className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
        >
          <Download size={16} /> Install
        </button>
      </div>
    );
  }

  // Show iOS fallback instruction
  if (isIOS) {
    return (
      <div className="fixed bottom-[80px] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] z-50 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-800 p-4 rounded-2xl shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
          <Download size={20} />
        </div>
        <div className="flex flex-col text-sm">
          <span className="font-bold">Install the App</span>
          <span className="text-gray-500 mt-1">
            Tap <Share size={14} className="inline mx-1" /> then<br/>
            <PlusSquare size={14} className="inline mx-1" /> <strong>Add to Home Screen</strong>
          </span>
        </div>
      </div>
    );
  }

  // Show Samsung Internet fallback instruction
  if (isSamsung && !deferredPrompt) {
    return (
      <div className="fixed bottom-[80px] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] z-50 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-800 p-4 rounded-2xl shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
          <Download size={20} />
        </div>
        <div className="flex flex-col text-sm">
          <span className="font-bold">Install the App</span>
          <span className="text-gray-500 mt-1">
            Tap the <strong>Download icon</strong> in the URL bar, or tap Menu (≡) and select <strong>Add to Home screen</strong>.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
