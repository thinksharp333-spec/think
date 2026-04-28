import { useState, useMemo, useEffect, useRef } from "react";
import { SCHOOLS_DATA } from "@/lib/schools-data";
import { MapPin, School as SchoolIcon, Building2, Home, ChevronDown, Search } from "lucide-react";

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

    const districts = useMemo(() => Array.from(new Set(SCHOOLS_DATA.map(s => s.district))).sort(), []);
    const topDistricts = useMemo(() => {
        const counts: Record<string, number> = {};
        SCHOOLS_DATA.forEach(s => { counts[s.district] = (counts[s.district] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);
    }, []);

    const talukas = useMemo(() => {
        if (!selectedDistrict) return [];
        return Array.from(new Set(SCHOOLS_DATA.filter(s => s.district === selectedDistrict).map(s => s.taluka))).sort();
    }, [selectedDistrict]);

    const villages = useMemo(() => {
        if (!selectedTaluka) return [];
        return Array.from(new Set(SCHOOLS_DATA.filter(s => s.district === selectedDistrict && s.taluka === selectedTaluka).map(s => s.village).filter(Boolean))).sort();
    }, [selectedDistrict, selectedTaluka]);

    const filteredSchools = useMemo(() => {
        if (!selectedTaluka) return [];
        return SCHOOLS_DATA.filter(s => 
            s.district === selectedDistrict && 
            s.taluka === selectedTaluka && 
            (villages.length === 0 || s.village === selectedVillage)
        );
    }, [selectedDistrict, selectedTaluka, selectedVillage, villages.length]);

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
        if (school) onSelect(school.id, school.school_name, school.district, school.taluka);
    };

    return (
        <div className="space-y-4">
            <SearchableSelect
                label="District"
                icon={<MapPin className="h-5 w-5 text-[#111]" />}
                options={districts}
                value={selectedDistrict}
                onChange={handleDistrictChange}
                topOptions={topDistricts}
                placeholder="Search District"
            />

            <SearchableSelect
                label="Taluka"
                icon={<Building2 className="h-5 w-5 text-[#111]" />}
                options={talukas}
                value={selectedTaluka}
                onChange={handleTalukaChange}
                disabled={!selectedDistrict}
                placeholder="Search Taluka"
            />

            <SearchableSelect
                label="Village"
                icon={<Home className="h-5 w-5 text-[#111]" />}
                options={villages}
                value={selectedVillage}
                onChange={handleVillageChange}
                disabled={!selectedTaluka || villages.length === 0}
                placeholder="Search Village"
            />

            <SearchableSelect
                label="School"
                icon={<SchoolIcon className="h-5 w-5 text-[#111]" />}
                options={filteredSchools.map(s => s.school_name)}
                value={filteredSchools.find(s => s.id === selectedSchool)?.school_name || ""}
                onChange={(name) => {
                    const s = filteredSchools.find(f => f.school_name === name);
                    if (s) handleSchoolChange(s.id);
                }}
                disabled={villages.length > 0 ? !selectedVillage : !selectedTaluka}
                placeholder="Search School"
            />
        </div>
    );
}

// ─── Reusable SearchableSelect ──────────────────────────────────────────────

interface SearchableSelectProps {
    label: string;
    icon: React.ReactNode;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    topOptions?: string[];
}

function SearchableSelect({ label, icon, options, value, onChange, placeholder, disabled, topOptions }: SearchableSelectProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isDropdownOpen) setSearchTerm(value);
    }, [value, isDropdownOpen]);

    const filteredOptions = useMemo(() => {
        // If searching (typing), filter the full list
        if (isDropdownOpen && searchTerm !== value) {
            return options.filter(o => o.toLowerCase().startsWith(searchTerm.toLowerCase()));
        }
        // If not searching, show topOptions for District if applicable
        if (topOptions && searchTerm === "") return topOptions;
        return options;
    }, [options, searchTerm, topOptions, value, isDropdownOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setSearchTerm(value);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);

    return (
        <div ref={containerRef} className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-xl font-extrabold text-[#111111]">{label}</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">{icon}</div>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        if (e.target.value === "") onChange("");
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="comic-input pl-12 pr-10 text-lg font-bold w-full h-[52px]"
                    style={{ paddingLeft: "3rem" }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111] pointer-events-none">
                    <ChevronDown className={`h-5 w-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white border-[3px] border-[#111] rounded-xl shadow-[0_5px_0_#111] overflow-hidden">
                        {/* Fixed height to show approx 3 items: each item is ~46px, 46 * 3 = 138px */}
                        <div className="max-h-[142px] overflow-y-auto no-scrollbar">
                            {topOptions && searchTerm === "" && (
                                <div className="px-3 py-1 bg-[#f8f8f8] text-[9px] font-black uppercase tracking-widest text-[#999] border-b-[2px] border-[#eee]">
                                    Top Districts
                                </div>
                            )}

                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt);
                                            setSearchTerm(opt);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 font-bold text-sm tracking-tight hover:bg-[#fff9ee] transition-colors border-b border-[#eee] last:border-0"
                                    >
                                        {opt}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-4 text-[#999] font-bold text-xs italic text-center">
                                    Not found...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
