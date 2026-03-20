import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Building2, PieChart, Search, Calendar, Clock, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';

type DateRange = 'today' | 'weekly' | 'monthly' | 'custom';

interface Log {
  id: string;
  uid: string;
  userEmail: string;
  college_office: string;
  reason: string;
  timestamp: Date;
}

interface SearchedUser {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  college_office: string;
  isBlocked: boolean;
  role: string;
}

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchEmail, setSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [searchedLogs, setSearchedLogs] = useState<Log[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [dateRange, customStart, customEnd]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let start = new Date();
      start.setHours(0, 0, 0, 0);
      let end = new Date();
      end.setHours(23, 59, 59, 999);

      if (dateRange === 'weekly') {
        start.setDate(start.getDate() - 7);
      } else if (dateRange === 'monthly') {
        start.setMonth(start.getMonth() - 1);
      } else if (dateRange === 'custom') {
        if (customStart) start = new Date(customStart);
        if (customEnd) {
          end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
        }
      }

      const q = query(
        collection(db, 'logs'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end))
      );

      const snapshot = await getDocs(q);
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Log[];
      
      // Sort descending on client to avoid composite index requirement
      fetchedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) {
      setSearchedUser(null);
      setSearchedLogs([]);
      setHasSearched(false);
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    try {
      // Search for user
      const userQ = query(collection(db, 'users'), where('email', '==', searchEmail.trim().toLowerCase()));
      const userSnap = await getDocs(userQ);
      
      if (!userSnap.empty) {
        const userData = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as SearchedUser;
        setSearchedUser(userData);
        
        // Search for logs
        const logsQ = query(collection(db, 'logs'), where('uid', '==', userData.uid));
        const logsSnap = await getDocs(logsQ);
        const fetchedLogs = logsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })) as Log[];
        
        fetchedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setSearchedLogs(fetchedLogs);
      } else {
        setSearchedUser(null);
        setSearchedLogs([]);
      }
    } catch (error) {
      console.error('Error searching user:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleBlockStatus = async () => {
    if (!searchedUser) return;
    try {
      const newStatus = !searchedUser.isBlocked;
      await updateDoc(doc(db, 'users', searchedUser.id), {
        isBlocked: newStatus
      });
      setSearchedUser({ ...searchedUser, isBlocked: newStatus });
    } catch (error) {
      console.error('Error updating block status:', error);
      alert('Failed to update block status.');
    }
  };

  // Calculate stats
  const totalVisitors = logs.length;
  
  const collegeCount: Record<string, number> = {};
  const reasonCount: Record<string, number> = {};
  
  logs.forEach(log => {
    collegeCount[log.college_office] = (collegeCount[log.college_office] || 0) + 1;
    reasonCount[log.reason] = (reasonCount[log.reason] || 0) + 1;
  });

  const mostCommonReason = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  
  const sortedColleges = Object.entries(collegeCount).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-slate-400" size={20} />
          <span className="font-medium text-slate-700">Date Range:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'weekly', 'monthly', 'custom'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                dateRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Start:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">End:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Visitors</p>
            <h3 className="text-3xl font-bold text-slate-900">
              {loading ? '...' : totalVisitors}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <PieChart size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Most Common Reason</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {loading ? '...' : mostCommonReason}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Building2 size={24} />
          </div>
          <div className="w-full">
            <p className="text-sm font-medium text-slate-500 mb-3">Top College/Office</p>
            {loading ? (
              <p className="text-slate-900 font-medium">...</p>
            ) : sortedColleges.length > 0 ? (
              <div className="space-y-2">
                {sortedColleges.slice(0, 2).map(([college, count]) => (
                  <div key={college} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate pr-2" title={college}>{college}</span>
                    <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-900 font-medium">N/A</p>
            )}
          </div>
        </div>
      </div>

      {/* User Search & Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">User Management & History</h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                placeholder="Search by institutional email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchEmail.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </form>
        </div>

        {hasSearched && (
          <div className="p-0">
            {isSearching ? (
              <div className="p-8 text-center text-slate-500">Searching...</div>
            ) : searchedUser ? (
              <div>
                {/* User Profile Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{searchedUser.fullName}</h3>
                    <p className="text-sm text-slate-600">{searchedUser.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-xs font-medium">
                        {searchedUser.college_office}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
                        {searchedUser.role}
                      </span>
                      {searchedUser.isBlocked && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-medium flex items-center gap-1">
                          <ShieldAlert size={12} /> Blocked
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {searchedUser.role !== 'admin' && (
                    <button
                      onClick={toggleBlockStatus}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        searchedUser.isBlocked
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {searchedUser.isBlocked ? (
                        <>
                          <ShieldCheck size={18} />
                          Unblock User
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={18} />
                          Block User
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Logs Table */}
                {searchedLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-200">
                          <th className="p-4 font-medium text-slate-600 text-sm">Date & Time</th>
                          <th className="p-4 font-medium text-slate-600 text-sm">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchedLogs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-sm text-slate-900">
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                {log.timestamp.toLocaleString()}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-slate-900">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-slate-400" />
                                {log.reason}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No visit history found for this user.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No user found with email "{searchEmail}".
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
