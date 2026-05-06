import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-canvas text-charcoal">
      <header className="border-b border-charcoal/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-semibold tracking-tight">StructureMyLearning</Link>
          <nav className="flex items-center gap-3 text-sm">
            <NavLink className={({ isActive }) => isActive ? 'text-charcoal font-medium' : 'text-charcoal-400'} to="/">
              Dashboard
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? 'text-charcoal font-medium' : 'text-charcoal-400'} to="/guides/new">
              New Guide
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? 'text-charcoal font-medium' : 'text-charcoal-400'} to="/account">
              Account
            </NavLink>
            <button className="rounded-md border border-charcoal/15 px-3 py-1.5 text-charcoal-400 hover:text-charcoal" onClick={handleLogout}>
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
