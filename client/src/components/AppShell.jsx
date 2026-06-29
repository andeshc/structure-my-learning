import {
  Compass,
  Home,
  LogOut,
  PlusCircle,
  UserRound,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import Logo from './Logo';

function navClass({ isActive }) {
  return [
    'flex h-14 items-center gap-4 rounded-lg px-5 text-[15px] font-medium transition',
    isActive
      ? 'border border-teal-200 bg-teal-100/60 text-teal-800'
      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800',
  ].join(' ');
}

function tabClass({ isActive }) {
  return [
    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors',
    isActive ? 'text-teal-700' : 'text-slate-400',
  ].join(' ');
}

export default function AppShell() {
  const auth = useAuth();
  const { pathname } = useLocation();

  const isShareSubtopic = /^\/share\/[^/]+\/topics\//.test(pathname);
  const hideSidebar = pathname.startsWith('/topics/') || isShareSubtopic;
  const hideFooter = pathname.startsWith('/topics/') || pathname.startsWith('/guides/') || isShareSubtopic;
  const hideBottomNav = pathname.startsWith('/topics/') || isShareSubtopic;
  // On mobile the logout control lives only on the Account page; the mobile
  // header stays minimal elsewhere (desktop keeps its own logout in the sidebar).
  const showMobileLogout = pathname.startsWith('/account');

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
              <NavLink className={navClass} to="/discover">
                <Compass size={27} strokeWidth={2.2} />
                Discover
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
            <Link to="/dashboard">
              <Logo className="h-7 w-auto" />
            </Link>
            {showMobileLogout && (
              <button className="rounded-md border border-teal-100 px-3 py-2 text-sm font-semibold text-slate-500" onClick={handleLogout}>Log out</button>
            )}
          </header>
          <main className={`flex-1 px-5 py-7 sm:px-8 lg:px-16 lg:py-12 ${hideBottomNav ? '' : 'pb-24 lg:pb-12'}`}>
            <Outlet />
          </main>
          {!hideFooter && <Footer className="border-t border-slate-200" />}
        </div>
      </div>

      {/* Bottom tab bar — mobile only, hidden on immersive pages */}
      {!hideBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-teal-100 lg:hidden"
          style={{ backgroundColor: '#f0fdfa' }}
        >
          <NavLink className={tabClass} to="/dashboard">
            <Home size={22} strokeWidth={2.2} />
            Dashboard
          </NavLink>
          <NavLink className={tabClass} to="/discover">
            <Compass size={22} strokeWidth={2.2} />
            Discover
          </NavLink>
          <NavLink className={tabClass} to="/guides/new">
            <PlusCircle size={22} strokeWidth={2.2} />
            New
          </NavLink>
          <NavLink className={tabClass} to="/account">
            <UserRound size={22} strokeWidth={2.2} />
            Account
          </NavLink>
        </nav>
      )}
    </div>
  );
}
