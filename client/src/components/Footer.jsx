import { Link } from 'react-router';

export default function Footer({ className = '' }) {
  return (
    <footer className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-charcoal-400 ${className}`}>
      <span>© {new Date().getFullYear()} StructureMyLearning</span>
      <nav className="flex gap-4">
        <Link className="hover:text-charcoal transition-colors" to="/privacy">Privacy</Link>
        <Link className="hover:text-charcoal transition-colors" to="/terms">Terms</Link>
        <Link className="hover:text-charcoal transition-colors" to="/contact">Contact</Link>
      </nav>
    </footer>
  );
}
