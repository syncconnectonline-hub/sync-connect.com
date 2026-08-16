"use client";

import React, { useEffect, useRef } from "react";
import { Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FreeTierAdsProps {
  isPro?: boolean;
  showBanner?: boolean;
  className?: string;
  onUpgradeClick?: () => void;
}

export function FreeTierAds({
  isPro = false,
  showBanner = true,
  className = "",
  onUpgradeClick,
}: FreeTierAdsProps) {
  const bannerContainerRef = useRef<HTMLDivElement>(null);

  // Inject EffectiveCPMNetwork script dynamically ONLY for free tier users
  useEffect(() => {
    if (isPro) return;

    const scriptId = "effective-cpm-network-ad-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "text/javascript";
      script.src = "https://pl30870768.effectivecpmnetwork.com/40/92/3b/40923bf8429d1aeb05dff74356097b8e.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isPro]);

  // Load the 468x60 visual banner inside the container
  useEffect(() => {
    if (isPro || !showBanner || !bannerContainerRef.current) return;

    bannerContainerRef.current.innerHTML = "";

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

    bannerContainerRef.current.appendChild(scriptOptions);
    bannerContainerRef.current.appendChild(scriptInvoke);
  }, [isPro, showBanner]);

  // If user is PRO / VIP / Admin, render nothing (ad-free experience)
  if (isPro) {
    return null;
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div
      id="free-tier-ad-container"
      className={`w-full flex flex-col items-center justify-center p-3 my-4 bg-slate-900/60 border border-amber-500/20 rounded-2xl backdrop-blur-sm shadow-lg transition-all ${className}`}
    >
      <div className="flex items-center justify-between w-full max-w-[468px] mb-2 px-1 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400">
          <Sparkles className="h-3 w-3" /> Publicidad (Versión Gratuita)
        </span>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1 text-[#FF9900] hover:text-white font-black underline cursor-pointer transition-colors"
          >
            <Crown className="h-3 w-3" /> Quitar anuncios con PRO
          </button>
        )}
      </div>

      <div
        ref={bannerContainerRef}
        className="w-[468px] min-h-[60px] max-w-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-white/5"
      />
    </div>
  );
}

export default FreeTierAds;
