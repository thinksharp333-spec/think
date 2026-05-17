import { useState, useMemo, useEffect, useRef } from "react";
import { SCHOOLS_DATA } from "@/lib/schools-data";
import { MapPin, School as SchoolIcon, Building2, Home, ChevronDown, PenLine, RotateCcw } from "lucide-react";

interface SchoolSelectorProps {
    onSelect: (schoolId: string, schoolName: string, district: string, taluka: string, village: string, isCustom: boolean) => void;
    selectedSchoolId?: string;
}

const OTHER = "Other";

export function SchoolSelector({ onSelect, selectedSchoolId }: SchoolSelectorProps) {
    const initialSchool = selectedSchoolId ? SCHOOLS_DATA.find(s => s.id === selectedSchoolId) : undefined;

    // Known selections from dropdowns
    const [selDist, setSelDist] = useState(initialSchool?.district ?? "");
    const [selTal, setSelTal] = useState(initialSchool?.taluka ?? "");
    const [selVil, setSelVil] = useState(initialSchool?.village ?? "");
    const [selSch, setSelSch] = useState(initialSchool?.id ?? "");

    // "Other" mode flags
    const [distOther, setDistOther] = useState(false);
    const [talOther, setTalOther] = useState(false);
    const [vilOther, setVilOther] = useState(false);
    const [schOther, setSchOther] = useState(false);

    // Custom text values
    const [custDist, setCustDist] = useState("");
    const [custTal, setCustTal] = useState("");
    const [custVil, setCustVil] = useState("");
    const [custSch, setCustSch] = useState("");

    const isCustomMode = distOther || talOther || vilOther || schOther;

    // --- Derived options ---
    const districts = useMemo(() => Array.from(new Set(SCHOOLS_DATA.map(s => s.district))).sort(), []);
    const topDistricts = useMemo(() => {
        const counts: Record<string, number> = {};
        SCHOOLS_DATA.forEach(s => { counts[s.district] = (counts[s.district] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);
    }, []);

    const talukas = useMemo(() => {
        if (!selDist || distOther) return [];
        return Array.from(new Set(SCHOOLS_DATA.filter(s => s.district === selDist).map(s => s.taluka))).sort();
    }, [selDist, distOther]);

    const villages = useMemo(() => {
        if (!selTal || isCustomMode) return [];
        return Array.from(new Set(
            SCHOOLS_DATA.filter(s => s.district === selDist && s.taluka === selTal)
                .map(s => s.village).filter(Boolean)
        )).sort() as string[];
    }, [selDist, selTal, isCustomMode]);

    const filteredSchools = useMemo(() => {
        if (!selTal || isCustomMode) return [];
        return SCHOOLS_DATA.filter(s =>
            s.district === selDist &&
            s.taluka === selTal &&
            (villages.length === 0 || !selVil || s.village === selVil)
        );
    }, [selDist, selTal, selVil, villages.length, isCustomMode]);

    // --- Notify parent for custom school data ---
    const notifyCustom = (dist: string, tal: string, vil: string, sch: string) => {
        if (dist.trim() && tal.trim() && sch.trim()) {
            onSelect("custom", sch.trim(), dist.trim(), tal.trim(), vil.trim(), true);
        }
    };

    // --- Reset helpers ---
    const resetFromDist = () => {
        setTalOther(false); setSelTal(""); setCustTal("");
        setVilOther(false); setSelVil(""); setCustVil("");
        setSchOther(false); setSelSch(""); setCustSch("");
    };
    const resetFromTal = () => {
        setVilOther(false); setSelVil(""); setCustVil("");
        setSchOther(false); setSelSch(""); setCustSch("");
    };
    const resetFromVil = () => {
        setSchOther(false); setSelSch(""); setCustSch("");
    };

    // --- District ---
    const onDistChange = (val: string) => {
        resetFromDist();
        if (val === OTHER) { setDistOther(true); setSelDist(""); setCustDist(""); }
        else { setDistOther(false); setSelDist(val); }
    };

    // --- Taluka ---
    const onTalChange = (val: string) => {
        resetFromTal();
        if (val === OTHER) { setTalOther(true); setSelTal(""); setCustTal(""); }
        else { setTalOther(false); setSelTal(val); }
    };

    // --- Village ---
    const onVilChange = (val: string) => {
        resetFromVil();
        if (val === OTHER) { setVilOther(true); setSelVil(""); setCustVil(""); }
        else { setVilOther(false); setSelVil(val); }
    };

    // --- School ---
    const onSchChange = (schoolId: string) => {
        if (schoolId === OTHER) {
            setSchOther(true); setSelSch(""); setCustSch("");
        } else {
            setSchOther(false); setSelSch(schoolId);
            const s = SCHOOLS_DATA.find(sc => sc.id === schoolId);
            if (s) onSelect(s.id, s.school_name, s.district, s.taluka, s.village ?? "", false);
        }
    };

    // --- Show/hide logic ---
    const showTaluka = !!selDist || distOther;
    const showVillage = showTaluka && (!!selTal || talOther || distOther);
    const knownSchoolReady = villages.length > 0 ? !!selVil : !!selTal;
    const showSchool = showVillage && (knownSchoolReady || isCustomMode);

    // Which levels use custom input
    const useCustomTal = distOther || talOther;
    const useCustomVil = distOther || talOther || vilOther;
    const useCustomSch = distOther || talOther || vilOther || schOther;

    return (
        <div className="space-y-4">
            {/* District */}
            {!distOther ? (
                <SearchableSelect
                    label="District"
                    icon={<MapPin className="h-5 w-5 text-[#111]" />}
                    options={districts}
                    value={selDist}
                    onChange={onDistChange}
                    topOptions={topDistricts}
                    placeholder="Search District"
                    showOther
                />
            ) : (
                <CustomTextInput
                    label="District"
                    icon={<MapPin className="h-5 w-5 text-[#111]" />}
                    value={custDist}
                    onChange={(v) => { setCustDist(v); notifyCustom(v, custTal, custVil, custSch); }}
                    placeholder="Enter your district name"
                    onClear={() => { setDistOther(false); setCustDist(""); setSelDist(""); resetFromDist(); }}
                />
            )}

            {/* Taluka */}
            {showTaluka && (
                !useCustomTal ? (
                    <SearchableSelect
                        label="Taluka"
                        icon={<Building2 className="h-5 w-5 text-[#111]" />}
                        options={talukas}
                        value={selTal}
                        onChange={onTalChange}
                        disabled={!selDist}
                        placeholder="Search Taluka"
                        showOther={!!selDist}
                    />
                ) : (
                    <CustomTextInput
                        label="Taluka"
                        icon={<Building2 className="h-5 w-5 text-[#111]" />}
                        value={custTal}
                        onChange={(v) => {
                            setCustTal(v);
                            const d = distOther ? custDist : selDist;
                            notifyCustom(d, v, custVil, custSch);
                        }}
                        placeholder="Enter your taluka name"
                        disabled={distOther && !custDist.trim()}
                        onClear={talOther ? () => { setTalOther(false); setCustTal(""); setSelTal(""); resetFromTal(); } : undefined}
                    />
                )
            )}

            {/* Village */}
            {showVillage && (
                !useCustomVil ? (
                    <SearchableSelect
                        label="Village"
                        icon={<Home className="h-5 w-5 text-[#111]" />}
                        options={villages}
                        value={selVil}
                        onChange={onVilChange}
                        disabled={!selTal || villages.length === 0}
                        placeholder="Search Village"
                        showOther={!!selTal}
                    />
                ) : (
                    <CustomTextInput
                        label="Village"
                        icon={<Home className="h-5 w-5 text-[#111]" />}
                        value={custVil}
                        onChange={(v) => {
                            setCustVil(v);
                            const d = distOther ? custDist : selDist;
                            const t = useCustomTal ? custTal : selTal;
                            notifyCustom(d, t, v, custSch);
                        }}
                        placeholder="Enter your village name (optional)"
                        disabled={(distOther && !custDist.trim()) || (useCustomTal && !custTal.trim())}
                        onClear={vilOther ? () => { setVilOther(false); setCustVil(""); setSelVil(""); resetFromVil(); } : undefined}
                    />
                )
            )}

            {/* School */}
            {showSchool && (
                !useCustomSch ? (
                    <SearchableSelect
                        label="School"
                        icon={<SchoolIcon className="h-5 w-5 text-[#111]" />}
                        options={filteredSchools.map(s => s.school_name)}
                        value={filteredSchools.find(s => s.id === selSch)?.school_name || ""}
                        onChange={(name) => {
                            if (name === OTHER) { onSchChange(OTHER); }
                            else { const s = filteredSchools.find(f => f.school_name === name); if (s) onSchChange(s.id); }
                        }}
                        disabled={villages.length > 0 ? !selVil : !selTal}
                        placeholder="Search School"
                        showOther={villages.length > 0 ? !!selVil : !!selTal}
                    />
                ) : (
                    <CustomTextInput
                        label="School"
                        icon={<SchoolIcon className="h-5 w-5 text-[#111]" />}
                        value={custSch}
                        onChange={(v) => {
                            setCustSch(v);
                            const d = distOther ? custDist : selDist;
                            const t = useCustomTal ? custTal : selTal;
                            const vil = useCustomVil ? custVil : selVil;
                            notifyCustom(d, t, vil, v);
                        }}
                        placeholder="Enter your school name"
                        disabled={(distOther && !custDist.trim()) || (useCustomTal && !custTal.trim())}
                        onClear={schOther ? () => { setSchOther(false); setCustSch(""); setSelSch(""); } : undefined}
                    />
                )
            )}
        </div>
    );
}

// ─── Custom Text Input ──────────────────────────────────────────────────────

interface CustomTextInputProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    onClear?: () => void;
}

function CustomTextInput({ label, icon, value, onChange, placeholder, disabled, onClear }: CustomTextInputProps) {
    return (
        <div className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
                <label className="block text-xl font-extrabold text-[#111111]">{label}</label>
                {onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="flex items-center gap-1 text-xs font-bold text-[#5f5852] hover:text-[#db3125] transition-colors"
                    >
                        <RotateCcw className="h-3 w-3" /> Back to list
                    </button>
                )}
            </div>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">{icon}</div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="comic-input pl-12 pr-10 text-lg font-bold w-full h-[52px]"
                    style={{ paddingLeft: "3rem", borderColor: "#db3125" }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <PenLine className="h-4 w-4 text-[#db3125]" />
                </div>
            </div>
            <p className="text-[11px] font-bold text-[#db3125] uppercase tracking-wide">
                Not in our list — write it here
            </p>
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
    showOther?: boolean;
}

function SearchableSelect({ label, icon, options, value, onChange, placeholder, disabled, topOptions, showOther }: SearchableSelectProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isDropdownOpen) setSearchTerm(value);
    }, [value, isDropdownOpen]);

    const filteredOptions = useMemo(() => {
        if (isDropdownOpen && searchTerm !== value) {
            return options.filter(o => o.toLowerCase().startsWith(searchTerm.toLowerCase()));
        }
        if (topOptions && searchTerm === "") return topOptions;
        return options;
    }, [options, searchTerm, topOptions, value, isDropdownOpen]);

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

                        {showOther && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(OTHER);
                                    setSearchTerm("");
                                    setIsDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 font-bold text-sm flex items-center gap-2 text-[#db3125] bg-[#fff5f5] border-t-[2px] border-[#ffd5d5] hover:bg-[#ffecec] transition-colors"
                            >
                                <PenLine className="h-4 w-4 flex-shrink-0" />
                                Other (not in list)
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
