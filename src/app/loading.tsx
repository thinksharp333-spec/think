import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#fffaf1]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-[#db3125]" />
                <h2 className="comic-title text-2xl text-[#111111] animate-pulse">Loading...</h2>
            </div>
        </div>
    );
}
