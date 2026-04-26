"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase, type School } from "@/lib/supabase";
import { MapPin, School as SchoolIcon, Building2 } from "lucide-react";

interface SchoolSelectorProps {
    onSelect: (schoolId: string, schoolName: string, district: string, taluka: string) => void;
    selectedSchoolId?: string;
}

export function SchoolSelector({ onSelect, selectedSchoolId }: SchoolSelectorProps) {
    const [schools, setSchools] = useState<School[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);

    // Selection states
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedTaluka, setSelectedTaluka] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSchools() {
            try {
                const res = await fetch('/api/schools');
                if (!res.ok) throw new Error('Failed to fetch schools');
                const { schools: data } = await res.json();

                if (data) {
                    setSchools(data as School[]);
                    const uniqueDistricts = Array.from(new Set((data as School[]).map(s => s.district))).sort();
                    setDistricts(uniqueDistricts);

                    if (selectedSchoolId) {
                        const preselected = (data as School[]).find((school) => school.id === selectedSchoolId);
                        if (preselected) {
                            setSelectedDistrict(preselected.district);
                            setSelectedTaluka(preselected.taluka);
                            setSelectedSchool(preselected.id);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching schools:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchSchools();
    }, [selectedSchoolId]);

    const talukas = useMemo(() => {
        if (!selectedDistrict) return [];

        return Array.from(
            new Set(
                schools
                    .filter((school) => school.district === selectedDistrict)
                    .map((school) => school.taluka)
            )
        ).sort();
    }, [schools, selectedDistrict]);

    const handleDistrictChange = (district: string) => {
        setSelectedDistrict(district);
        setSelectedTaluka("");
        setSelectedSchool("");
    };

    const handleTalukaChange = (taluka: string) => {
        setSelectedTaluka(taluka);
        setSelectedSchool("");
    };

    const handleSchoolChange = (schoolId: string) => {
        setSelectedSchool(schoolId);
        const school = schools.find(s => s.id === schoolId);
        if (school) {
            onSelect(school.id, school.school_name, school.district, school.taluka);
        }
    };

    if (isLoading) {
        return <div className="comic-card animate-pulse p-4 text-sm font-black uppercase tracking-wide text-[#5f5852]">Loading schools...</div>;
    }

    return (
        <div className="space-y-4">
            {/* District Selector */}
            <div>
                <label className="mb-2 block text-xl font-extrabold text-[#111111]">
                    District
                </label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                    <select
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="comic-input comic-select pl-12 text-lg font-bold"
                        style={{ paddingLeft: "3rem" }}
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
                <label className="mb-2 block text-xl font-extrabold text-[#111111]">
                    Taluka
                </label>
                <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                    <select
                        value={selectedTaluka}
                        onChange={(e) => handleTalukaChange(e.target.value)}
                        disabled={!selectedDistrict}
                        className="comic-input comic-select pl-12 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ paddingLeft: "3rem" }}
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
                <label className="mb-2 block text-xl font-extrabold text-[#111111]">
                    School
                </label>
                <div className="relative">
                    <SchoolIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                    <select
                        value={selectedSchool}
                        onChange={(e) => handleSchoolChange(e.target.value)}
                        disabled={!selectedTaluka}
                        className="comic-input comic-select pl-12 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ paddingLeft: "3rem" }}
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
