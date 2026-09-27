import React, { useState, useEffect } from 'react';
import { User, SessionBooking, Dispute, SkillItem } from './types';
import { Navbar } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { SmartMatchTab } from './components/SmartMatchTab';
import { MarketplaceTab } from './components/MarketplaceTab';
import { SessionsTab } from './components/SessionsTab';
import { LedgerTab } from './components/LedgerTab';
import { AdminDisputesTab } from './components/AdminDisputesTab';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { audioEngine } from './utils/audio';

export const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<SessionBooking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      const [usersRes, bookingsRes, disputesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/bookings'),
        fetch('/api/disputes'),
      ]);

      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        setAllUsers(users);
        // Default to Aryan (the student featured in the prompt!)
        const aryan = users.find((u) => u.id === 'usr_aryan') || users[0];
        setCurrentUser(aryan);
      }

      if (bookingsRes.ok) {
        const b = await bookingsRes.json();
        setBookings(b);
      }

      if (disputesRes.ok) {
        const d = await disputesRes.json();
        setDisputes(d);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    audioEngine.playNotification();
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshUser = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}`);
      if (res.ok) {
        const updated = await res.json();
        setCurrentUser(updated);
        setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const list = await res.json();
        setBookings(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDisputes = async () => {
    try {
      const res = await fetch('/api/disputes');
      if (res.ok) {
        const list = await res.json();
        setDisputes(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refreshUser(), refreshBookings(), refreshDisputes()]);
  };

  const handleBookSession = async (
    helperId: string,
    skillName: string,
    skillCategory: string,
    durationMinutes: number,
    scheduledAt: string,
    description: string
  ) => {
    if (!currentUser) return;

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterId: currentUser.id,
        helperId,
        skillName,
        skillCategory,
        durationMinutes,
        scheduledAt,
        description,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to book session');
    }

    showToast(`✅ Session booked! ${durationMinutes} credits locked in escrow.`);
    await refreshAll();
    setActiveTab('sessions');
  };

  const handleAddSkill = async (
    userId: string,
    type: 'offered' | 'needed',
    skill: SkillItem
  ) => {
    if (!currentUser) return;
    const userToUpdate = allUsers.find((u) => u.id === userId);
    if (!userToUpdate) return;

    const updatedOffered =
      type === 'offered'
        ? [...userToUpdate.skillsOffered, skill]
        : userToUpdate.skillsOffered;
    const updatedNeeded =
      type === 'needed'
        ? [...userToUpdate.skillsNeeded, skill]
        : userToUpdate.skillsNeeded;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillsOffered: updatedOffered,
          skillsNeeded: updatedNeeded,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setCurrentUser(saved);
        setAllUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
        showToast(`Skill "${skill.name}" successfully added!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDisputesCount = disputes.filter(
    (d) => d.status === 'OPEN' || d.status === 'UNDER_INVESTIGATION'
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white tracking-wide">Initializing TimeBank...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying cryptographic ledger chain</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 border border-emerald-500/50 shadow-2xl text-xs font-semibold text-white flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={(u) => setCurrentUser(u)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openDisputesCount={openDisputesCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser && activeTab === 'dashboard' && (
          <DashboardTab
            currentUser={currentUser}
            onNavigateTab={setActiveTab}
            bookings={bookings}
            allUsers={allUsers}
            onAddSkill={handleAddSkill}
          />
        )}

        {currentUser && activeTab === 'smart-match' && (
          <SmartMatchTab
            currentUser={currentUser}
            allUsers={allUsers}
            onBookSession={handleBookSession}
          />
        )}

        {currentUser && activeTab === 'marketplace' && (
          <MarketplaceTab
            currentUser={currentUser}
            allUsers={allUsers}
            onBookSession={handleBookSession}
          />
        )}

        {currentUser && activeTab === 'sessions' && (
          <SessionsTab
            currentUser={currentUser}
            allUsers={allUsers}
            bookings={bookings}
            onRefreshBookings={refreshBookings}
            onRefreshUser={refreshUser}
          />
        )}

        {activeTab === 'ledger' && <LedgerTab />}

        {currentUser && activeTab === 'disputes' && (
          <AdminDisputesTab
            currentUser={currentUser}
            allUsers={allUsers}
            onRefreshAll={refreshAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>
          TimeBank — Trade Time Instead of Money • 1 Hour Given = 1 Hour Earned • Decentralized Campus Economy
        </p>
        <p className="mt-1 font-mono text-[11px] text-slate-600">
          Powered by SHA-256 Tamper-Evident Transaction Ledger & Matching Engine
        </p>
      </footer>
    </div>
  );
};
