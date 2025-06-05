import { useCallback, useEffect, useState } from "react"

export interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  document_ids: string[];
  confidence_score: number;
  feedback_rating?: number;
}

export const useQAHistory = (limit: number = 10, offset: number = 0) => {
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/qa/history?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
};