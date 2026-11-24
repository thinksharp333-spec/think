
"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Lock,
    Loader2,
    GraduationCap,
    Pencil,
    Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Student {
    id: string;
    name: string;
    mobile?: string;
    age?: number;
    school?: string;
    grade?: string;
    city?: string;
    favourite_food?: string;
    totalPoints: number;
}

export default function ResetPasswordPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Reset Password states
    const [modal, setModal] = useState<{ id: string; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Edit Student states
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        mobile: "",
        age: "",
        grade: "",
        school: "",
        district: "",
        favouriteFood: "",
    });
    const [editLoading, setEditLoading] = useState(false);

    // Deactivate Student states
    const [deactivatingStudent, setDeactivatingStudent] = useState<Student | null>(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);

    // Open Edit Student modal
    const openEditModal = (student: Student) => {
        setEditingStudent(student);

        setEditForm({
            name: student.name || "",
            mobile: student.mobile || "",
            age: student.age?.toString() || "",
            grade: student.grade || "",
            school: student.school || "",
            district: student.city || "",
            favouriteFood: student.favourite_food || "",
        });
    };

    // Update Student
    const handleEditSubmit = async () => {
        if (!editingStudent) return;

        setEditLoading(true);

        try {
            const response = await fetch("/api/admin/edit-student", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    studentId: editingStudent.id,
                    ...editForm,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || "Failed to update student.");
                return;
            }

            setStudents((prev) =>
                prev.map((student) =>
                    student.id === editingStudent.id
                        ? {
                            ...student,
                            name: editForm.name,
                            mobile: editForm.mobile,
                            age: editForm.age.trim()
                                ? Number(editForm.age)
                                : undefined,
                            grade: editForm.grade,
                            school: editForm.school,
                            city: editForm.district,
                            favourite_food: editForm.favouriteFood,
                        }
                        : student
                )
            );

            setEditingStudent(null);
            toast.success("Student updated successfully!");

        } catch (error) {
            console.error("Edit student error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setEditLoading(false);
        }
    };

    // Deactivate Student
    const handleDeactivate = async () => {
        if (!deactivatingStudent) return;

        setDeactivateLoading(true);

        try {
            const response = await fetch("/api/admin/deactivate-student", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    studentId: deactivatingStudent.id,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || "Unable to deactivate student.");
                return;
            }

            setStudents((prev) =>
                prev.filter((s) => s.id !== deactivatingStudent.id)
            );

            toast.success("Student deactivated successfully.");
            setDeactivatingStudent(null);

        } catch (error) {
            console.error("Deactivate student error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setDeactivateLoading(false);
        }
    };

    // Fetch active students
    useEffect(() => {
        async function fetchStudents() {
            if (!supabase) {
                setLoading(false);
                toast.error("Unable to connect to the database.");
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("users")
                    .select(
                        "id, name, mobile, age, school, grade, city, favourite_food, totalPoints"
                    )
                    .eq("role", "student")
                    .eq("is_active", true)
                    .order("name", { ascending: true });

                if (error) throw error;

                setStudents((data || []) as Student[]);

            } catch (error) {
                console.error("Fetch students error:", error);
                toast.error("Failed to load students.");
            } finally {
                setLoading(false);
            }
        }

        fetchStudents();
    }, []);

    // Search students
    const filtered = (() => {
        const q = search.toLowerCase();

        if (!q) return students;

        return students.filter(
            (s) =>
                (s.name || "").toLowerCase().includes(q) ||
                (s.school || "").toLowerCase().includes(q)
        );
    })();

    // Open Reset Password modal
    const openModal = (student: Student) => {
        setModal({ id: student.id, name: student.name });
        setNewPassword("");
    };

    // Reset Student Password
    const handleReset = async () => {
        if (!modal || !newPassword.trim()) return;

        setSubmitting(true);

        try {
            const res = await fetch("/api/admin/reset-student-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    studentId: modal.id,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to reset password.");
                return;
            }

            toast.success(`Password reset for ${modal.name}.`);

            setNewPassword("");
            setModal(null);

        } catch (error) {
            console.error("Reset password error:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Lock className="w-6 h-6 text-orange-500" />
                        Reset Password
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Find a student and set a temporary password for them
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name or school…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm"
                    />
                </div>
            </div>

            {/* Student count */}
            {!loading && (
                <p className="text-xs text-gray-400 font-medium">
                    Showing{" "}
                    <span className="font-bold text-gray-600">
                        {filtered.length}
                    </span>
                    {search ? ` of ${students.length}` : ""} student
                    {students.length !== 1 ? "s" : ""}
                </p>
            )}

            {/* Student Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-gray-300">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="text-sm">Loading students…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
                        <GraduationCap className="w-10 h-10 text-gray-200" />
                        <p className="text-sm font-medium">
                            {search
                                ? "No students match your search."
                                : "No students registered yet."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Student
                                    </th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        School
                                    </th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                                        Grade
                                    </th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                                        Points
                                    </th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Favourite Food
                                    </th>
                                    <th className="px-4 py-3 text-center">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((student) => (
                                    <tr
                                        key={student.id}
                                        className="hover:bg-orange-50/30 transition-colors"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-bold text-orange-500">
                                                        {(student.name || "?")[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-gray-900">
                                                    {student.name || "—"}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-gray-500 max-w-[200px] truncate">
                                            {student.school || "—"}
                                        </td>

                                        <td className="px-5 py-4 text-center text-gray-500">
                                            {student.grade
                                                ? `Grade ${student.grade}`
                                                : "—"}
                                        </td>

                                        <td className="px-5 py-4 text-center font-semibold text-blue-600">
                                            {student.totalPoints ?? 0}
                                        </td>

                                        <td className="px-5 py-4 text-gray-500">
                                            {student.favourite_food || "—"}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">

                                                {/* Reset Password */}
                                                <button
                                                    onClick={() => openModal(student)}
                                                    title="Reset Password"
                                                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                                >
                                                    <Lock size={18} />
                                                </button>

                                                {/* Edit Student */}
                                                <button
                                                    onClick={() => openEditModal(student)}
                                                    title="Edit Student"
                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition"
                                                >
                                                    <Pencil size={18} />
                                                </button>

                                                {/* Deactivate Student */}
                                                <button
                                                    onClick={() => setDeactivatingStudent(student)}
                                                    title="Deactivate Student"
                                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                                                >
                                                    <Trash2 size={18} />
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reset Password Modal */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => setModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                                <Lock className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">
                                    Reset Password
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                                    {modal.name}
                                </p>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="New temporary password"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/20 outline-none mb-3"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleReset();
                            }}
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={submitting || !newPassword.trim()}
                                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Set Password"
                                )}
                            </button>

                            <button
                                onClick={() => setModal(null)}
                                disabled={submitting}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">

                        <h2 className="text-xl font-bold mb-5">
                            Edit Student
                        </h2>

                        {(
                            [
                                ["Student Name", "name"],
                                ["Mobile Number", "mobile"],
                                ["Age", "age"],
                                ["Grade", "grade"],
                                ["School", "school"],
                                ["District", "district"],
                                ["Favourite Food", "favouriteFood"],
                            ] as const
                        ).map(([label, key]) => (
                            <div key={key} className="mb-3">
                                <label className="block text-sm font-medium mb-1">
                                    {label}
                                </label>

                                <input
                                    type={key === "age" ? "number" : "text"}
                                    value={editForm[key]}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            [key]: e.target.value,
                                        }))
                                    }
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                        ))}

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => setEditingStudent(null)}
                                disabled={editLoading}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleEditSubmit}
                                disabled={
                                    editLoading ||
                                    !editForm.name.trim() ||
                                    !editForm.mobile.trim()
                                }
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {editLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </span>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate Student Confirmation Modal */}
            {deactivatingStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Deactivate Student?
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Please confirm this action.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                            Are you sure you want to deactivate{" "}
                            <span className="font-semibold text-gray-900">
                                {deactivatingStudent.name}
                            </span>
                            ?
                        </p>

                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-5">
                            <p className="text-sm text-orange-800">
                                This student will no longer be able to log in.
                                Their reading history, quiz attempts, and reviews
                                will be preserved.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeactivatingStudent(null)}
                                disabled={deactivateLoading}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleDeactivate}
                                disabled={deactivateLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {deactivateLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deactivating...
                                    </>
                                ) : (
                                    "Yes, Deactivate"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
