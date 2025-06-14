// src/pages/index.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ResidentQuery } from "@/types/schema";

export default function Home() {
  const [queries, setQueries] = useState<ResidentQuery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) load existing queries
    supabase
      .from("queries")
      .select("*")
      .order("submittedAt", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Error loading queries:", error);
        else setQueries(data as ResidentQuery[]);
        setLoading(false);
      });

    // 2) subscribe to new INSERT events on the 'queries' table
    const channel = supabase
      .channel("public:queries") // channel name can be anything unique
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "queries" },
        (payload) => {
          // payload.new contains the inserted row
          const newRow = payload.new as ResidentQuery;
          setQueries((prev) => [newRow, ...prev]);
        }
      )
      .subscribe();

    // 3) cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="p-8">Loading…</div>;
  if (queries.length === 0) return <div className="p-8">No requests yet.</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Council Requests</h1>
      {queries.map((q) => (
        <div
          key={q.id}
          className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
        >
          <p>
            <strong>When:</strong>{" "}
            {new Date(q.submittedAt).toLocaleString()}
          </p>
          <p>
            <strong>From:</strong> {q.phone}
          </p>
          <p>
            <strong>Category:</strong> {q.category}
          </p>
          <p>
            <strong>Message:</strong> {q.message}
          </p>
          <p>
            <strong>Action:</strong> {q.recommendedAction}
          </p>
        </div>
      ))}
    </div>
  );
}
