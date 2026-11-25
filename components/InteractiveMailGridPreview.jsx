"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { INITIAL_BOXES, getBoxStatus } from "@/data/initialBoxes";
import { Route, RotateCcw, MapPin, Fuel, CloudRain } from "lucide-react";

const HeroLeafletMap = dynamic(() => import("./HeroLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[380px] rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
  ),
});

export default function InteractiveMailGridPreview() {
  const [routeBuilt, setRouteBuilt] = useState(false);
  const [baseKm, setBaseKm] = useState(38.7);
  const [smartKm, setSmartKm] = useState(13.1);

  const previewBoxes = useMemo(() => INITIAL_BOXES.slice(0, 30), []);

  const fullBoxes = useMemo(
    () =>
      previewBoxes
        .filter((b) => getBoxStatus(b) === "full")
        .sort((a, b) => a.lng - b.lng),
    [previewBoxes],
  );

  const fuelRate = 0.1;
  const fuelPrice = 1.65;
  const co2PerKm = 0.23;

  const baseCost = (baseKm * fuelRate * fuelPrice).toFixed(2);
  const smartCost = (smartKm * fuelRate * fuelPrice).toFixed(2);
  const baseCo2 = (baseKm * co2PerKm).toFixed(1);
  const smartCo2 = (smartKm * co2PerKm).toFixed(1);

  return (
    <div className="lg:col-span-12 w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column (55% -> col-span-7): Interactive Map */}
          <div className="lg:col-span-6 flex flex-col">
            <HeroLeafletMap
              boxes={previewBoxes}
              routePoints={fullBoxes}
              routeActive={routeBuilt}
              onDistancesCalculated={(b, s) => {
                setBaseKm(b);
                setSmartKm(s);
              }}
            />
          </div>

          {/* Right Column (45% -> col-span-5): Controls & Metrics */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-5">
              {/* Header */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tracking-wide uppercase">
                  Live Simulation
                </div>
                <h3 className="text-4xl font-black tracking-tight text-slate-900">
                  70% of your stops are completely empty!
                </h3>
                <p className="text-sm text-slate-500">
                  Blind daily routes waste up to two-thirds of fleet mileage.
                  Switch to demand-driven pickup in one click.
                </p>
              </div>

              {/* Comparison Box (Traditional vs Emptyless) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Traditional */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Traditional Route
                  </div>
                  <div className="my-2">
                    <span className="text-2xl md:text-3xl font-black text-slate-700 tabular-nums">
                      €{baseCost}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Fixed schedule (All boxes)
                  </div>
                </div>

                {/* Emptyless (с абсолютным позиционированием бейджа в углу и без переноса) */}
                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200/80 flex flex-col justify-between relative overflow-hidden">
                  {routeBuilt && (
                    <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10">
                      66% CHEAPER
                    </span>
                  )}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Emptyless
                  </div>
                  <div className="my-2">
                    <span className="text-2xl md:text-3xl font-black text-emerald-700 tabular-nums">
                      {routeBuilt ? `€${smartCost}` : "€—"}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700/80 font-medium">
                    Demand-driven ({fullBoxes.length} stops)
                  </div>
                </div>
              </div>

              {/* 3 Bottom Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Distance Card */}
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/70 text-center transition-all duration-300">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <MapPin className="w-3 h-3 text-slate-400" /> Distance
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-1 tabular-nums transition-all">
                    {routeBuilt ? `${smartKm} km` : `${baseKm} km`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {routeBuilt ? (
                      <span className="text-emerald-600 font-bold">
                        -{Math.round(((baseKm - smartKm) / baseKm) * 100)}%
                      </span>
                    ) : (
                      "Baseline"
                    )}
                  </div>
                </div>

                {/* Fuel Card */}
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/70 text-center transition-all duration-300">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Fuel className="w-3 h-3 text-slate-400" /> Fuel Cost
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-1 tabular-nums transition-all">
                    {routeBuilt ? `€${smartCost}` : `€${baseCost}`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {routeBuilt ? (
                      <span className="text-emerald-600 font-bold">
                        Saved €{(baseCost - smartCost).toFixed(2)}
                      </span>
                    ) : (
                      "Baseline"
                    )}
                  </div>
                </div>

                {/* Emissions Card */}
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/70 text-center transition-all duration-300">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <CloudRain className="w-3 h-3 text-slate-400" /> CO₂
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-1 tabular-nums transition-all">
                    {routeBuilt ? `${smartCo2} kg` : `${baseCo2} kg`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {routeBuilt ? (
                      <span className="text-emerald-600 font-bold">
                        -{Math.round(((baseCo2 - smartCo2) / baseCo2) * 100)}%
                      </span>
                    ) : (
                      "Baseline"
                    )}
                  </div>
                </div>
              </div>

              {/* Scale Sub-Caption */}
              <p className="text-[11px] text-slate-400 font-medium text-center pt-1">
                Projected annual savings across 50 routes:{" "}
                <strong className="text-slate-600">
                  ~€77,000 & 107 tons CO₂
                </strong>
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button
                onClick={() => setRouteBuilt((prev) => !prev)}
                className={`w-full h-12 flex items-center justify-center gap-2 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md active:scale-[0.99] ${
                  routeBuilt
                    ? "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-slate-900/5"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 animate-pulse"
                }`}
              >
                {routeBuilt ? (
                  <>
                    <RotateCcw className="w-4 h-4" /> Reset Simulation
                  </>
                ) : (
                  <>
                    <Route className="w-4 h-4" /> Build Smart Route
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
