// electron-app/renderer/components/panels/NewsPanel/NewsPanel.tsx
/**
 * NewsPanel — headlines + sentiment for any symbol.
 *
 * Polls GET /api/news/{symbol} every 30 s.
 * Shows headline, source, timestamp, and colour-coded sentiment badge.
 * Ported from existing NewsFeed.jsx + CompanyNews.jsx.
 */

import React, { useCallback, useEffect, useState } from "react";
import styles from "./NewsPanel.module.css";

const API_BASE      = "http://localhost:8000";
const POLL_INTERVAL = 30_000; // ms

interface NewsItem {
  id:        string;
  title:     string;
  summary:   string;
  source:    string;
  url:       string;
  published: string;
  sentiment: "positive" | "negative" | "neutral";
  symbol:    string;
}

interface NewsPanelProps {
  symbol: string;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ symbol }) => {
  const [items,   setItems]   = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/news/${symbol}?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NewsItem[] = await res.json();
      setItems(data);
      setError(null);
    } catch (e: unknown) {
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setItems([]);
    fetchNews();
  }, [fetchNews]);

  // Poll every 30 s
  useEffect(() => {
    const id = setInterval(fetchNews, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNews]);

  if (loading) return <div className={styles.state}>Loading news…</div>;
  if (error)   return <div className={`${styles.state} ${styles.err}`}>{error}</div>;
  if (!items.length) return <div className={styles.state}>No news available.</div>;

  return (
    <div className={styles.root} data-panel-id="news">
      {items.map((item) => (
        <article key={item.id || item.title} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={`${styles.sentiment} ${styles[item.sentiment]}`}>
              {item.sentiment === "positive" ? "▲" : item.sentiment === "negative" ? "▼" : "●"}
              {" "}{item.sentiment}
            </span>
            <span className={styles.source}>{item.source}</span>
            <span className={styles.ts}>{formatDate(item.published)}</span>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={styles.headline}
            title={item.title}
          >
            {item.title}
          </a>
          {item.summary && (
            <p className={styles.summary}>{item.summary}</p>
          )}
        </article>
      ))}
    </div>
  );
};

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month:  "short", day: "numeric",
      hour:   "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
