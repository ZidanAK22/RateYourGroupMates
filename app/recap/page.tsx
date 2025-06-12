"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";

// Types for the joined data
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

const columns: ColumnDef<RecapRow>[] = [
    { accessorKey: "group_id", header: "Group ID" },
    { accessorKey: "group_name", header: "Group Name" },
    { accessorKey: "ratee_id", header: "Ratee NRP" },
    { accessorKey: "ratee_name", header: "Ratee Name" },
    { accessorKey: "rater_id", header: "Rater NRP" },
    { accessorKey: "rater_name", header: "Rater Name" },
    { accessorKey: "rating_score", header: "Score" },
    { accessorKey: "rating_comment", header: "Comment" },
    { accessorKey: "created_at", header: "Timestamp" },
];

export default function RecapPage() {
    const [data, setData] = useState<RecapRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const supabase = createClient();
            // Fetch all peer_ratings with joined group and participant info
            // We'll filter for latest review per (rater_id, ratee_id) in JS for now
            const { data, error } = await supabase
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
        `);
            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }
            // Only keep the latest review for each (rater_id, ratee_id) pair
            const latestMap = new Map<string, RawRatingRow>();
            for (const row of (data as RawRatingRow[])) {
                const key = row.rater_id + "-" + row.ratee_id;
                if (!latestMap.has(key) || new Date(row.created_at) > new Date(latestMap.get(key)!.created_at)) {
                    latestMap.set(key, row);
                }
            }
            // Prepare rows for the table
            const rows: RecapRow[] = Array.from(latestMap.values()).map((row) => {
                // Prefer group from ratee, fallback to rater
                const group = row.ratee.group || row.rater.group || { group_id: "", group_name: "" };
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
            // Sort by group_id, then by ratee_id
            rows.sort((a, b) => {
                if (a.group_id !== b.group_id) return a.group_id.localeCompare(b.group_id);
                return a.ratee_id.localeCompare(b.ratee_id);
            });
            setData(rows);
            setLoading(false);
        };
        fetchData();
    }, []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Peer Ratings Recap</h1>
            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div className="text-red-500">Error: {error}</div>
            ) : (
                <div className="overflow-x-auto rounded border">
                    <table className="min-w-full border-collapse">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th key={header.id} className="border px-4 py-2 bg-gray-100">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-4">No data</td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="border px-4 py-2">
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
