"use client";

import { useState, useEffect } from 'react';
import { supabase, School } from '@/lib/supabase';
import { ChevronDown, Loader2 } from 'lucide-react';

interface AnalyticsFiltersProps {
    onFilterChange: (filters: {
        district: string;
        taluka: string;
        schoolId: string;
    }) => void;
}

export function AnalyticsFilters({ onFilterChange }: AnalyticsFiltersProps) {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);

    // Dropdown options
    const [districts, setDistricts] = useState<string[]>([]);
    const [talukas, setTalukas] = useState<string[]>([]);
    const [filteredSchools, setFilteredSchools] = useState<School[]>([]);

    // Selected values
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedTaluka, setSelectedTaluka] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");

    useEffect(() => {
        async function fetchSchools() {
            if (!supabase) return;

            try {
                // Fetch all schools for client-side filtering (assuming < 1000 schools for now)
                // For larger datasets, we'd want to fetch distinct districts first.
                const { data, error } = await supabase
                    .from('schools')
                    .select('*')
                    .order('district');

                if (error) throw error;

                if (data) {
                    setSchools(data);

                    // Extract unique districts
                    const uniqueDistricts = Array.from(new Set(data.map((s: School) => s.district))).sort();
                    setDistricts(uniqueDistricts);
                }
            } catch (err) {
                console.error("Failed to fetch schools:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchSchools();
    }, []);

    // Handle District Change
    const handleDistrictChange = (district: string) => {
        setSelectedDistrict(district);
        setSelectedTaluka("");
        setSelectedSchool("");

        if (district) {
            // Filter schools by district to get talukas
            const districtSchools = schools.filter(s => s.district === district);
            const uniqueTalukas = Array.from(new Set(districtSchools.map(s => s.taluka))).sort();
            setTalukas(uniqueTalukas);
        } else {
            setTalukas([]);
        }

        onFilterChange({ district, taluka: "", schoolId: "" });
    };

    // Handle Taluka Change
    const handleTalukaChange = (taluka: string) => {
        setSelectedTaluka(taluka);
        setSelectedSchool("");

        if (taluka) {
            const talukaSchools = schools.filter(s =>
                s.district === selectedDistrict && s.taluka === taluka
            ).sort((a, b) => a.school_name.localeCompare(b.school_name));
            setFilteredSchools(talukaSchools);
        } else {
            setFilteredSchools([]);
        }

        onFilterChange({ district: selectedDistrict, taluka, schoolId: "" });
    };

    // Handle School Change
    const handleSchoolChange = (schoolId: string) => {
        setSelectedSchool(schoolId);
        onFilterChange({ district: selectedDistrict, taluka: selectedTaluka, schoolId });
    };

    if (loading) {
        return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading filters...</div>;
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            {/* District */}
            <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">DISTRICT</label>
                <div className="relative">
                    <select
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Taluka */}
            <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">TALUKA</label>
                <div className="relative">
                    <select
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                        value={selectedTaluka}
                        onChange={(e) => handleTalukaChange(e.target.value)}
                        disabled={!selectedDistrict}
                    >
                        <option value="">All Talukas</option>
                        {talukas.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* School */}
            <div className="min-w-[250px] flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">SCHOOL</label>
                <div className="relative">
                    <select
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                        value={selectedSchool}
                        onChange={(e) => handleSchoolChange(e.target.value)}
                        disabled={!selectedTaluka}
                    >
                        <option value="">All Schools</option>
                        {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
