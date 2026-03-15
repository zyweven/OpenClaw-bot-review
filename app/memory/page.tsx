"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface MemoryStats {
  total: number;
  byCategory?: Record<string, number>;
  byTier?: Record<string, number>;
  error?: string;
}

interface Memory {
  id: string;
  text: string;
  category: string;
  importance: number;
  timestamp?: number;
  tier?: string;
  scope?: string;
}

interface MemoryListResponse {
  memories: Memory[];
  total?: number;
  error?: string;
}

interface MemorySearchResponse {
  memories: Memory[];
  query?: string;
  error?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  fact: "#3b82f6",
  preference: "#10b981",
  decision: "#f59e0b",
  entity: "#8b5cf6",
  reflection: "#ec4899",
  other: "#6b7280",
};

const TIER_COLORS: Record<string, string> = {
  core: "#ef4444",
  working: "#f59e0b",
  peripheral: "#6b7280",
};

export default function MemoryPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  // Fetch stats
  useEffect(() => {
    fetch("/api/memory/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Fetch memories
  const fetchMemories = async (reset = false) => {
    if (reset) {
      setPage(0);
      setMemories([]);
    }
    
    setLoading(true);
    const offset = reset ? 0 : page * limit;
    
    try {
      let url = `/api/memory/list?limit=${limit}&offset=${offset}`;
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }
      
      const res = await fetch(url);
      const data: MemoryListResponse = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        if (reset) {
          setMemories(data.memories || []);
        } else {
          setMemories((prev) => [...prev, ...(data.memories || [])]);
        }
        setHasMore((data.memories || []).length === limit);
        if (!reset) setPage((p) => p + 1);
        else setPage(1);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMemories(true);
  }, [selectedCategory]);

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMemories(true);
      return;
    }
    
    setIsSearching(true);
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(searchQuery)}&limit=50`);
      const data: MemorySearchResponse = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setMemories(data.memories || []);
        setHasMore(false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Format timestamp
  const formatTime = (ts?: number) => {
    if (!ts) return "-";
    const date = new Date(ts);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Truncate text
  const truncate = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "...";
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">🧠 {t("memory.title")}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {t("memory.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && !stats.error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.totalMemories")}</div>
            <div className="text-2xl font-bold text-[var(--text)]">{stats.total}</div>
          </div>
          
          {/* Category breakdown */}
          {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] col-span-2">
              <div className="text-xs text-[var(--text-muted)] mb-2">{t("memory.byCategory")}</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byCategory).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[cat] || "#6b7280"}20`,
                      color: CATEGORY_COLORS[cat] || "#6b7280",
                    }}
                  >
                    {cat}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Tier breakdown */}
          {stats.byTier && Object.keys(stats.byTier).length > 0 && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="text-xs text-[var(--text-muted)] mb-2">{t("memory.byTier")}</div>
              <div className="space-y-1">
                {Object.entries(stats.byTier).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between text-xs">
                    <span style={{ color: TIER_COLORS[tier] || "#6b7280" }}>{tier}</span>
                    <span className="text-[var(--text)]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("memory.searchPlaceholder")}
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleSearch}
            disabled={loading || isSearching}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {isSearching ? t("common.loading") : t("memory.search")}
          </button>
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">{t("memory.allCategories")}</option>
          <option value="fact">fact</option>
          <option value="preference">preference</option>
          <option value="decision">decision</option>
          <option value="entity">entity</option>
          <option value="reflection">reflection</option>
          <option value="other">other</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Memory List */}
      {loading && memories.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-[var(--text-muted)]">{t("common.loading")}</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-[var(--text-muted)]">{t("memory.noData")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-left">
                  <th className="px-4 py-3 font-medium">{t("memory.id")}</th>
                  <th className="px-4 py-3 font-medium">{t("memory.content")}</th>
                  <th className="px-4 py-3 font-medium">{t("memory.category")}</th>
                  <th className="px-4 py-3 font-medium">{t("memory.importance")}</th>
                  <th className="px-4 py-3 font-medium">{t("memory.timestamp")}</th>
                </tr>
              </thead>
              <tbody>
                {memories.map((mem) => (
                  <tr
                    key={mem.id}
                    onClick={() => setSelectedMemory(mem)}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg)] cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {mem.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text)]">
                      {truncate(mem.text, 80)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[mem.category] || "#6b7280"}20`,
                          color: CATEGORY_COLORS[mem.category] || "#6b7280",
                        }}
                      >
                        {mem.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text)]">
                      {(mem.importance * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                      {formatTime(mem.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Load More */}
          {hasMore && !searchQuery && (
            <div className="p-4 text-center border-t border-[var(--border)]">
              <button
                onClick={() => fetchMemories(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition disabled:opacity-50"
              >
                {loading ? t("common.loading") : t("memory.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMemory(null)}
        >
          <div
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text)]">
                {t("memory.detail")}
              </h3>
              <button
                onClick={() => setSelectedMemory(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.id")}</div>
                <div className="font-mono text-sm text-[var(--text)]">{selectedMemory.id}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.category")}</div>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[selectedMemory.category] || "#6b7280"}20`,
                    color: CATEGORY_COLORS[selectedMemory.category] || "#6b7280",
                  }}
                >
                  {selectedMemory.category}
                </span>
              </div>
              {selectedMemory.tier && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.tier")}</div>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${TIER_COLORS[selectedMemory.tier] || "#6b7280"}20`,
                      color: TIER_COLORS[selectedMemory.tier] || "#6b7280",
                    }}
                  >
                    {selectedMemory.tier}
                  </span>
                </div>
              )}
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.importance")}</div>
                <div className="text-[var(--text)]">{(selectedMemory.importance * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.timestamp")}</div>
                <div className="text-[var(--text)]">{formatTime(selectedMemory.timestamp)}</div>
              </div>
              {selectedMemory.scope && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.scope")}</div>
                  <div className="text-[var(--text)]">{selectedMemory.scope}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">{t("memory.content")}</div>
                <div className="text-[var(--text)] whitespace-pre-wrap bg-[var(--bg)] rounded-lg p-3 text-sm">
                  {selectedMemory.text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
