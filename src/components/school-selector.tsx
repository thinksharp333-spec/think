"use client";

import { useState, useMemo } from "react";
import { SCHOOLS_DATA } from "@/lib/schools-data";
import { MapPin, School as SchoolIcon, Building2, Home } from "lucide-react";

interface SchoolSelectorProps {
    onSelect: (schoolId: string, schoolName: string, district: string, taluka: string) => void;
    selectedSchoolId?: string;
}

export function SchoolSelector({ onSelect, selectedSchoolId }: SchoolSelectorProps) {
    const initialSchool = selectedSchoolId ? SCHOOLS_DATA.find(s => s.id === selectedSchoolId) : undefined;

    const [selectedDistrict, setSelectedDistrict] = useState(initialSchool?.district ?? "");
    const [selectedTaluka, setSelectedTaluka] = useState(initialSchool?.taluka ?? "");
    const [selectedVillage, setSelectedVillage] = useState(initialSchool?.village ?? "");
    const [selectedSchool, setSelectedSchool] = useState(initialSchool?.id ?? "");

    const districts = useMemo(
        () => Array.from(new Set(SCHOOLS_DATA.map(s => s.district))).sort(),
        []
    );

    const talukas = useMemo(() => {
        if (!selectedDistrict) return [];
        return Array.from(
            new Set(SCHOOLS_DATA.filter(s => s.district === selectedDistrict).map(s => s.taluka))
        ).sort();
    }, [selectedDistrict]);

    const villages = useMemo(() => {
        if (!selectedTaluka) return [];
        return Array.from(
            new Set(
                SCHOOLS_DATA
                    .filter(s => s.district === selectedDistrict && s.taluka === selectedTaluka)
                    .map(s => s.village)
                    .filter(Boolean)
            )
        ).sort();
    }, [selectedDistrict, selectedTaluka]);

    const handleDistrictChange = (district: string) => {
        setSelectedDistrict(district);
        setSelectedTaluka("");
        setSelectedVillage("");
        setSelectedSchool("");
    };

    const handleTalukaChange = (taluka: string) => {
        setSelectedTaluka(taluka);
        setSelectedVillage("");
        setSelectedSchool("");
    };

    const handleVillageChange = (village: string) => {
        setSelectedVillage(village);
        setSelectedSchool("");
    };

    const handleSchoolChange = (schoolId: string) => {
        setSelectedSchool(schoolId);
        const school = SCHOOLS_DATA.find(s => s.id === schoolId);
        if (school) {
            onSelect(school.id, school.school_name, school.district, school.taluka);
        }
    };

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

            {/* Taluka Selector */}
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

            {/* Village Selector */}
            <div>
                <label className="mb-2 block text-xl font-extrabold text-[#111111]">
                    Village
                </label>
                <div className="relative">
                    <Home className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                    <select
                        value={selectedVillage}
                        onChange={(e) => handleVillageChange(e.target.value)}
                        disabled={!selectedTaluka || villages.length === 0}
                        className="comic-input comic-select pl-12 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ paddingLeft: "3rem" }}
                    >
                        <option value="">Select Village</option>
                        {villages.map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* School Selector */}
            <div>
                <label className="mb-2 block text-xl font-extrabold text-[#111111]">
                    School
                </label>
                <div className="relative">
                    <SchoolIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                    <select
                        value={selectedSchool}
                        onChange={(e) => handleSchoolChange(e.target.value)}
                        disabled={villages.length > 0 ? !selectedVillage : !selectedTaluka}
                        className="comic-input comic-select pl-12 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ paddingLeft: "3rem" }}
                    >
                        <option value="">Select School</option>
                        {SCHOOLS_DATA
                            .filter(s =>
                                s.district === selectedDistrict &&
                                s.taluka === selectedTaluka &&
                                (villages.length === 0 || s.village === selectedVillage)
                            )
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
