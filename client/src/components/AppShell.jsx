import {
  Home,
  LogOut,
  PlusCircle,
  UserRound,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import Logo from './Logo';
import LogoMark from './LogoMark';

function navClass({ isActive }) {
  return [
    'flex h-14 items-center gap-4 rounded-lg px-5 text-[15px] font-medium transition',
    isActive
      ? 'border border-teal-200 bg-teal-100/60 text-teal-800'
      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800',
  ].join(' ');
}

export default function AppShell() {
  const auth = useAuth();
  const { pathname } = useLocation();

  // Hide sidebar on subtopic pages — those have their own full-outline navigation
  const hideSidebar = pathname.startsWith('/topics/');
  const hideFooter = pathname.startsWith('/topics/') || pathname.startsWith('/guides/');

  async function handleLogout() {
    await auth.signOut();
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-950">
      <div className="w-full bg-white lg:flex lg:h-screen lg:overflow-hidden">
        {/* Sidebar — animates out on guide/subtopic pages */}
        <aside
          className={`hidden shrink-0 border-r border-teal-100 lg:flex lg:flex-col lg:overflow-hidden transition-[width] duration-300 ease-in-out ${
            hideSidebar ? 'lg:w-0' : 'lg:w-60'
          }`}
          style={{ backgroundColor: '#f0fdfa' }}
        >
          {/* Fixed-width inner panel so content clips cleanly during width animation */}
          <div
            className={`flex w-60 shrink-0 flex-col overflow-y-auto px-5 py-6 transition-opacity duration-200 ${
              hideSidebar ? 'opacity-0' : 'opacity-100'
            } h-full`}
          >
            <Link to="/dashboard">
              <Logo className="w-full" />
            </Link>

            <nav className="mt-14 grid gap-4">
              <NavLink className={navClass} to="/dashboard">
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

            <div className="mt-auto border-t border-teal-100 pt-5">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-100 px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col lg:flex-1 lg:overflow-y-auto">
          <header className="flex items-center justify-between border-b border-teal-100 px-5 py-4 lg:hidden" style={{ backgroundColor: '#f0fdfa' }}>
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-charcoal">
              <LogoMark className="h-7 w-auto" />
              Structure<span className="text-teal-700">My</span>Learning
            </Link>
            <button className="rounded-md border border-teal-100 px-3 py-2 text-sm font-semibold text-slate-500" onClick={handleLogout}>Log out</button>
          </header>
          <main className="flex-1 px-5 py-7 sm:px-8 lg:px-16 lg:py-12">
            <Outlet />
          </main>
          {!hideFooter && <Footer className="border-t border-slate-200" />}
        </div>
      </div>
    </div>
  );
}
