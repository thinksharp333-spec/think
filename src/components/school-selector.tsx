"use client";

import { useState, useEffect } from "react";
import { supabase, type School } from "@/lib/supabase";
import { MapPin, School as SchoolIcon, Building2 } from "lucide-react";

interface SchoolSelectorProps {
    onSelect: (schoolId: string, schoolName: string, district: string, taluka: string) => void;
    selectedSchoolId?: string;
}

export function SchoolSelector({ onSelect, selectedSchoolId }: SchoolSelectorProps) {
    const [schools, setSchools] = useState<School[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);
    const [talukas, setTalukas] = useState<string[]>([]);

    // Selection states
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedTaluka, setSelectedTaluka] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");

    const [isLoading, setIsLoading] = useState(true);

    // Fetch all schools initially (optimized for small dataset < 1000 rows)
    // For larger datasets, we would fetch districts first, then talukas, etc.
    useEffect(() => {
        async function fetchSchools() {
            if (!supabase) return;

            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .order('district', { ascending: true });

            if (error) {
                console.error("Error fetching schools:", error);
                return;
            }

            if (data) {
                setSchools(data as School[]);
                // Extract unique districts
                const uniqueDistricts = Array.from(new Set(data.map(s => s.district))).sort();
                setDistricts(uniqueDistricts);
            }
            setIsLoading(false);
        }

        fetchSchools();
    }, []);

    // Update talukas when district changes
    useEffect(() => {
        if (selectedDistrict) {
            const filteredTalukas = Array.from(new Set(
                schools
                    .filter(s => s.district === selectedDistrict)
                    .map(s => s.taluka)
            )).sort();
            setTalukas(filteredTalukas);
            setSelectedTaluka(""); // Reset taluka
            setSelectedSchool(""); // Reset school
        } else {
            setTalukas([]);
        }
    }, [selectedDistrict, schools]);

    // Handle school selection
    const handleSchoolChange = (schoolId: string) => {
        setSelectedSchool(schoolId);
        const school = schools.find(s => s.id === schoolId);
        if (school) {
            onSelect(school.id, school.school_name, school.district, school.taluka);
        }
    };

    if (isLoading) {
        return <div className="text-sm text-gray-500 animate-pulse">Loading schools...</div>;
    }

    if (!supabase) {
        return <div className="text-red-500 text-xs">Database connection not available.</div>;
    }

    return (
        <div className="space-y-4">
            {/* District Selector */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    District
                </label>
                <div className="relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-green-500 transition-colors" />
                    <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm text-black appearance-none"
                    >
                        <option value="">Select District</option>
                        {districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Taluka Selector (Disabled until District selected) */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Taluka
                </label>
                <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-green-500 transition-colors" />
                    <select
                        value={selectedTaluka}
                        onChange={(e) => setSelectedTaluka(e.target.value)}
                        disabled={!selectedDistrict}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm text-black appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Select Taluka</option>
                        {talukas.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* School Selector (Disabled until Taluka selected) */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    School
                </label>
                <div className="relative group">
                    <SchoolIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-green-500 transition-colors" />
                    <select
                        value={selectedSchool}
                        onChange={(e) => handleSchoolChange(e.target.value)}
                        disabled={!selectedTaluka}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm text-black appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Select School</option>
                        {schools
                            .filter(s => s.district === selectedDistrict && s.taluka === selectedTaluka)
                            .map(s => (
                                <option key={s.id} value={s.id}>{s.school_name}</option>
                            ))
                        }
                    </select>
                </div>
            </div>
        </div>
    );
}
