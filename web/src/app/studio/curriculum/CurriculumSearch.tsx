"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/design-system/primitives/Badge";
import styles from "./page.module.css";

type SearchResult = { id: string; name: string; source: "postgres" | "learning-commons"; standardCode?: string };

/**
 * Search-on-top-of-browse for `/studio/curriculum` -- browsing (the
 * chapter-grouped list in page.tsx) is the default view; this narrows
 * to a flat result list only once the teacher actually searches.
 * `source` label is rendered on every result per Design System §12.3's
 * "source-attribution badge" requirement -- today every result says
 * "MentorOS" since Learning Commons isn't connected, but the same
 * result shape and badge slot are what a mixed-source result list will
 * use once it is.
 */
export function CurriculumSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/curriculum?source=postgres&q=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      setResults(res.ok ? json.results : []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.searchBlock}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the curriculum…"
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {results !== null && (
        <div className={styles.searchResults}>
          {results.length === 0 ? (
            <p className={styles.body}>No matching concepts.</p>
          ) : (
            results.map((r) =>
              r.source === "postgres" ? (
                <Link key={r.id} href={`/studio/curriculum/${r.id}`} className={styles.resultRow}>
                  <span>{r.name}</span>
                  <span className={styles.resultMeta}>
                    {r.standardCode && <span className={styles.standardCode}>{r.standardCode}</span>}
                    <Badge variant="neutral">MentorOS</Badge>
                  </span>
                </Link>
              ) : (
                <div key={r.id} className={styles.resultRow}>
                  <span>{r.name}</span>
                  <span className={styles.resultMeta}>
                    {r.standardCode && <span className={styles.standardCode}>{r.standardCode}</span>}
                    <Badge variant="neutral">Learning Commons</Badge>
                  </span>
                </div>
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}
