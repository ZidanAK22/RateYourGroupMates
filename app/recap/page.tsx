"use client";

import { useEffect, useState } from "react";
// Make sure this path is correct for your project structure
// import { createClient } from "@/lib/supabase/client"; 
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // Using generic client for demonstration
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    Row,
    Cell,
    Header,
} from "@tanstack/react-table";

// --- TYPE DEFINITIONS ---
// This interface defines the shape of the data after processing, ready for the table.
interface RecapRow {
    group_id: string;
    group_name: string;
    ratee_id: string;
    ratee_name: string;
    rater_id: string;
    rater_name: string;
    rating_score: number;
    rating_comment: string | null;
    created_at: string;
}

// This interface represents the raw, nested data structure directly from the Supabase query.
interface RawRatingRow {
    rating_id: number;
    rater_id: string;
    ratee_id: string;
    rating_score: number;
    rating_comment: string | null;
    created_at: string;
    rater: {
        nrp: string;
        full_name: string;
        group_id: string;
        group: { group_id: string; group_name: string } | null;
    };
    ratee: {
        nrp: string;
        full_name: string;
        group_id: string;
        group: { group_id: string; group_name: string } | null;
    };
}


// --- TABLE COLUMN DEFINITIONS ---
// Defines the columns for the TanStack React Table, linking data keys to headers.
const columns: ColumnDef<RecapRow>[] = [
    { accessorKey: "group_id", header: "Group ID" },
    { accessorKey: "group_name", header: "Group Name" },
    { accessorKey: "ratee_id", header: "Ratee NRP" },
    { accessorKey: "ratee_name", header: "Ratee Name" },
    { accessorKey: "rater_id", header: "Rater NRP" },
    { accessorKey: "rater_name", header: "Rater Name" },
    { accessorKey: "rating_score", header: "Score" },
    { accessorKey: "rating_comment", header: "Comment" },
    {
        accessorKey: "created_at",
        header: "Timestamp",
        // Custom cell renderer to format the date string into a more readable format.
        cell: ({ getValue }) => {
            const value = getValue() as string;
            if (!value) return null;
            try {
                const date = new Date(value);
                // Format: YYYY-MM-DD HH:mm
                const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
                return <span>{formatted}</span>;
            } catch (e) {
                return <span>Invalid Date</span>
            }
        },
    },
];


// --- REACT COMPONENT ---
export default function RecapPage() {
    // State for the final, processed data to be displayed in the table.
    const [data, setData] = useState<RecapRow[]>([]);
    // State to manage the loading indicator.
    const [loading, setLoading] = useState(true);
    // State to store and display any potential errors from the data fetch.
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Mock Supabase client for demonstration if the real one isn't available.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "your-supabase-url";
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-supabase-key";

        // A function to check if the Supabase client is properly configured.
        const createDemoClient = (): SupabaseClient | null => {
            if (supabaseUrl === "your-supabase-url" || supabaseKey === "your-supabase-key") {
                return null;
            }
            // This would be your actual createClient() call
            return createClient(supabaseUrl, supabaseKey);
        };

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            const supabase = createDemoClient();

            if (!supabase) {
                setError("Supabase client is not configured. Please check your environment variables.");
                setData([]); // Clear data if client is not configured
                setLoading(false);
                return;
            }

            // Fetch all peer_ratings with joined group and participant info.
            // THE FIX: Use .returns<RawRatingRow[]>() to tell the Supabase client
            // what the expected return type is. This strongly types the `data`
            // variable, removing the need for `any` and fixing the ESLint error.
            const { data: rawData, error: fetchError } = await supabase
                .from("peer_ratings")
                .select(`
                    rating_id,
                    rater_id,
                    ratee_id,
                    rating_score,
                    rating_comment,
                    created_at,
                    rater:participants!peer_ratings_rater_id_fkey(nrp, full_name, group_id, group:project_groups(group_id, group_name)),
                    ratee:participants!peer_ratings_ratee_id_fkey(nrp, full_name, group_id, group:project_groups(group_id, group_name))
                `)
                .returns<RawRatingRow[]>(); // This is the key change!

            if (fetchError) {
                setError(fetchError.message);
                setLoading(false);
                return;
            }

            if (!rawData) {
                setData([]);
                setLoading(false);
                return;
            }

            // --- DATA PROCESSING ---
            // Only keep the latest review for each unique (rater_id, ratee_id) pair.
            const latestMap = new Map<string, RawRatingRow>();

            // No need for type casting here because `rawData` is now correctly typed.
            for (const row of rawData) {
                const key = `${row.rater_id}-${row.ratee_id}`;
                const existing = latestMap.get(key);
                if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
                    latestMap.set(key, row);
                }
            }

            // Prepare the flat rows for the table from the processed map.
            const rows: RecapRow[] = Array.from(latestMap.values()).map((row) => {
                // Prefer group info from the ratee, but fallback to the rater's group if needed.
                const group = row.ratee.group || row.rater.group || { group_id: "N/A", group_name: "N/A" };
                return {
                    group_id: group.group_id,
                    group_name: group.group_name,
                    ratee_id: row.ratee.nrp,
                    ratee_name: row.ratee.full_name,
                    rater_id: row.rater.nrp,
                    rater_name: row.rater.full_name,
                    rating_score: row.rating_score,
                    rating_comment: row.rating_comment,
                    created_at: row.created_at,
                };
            });

            // Sort by group_id first, then by ratee_id for consistent ordering.
            rows.sort((a, b) => {
                if (a.group_id !== b.group_id) return a.group_id.localeCompare(b.group_id);
                return a.ratee_id.localeCompare(b.ratee_id);
            });

            setData(rows);
            setLoading(false);
        };

        fetchData();
    }, []);

    // Initialize the React Table instance.
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-4 md:p-8 bg-gray-900 text-white min-h-screen font-sans">
            <h1 className="text-3xl font-bold mb-6 text-center">Peer Ratings Recap</h1>
            {loading ? (
                <div className="text-center py-10">Loading data...</div>
            ) : error ? (
                <div className="text-red-500 bg-red-100 border border-red-500 rounded p-4 text-center">Error: {error}</div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-lg">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-800">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header: Header<RecapRow, unknown>) => (
                                        <th key={header.id} className="border-b border-gray-700 px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="bg-gray-800/50">
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                                        No data available.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row: Row<RecapRow>) => (
                                    <tr key={row.id} className="hover:bg-gray-700/50 transition-colors duration-200">
                                        {row.getVisibleCells().map((cell: Cell<RecapRow, unknown>) => (
                                            <td key={cell.id} className="border-t border-gray-700 px-4 py-3 text-gray-300 text-sm">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
