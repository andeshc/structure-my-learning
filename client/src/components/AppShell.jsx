import { BookOpen, LayoutDashboard, LogOut, Plus, UserRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { BrandMark } from './BrandMark';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/guides/new', label: 'New Guide', icon: Plus },
  { to: '/account', label: 'Account', icon: UserRound }
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="hidden rounded-lg border border-line bg-white p-6 shadow-soft lg:block">
          <BrandMark />
          <nav className="mt-10 grid gap-2 text-sm font-bold text-slate-600">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 ${
                      isActive ? 'bg-blue-50 text-primary' : 'hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-24 rounded-lg border border-amber/40 bg-amber/10 p-4">
            <BookOpen className="mb-3 text-amber" size={22} />
            <p className="font-bold">Your AI tutor</p>
            <p className="mt-1 text-sm text-slate-600">Build a learning path and keep your progress close.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={19} />
            Log out
          </button>
        </aside>

        <main className="min-w-0 pb-24 lg:pb-0">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-line bg-white p-4 shadow-soft lg:hidden">
            <BrandMark />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-primary">
              {user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-4 bottom-4 grid grid-cols-3 rounded-lg border border-line bg-white p-2 shadow-soft lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                  isActive ? 'bg-blue-50 text-primary' : 'text-slate-500'
                }`
              }
            >
              <Icon size={19} />
              {item.label.replace(' Guide', '')}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
