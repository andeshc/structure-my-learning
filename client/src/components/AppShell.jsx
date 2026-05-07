import {
  Bot,
  BookOpenCheck,
  Flame,
  Home,
  LogOut,
  Medal,
  MessageSquare,
  PlusCircle,
  UserRound,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

function navClass({ isActive }) {
  return [
    'flex h-14 items-center gap-4 rounded-lg px-5 text-[15px] font-semibold transition',
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
      <div className="min-h-screen w-full bg-white lg:grid lg:grid-cols-[340px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-[#fffdfa] px-7 py-8 lg:flex lg:flex-col">
          <Link to="/" className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <BookOpenCheck size={40} strokeWidth={2.1} />
            </span>
            <span className="leading-none">
              <span className="block text-3xl font-extrabold tracking-tight">Structure</span>
              <span className="block text-3xl font-extrabold tracking-tight"><span className="text-blue-700">My</span>Learning</span>
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

          <div className="mt-auto">
            <div className="rounded-xl border border-amber-200 bg-[#fffaf0] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold">Your AI tutor</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">I'm here to help you learn smarter.</p>
                </div>
                <span className="rounded-full bg-amber-100 p-2 text-amber-700">
                  <MessageSquare size={22} />
                </span>
              </div>
              <div className="mt-2 flex justify-center">
                <div className="relative">
                  <div className="absolute left-1/2 top-0 h-7 w-1 -translate-x-1/2 rounded-full bg-emerald-400" />
                  <div className="relative mt-5 grid h-20 w-24 place-items-center rounded-[28px] border-4 border-blue-100 bg-white">
                    <Bot className="text-blue-700" size={46} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-9 border-t border-slate-200 pt-7">
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="flex items-center gap-3">
                  <Flame className="text-orange-500" size={28} fill="currentColor" />
                  <div>
                    <p className="text-2xl font-extrabold text-orange-600">7</p>
                    <p className="text-xs text-slate-600">day streak</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-7">
                  <Medal className="text-amber-500" size={30} fill="currentColor" />
                  <div>
                    <p className="text-2xl font-extrabold">320</p>
                    <p className="text-xs text-slate-600">points</p>
                  </div>
                </div>
              </div>
              <button className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-red-200 hover:text-red-700" onClick={handleLogout}>
                <LogOut size={18} />
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
            <Link to="/" className="flex items-center gap-2 font-extrabold">
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
