import { Outlet, NavLink } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/resume', label: 'Resume' },
  { to: '/ats', label: 'ATS' },
  { to: '/tailor', label: 'Tailor' },
  { to: '/cover-letter', label: 'Cover Letter' },
  { to: '/email', label: 'Email' },
  { to: '/applications', label: 'Applications' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin', label: 'Admin' },
];

export default function MainLayout() {
  const { mode, toggleTheme } = useThemeContext();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="container-shell flex items-center justify-between py-4">
          <div>
            <p className="text-lg font-semibold">AI Resume Maker</p>
            <p className="text-sm text-slate-400">Career tools workspace</p>
          </div>
          <nav className="hidden gap-3 md:flex">
            {navItems.slice(0, 6).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm transition ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={toggleTheme} color="inherit" size="small">
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
            <NavLink to="/login" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Login
            </NavLink>
            <NavLink to="/register" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              Register
            </NavLink>
          </div>
        </div>
      </header>

      <div className="container-shell grid gap-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Navigation</p>
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm transition ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
