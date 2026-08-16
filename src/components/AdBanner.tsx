"use client";

import React, { useEffect, useRef } from "react";

interface AdBannerProps {
  className?: string;
  isPro?: boolean;
}

export function AdBanner({ className = "", isPro = false }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPro) return;

    // Inject effectivecpmnetwork script
    const scriptId = "effective-cpm-network-ad-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "text/javascript";
      script.src = "https://pl30870768.effectivecpmnetwork.com/40/92/3b/40923bf8429d1aeb05dff74356097b8e.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isPro]);

  useEffect(() => {
    if (isPro || !containerRef.current) return;

    // Clear previous elements inside container if any
    containerRef.current.innerHTML = "";

    const scriptOptions = document.createElement("script");
    scriptOptions.type = "text/javascript";
    scriptOptions.text = `
      atOptions = {
        'key' : '8fc1e86c1e0311b559a341846b2a58c7',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    `;

    const scriptInvoke = document.createElement("script");
    scriptInvoke.type = "text/javascript";
    scriptInvoke.src = "https://www.highperformanceformat.com/8fc1e86c1e0311b559a341846b2a58c7/invoke.js";
    scriptInvoke.async = true;

    containerRef.current.appendChild(scriptOptions);
    containerRef.current.appendChild(scriptInvoke);
  }, [isPro]);

  if (isPro) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center justify-center my-4 overflow-hidden ${className}`}>
      <div 
        ref={containerRef} 
        className="w-[468px] min-h-[60px] max-w-full flex items-center justify-center bg-slate-900/50 border border-white/5 rounded-lg overflow-hidden" 
      />
    </div>
  );
}

export default AdBanner;
