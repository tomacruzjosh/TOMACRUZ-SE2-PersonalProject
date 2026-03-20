import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LogOut, User as UserIcon, BookOpen, Search, Monitor, PenTool, CheckCircle2, ShieldAlert } from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard';

const VISIT_REASONS = [
  { id: 'Reading', label: 'Reading', icon: BookOpen },
  { id: 'Research', label: 'Research', icon: Search },
  { id: 'Computer Use', label: 'Computer Use', icon: Monitor },
  { id: 'Studying', label: 'Studying', icon: PenTool },
];

export default function Dashboard() {
  const { appUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || !appUser) return;

    try {
      setIsSubmitting(true);
      setError('');

      await addDoc(collection(db, 'logs'), {
        uid: appUser.uid,
        userEmail: appUser.email,
        college_office: appUser.college_office || 'Unknown',
        reason: selectedReason,
        timestamp: serverTimestamp(),
      });

      setCheckedIn(true);
    } catch (err: any) {
      console.error('Error logging visit:', err);
      setError('Failed to log your visit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              NL
            </div>
            <span className="font-semibold text-slate-900">NEU Library</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
              <UserIcon size={16} />
              <span>{appUser?.fullName}</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-medium">
                {appUser?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {appUser?.role === 'admin' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-slate-900">
                Admin Dashboard
              </h1>
              <p className="text-slate-600">
                Welcome back, {appUser?.fullName}
              </p>
            </div>
            <AdminDashboard />
          </div>
        ) : appUser?.isBlocked ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-8 md:p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <ShieldAlert size={40} />
              </div>
              <h1 className="text-3xl font-bold text-red-900 mb-4">
                Access Denied
              </h1>
              <p className="text-lg text-red-700 mb-8">
                Your account has been blocked from checking in. Please contact the Library Admin for assistance.
              </p>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 bg-red-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-red-700 transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {!checkedIn ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold text-slate-900 mb-3">
                    Library Check-in
                  </h1>
                  <p className="text-slate-500">
                    Hello, {appUser?.fullName}. Please select your reason for visiting the library today.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-8">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCheckIn}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {VISIT_REASONS.map((reason) => {
                      const Icon = reason.icon;
                      const isSelected = selectedReason === reason.id;
                      return (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() => setSelectedReason(reason.id)}
                          className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={32} className={`mb-3 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="font-medium">{reason.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedReason}
                    className="w-full bg-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isSubmitting ? 'Logging visit...' : 'Check In'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center transform transition-all animate-in fade-in zoom-in duration-500">
                <div className="mx-auto w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8">
                  <CheckCircle2 size={48} />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                  Welcome to NEU Library!
                </h1>
                <p className="text-xl text-slate-600 mb-10">
                  Your visit for <span className="font-semibold text-indigo-600">{selectedReason}</span> has been successfully logged.
                </p>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-medium py-3 px-6 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
