"use client";

import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantile } from "d3-scale";

// User provided TopoJSON for Maharashtra Divisions/Districts
const MAHARASHTRA_TOPO_JSON = "https://raw.githubusercontent.com/datameet/maps/master/divisions/maharashtra.topo.json";

interface MapChartProps {
    data: { [districtName: string]: number };
}

export function MapChart({ data }: MapChartProps) {
    // Color scale
    const colorScale = scaleQuantile<string>()
        .domain(Object.values(data).length > 0 ? Object.values(data) : [0, 1])
        .range([
            "#ffedea",
            "#ffcec5",
            "#ffad9f",
            "#ff8a75",
            "#ff5533",
            "#e2492d",
            "#be3d26",
            "#9a311f",
            "#782618"
        ]);

    return (
        <div className="w-full h-full min-h-[400px] bg-blue-50/20 rounded-lg flex items-center justify-center border border-gray-100 relative overflow-hidden">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 3500,
                    center: [77.0, 19.5] // Center roughly on Maharashtra
                }}
                className="w-full h-full"
            >
                <Geographies geography={MAHARASHTRA_TOPO_JSON}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            // TopoJSON properties usually have NAME property
                            const districtName = geo.properties?.NAME || geo.properties?.name || "Unknown";
                            const value = data[districtName] || 0;

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={value ? colorScale(value) : "#EEE"}
                                    stroke="#FFF"
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#F53", outline: "none", cursor: 'pointer' },
                                        pressed: { outline: "none" },
                                    }}
                                >
                                    <title>{`${districtName}: ${value}`}</title>
                                </Geography>
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>

            <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 p-1 rounded">
                Source: Datameet (Maharashtra)
            </div>
        </div>
    );
}
