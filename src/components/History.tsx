import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search } from 'lucide-react';

interface HistoryEntry {
  id: string;
  user_id: string;
  action: 'encode' | 'decode';
  file_name: string;
  message?: string;
  decoded_message?: string;
  created_at: string;
}

interface HistoryProps {
  userId: string;
  username: string;
  onBack: () => void;
}

export function History({ userId, onBack }: HistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleMessages, setVisibleMessages] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'encode' | 'decode'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUsername(data?.username || 'Unknown');
    } catch (error) {
      console.error('Error fetching username:', error);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') query = query.eq('action', filter);
      if (searchTerm) query = query.ilike('file_name', `%${searchTerm}%`);

      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, filter, searchTerm]);

  useEffect(() => {
    fetchUserProfile();
    fetchHistory();
  }, [fetchUserProfile, fetchHistory]);

  const toggleMessageVisibility = (id: string) => {
    setVisibleMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading history...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="w-full bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-black">History</h2>
              <p className="text-gray-500">Your encoding and decoding history</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              className="border rounded-lg p-2 text-gray-600"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All Actions</option>
              <option value="encode">Encode</option>
              <option value="decode">Decode</option>
            </select>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by filename..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-8 pr-2 py-2 border rounded-lg"
              />
              <Search className="w-5 h-5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <img
                src="https://via.placeholder.com/40" // Replace with actual profile picture URL
                alt="User profile"
                className="w-10 h-10 rounded-full"
              />
              <span className="text-gray-700">{username}</span>
            </div>
          </div>
        </div>

        <hr className="h-5" />

        {/* History Cards */}
        {history.length === 0 ? (
          <p className="text-center text-gray-500 text-lg">No history found.</p>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="bg-gray-50 p-4 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">
                    {entry.action.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">File: {entry.file_name}</p>
                {(entry.message || entry.decoded_message) && (
                  <p
                    className="text-gray-700 cursor-pointer mt-2 truncate"
                    onMouseEnter={() => toggleMessageVisibility(entry.id)}
                    onMouseLeave={() => toggleMessageVisibility(entry.id)}
                    title={entry.message || entry.decoded_message}
                  >
                    {entry.action === 'encode' && entry.message && (
                      <>Message: {visibleMessages[entry.id] ? entry.message : '***'}</>
                    )}
                    {entry.action === 'decode' && entry.decoded_message && (
                      <>Decoded: {visibleMessages[entry.id] ? entry.decoded_message : '***'}</>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}