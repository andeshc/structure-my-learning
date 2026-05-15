import {
  BookOpenCheck,
  Home,
  LogOut,
  PlusCircle,
  UserRound,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

function navClass({ isActive }) {
  return [
    'flex h-14 items-center gap-4 rounded-lg px-5 text-[15px] font-medium transition',
    isActive
      ? 'border border-blue-200 bg-blue-50 text-blue-700'
      : 'text-slate-700 hover:bg-slate-50 hover:text-blue-700',
  ].join(' ');
}

export default function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-950">
      <div className="w-full bg-white lg:grid lg:h-screen lg:grid-cols-[340px_1fr] lg:overflow-hidden">
        <aside className="hidden border-r border-slate-200 bg-[#fffdfa] px-7 py-8 lg:flex lg:flex-col lg:overflow-y-auto">
          <Link to="/" className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <BookOpenCheck size={40} strokeWidth={2.1} />
            </span>
            <span className="leading-none">
              <span className="block text-3xl font-bold">Structure</span>
              <span className="block text-3xl font-bold"><span className="text-blue-700">My</span>Learning</span>
            </span>
          </Link>

          <nav className="mt-14 grid gap-4">
            <NavLink className={navClass} to="/">
              <Home size={27} fill="currentColor" strokeWidth={2.2} />
              Dashboard
            </NavLink>
            <NavLink className={navClass} to="/guides/new">
              <PlusCircle size={28} strokeWidth={2.2} />
              New Guide
            </NavLink>
            <NavLink className={navClass} to="/account">
              <UserRound size={28} strokeWidth={2.2} />
              Account
            </NavLink>
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-5">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-red-200 hover:text-red-700" onClick={handleLogout}>
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </aside>

        <div className="min-w-0 lg:overflow-y-auto">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <BookOpenCheck className="text-blue-700" size={28} />
              Structure<span className="text-blue-700">My</span>Learning
            </Link>
            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={handleLogout}>Log out</button>
          </header>
          <main className="px-5 py-7 sm:px-8 lg:px-16 lg:py-12">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
