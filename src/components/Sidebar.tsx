import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// ── Inline SVG Icons ────────────────────────────────────────────────────────
const Icons = {
  Orders: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  Collections: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 3.5h12M1 7h12M1 10.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Attendance: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  DailyWorking: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 5.5h6M4 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  RateList: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v6M5.5 5.5h2.25a.75.75 0 0 1 0 1.5H6.25a.75.75 0 0 0 0 1.5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  RouteMaps: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5C5.07 1.5 3.5 3.07 3.5 5c0 2.63 3.5 7 3.5 7s3.5-4.37 3.5-7c0-1.93-1.57-3.5-3.5-3.5z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="5" r="1" fill="currentColor" />
    </svg>
  ),
  UserRights: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 6.5h2M4 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  LocationDistance: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 12l4-8 2 4 2-2 2 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Logo: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.95" />
      <rect x="7" y="1" width="5" height="5" rx="1" fill="white" opacity="0.55" />
      <rect x="1" y="7" width="5" height="5" rx="1" fill="white" opacity="0.55" />
      <rect x="7" y="7" width="5" height="5" rx="1" fill="white" opacity="0.25" />
    </svg>
  ),
  SignOut: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 4.5L12 7l-3 2.5M5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ── Sidebar items config ─────────────────────────────────────────────────────
const allSidebarItems = [
  { name: 'Orders',            icon: Icons.Orders,           path: '/orders',            screenKey: 'orders' },
  { name: 'Collections',       icon: Icons.Collections,      path: '/collections',       screenKey: 'collections' },
  { name: 'Attendance',        icon: Icons.Attendance,       path: '/attendance',        screenKey: 'attendance' },
  { name: 'Daily Working',     icon: Icons.DailyWorking,     path: '/images',            screenKey: 'images' },
  { name: 'Rate List',         icon: Icons.RateList,         path: '/ratelist',          screenKey: 'ratelist' },
  { name: 'Route Maps',        icon: Icons.RouteMaps,        path: '/location',          screenKey: 'location' },
  { name: 'User Rights',       icon: Icons.UserRights,       path: '/user-management',   screenKey: 'user-management' },
  { name: 'Location Distance', icon: Icons.LocationDistance, path: '/location-distance', screenKey: 'location-distance' },
];

// ── Component ────────────────────────────────────────────────────────────────
function Sidebar({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userType = localStorage.getItem('userType') || 'ADMIN';
  const allowedScreens = localStorage.getItem('allowedScreens') || '[]';

  let allowedScreensArray: string[] = [];
  try {
    allowedScreensArray = JSON.parse(allowedScreens);
    if (!Array.isArray(allowedScreensArray)) allowedScreensArray = [];
  } catch {
    allowedScreensArray = [];
  }

  const getFilteredItems = () => {
    if (userType === 'ADMIN') return allSidebarItems;
    return allSidebarItems.filter(item =>
      allowedScreensArray.some(s => s.toLowerCase() === item.screenKey.toLowerCase())
    );
  };

  const sidebarItems = getFilteredItems().map(item => ({
    ...item,
    isActive: location.pathname.startsWith(item.path),
  }));

  useEffect(() => {
    if (userType === 'OPERATOR') {
      const isAllowed = sidebarItems.some(item => location.pathname.startsWith(item.path));
      if (!isAllowed && location.pathname !== '/') {
        if (sidebarItems.length > 0) navigate(sidebarItems[0].path);
        else navigate('/');
      }
    }
  }, [location.pathname, userType]);

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('userType');
    localStorage.removeItem('allowedScreens');
    localStorage.removeItem('allowedLocations');
    navigate('/');
  };

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="w-screen h-screen flex"
    >
      {/* ── Sidebar ── */}
      <motion.div
        initial={{ width: 52 }}
        animate={{ width: isOpen ? 192 : 52 }}
        onHoverStart={() => setIsOpen(true)}
        onHoverEnd={() => setIsOpen(false)}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="flex-shrink-0 flex flex-col overflow-hidden relative z-30"
        style={{
          background: '#ffffff',
          borderRight: '0.5px solid #e8e9ef',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-3.5 flex-shrink-0"
          style={{ height: 52, borderBottom: '0.5px solid #e8e9ef' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-md"
            style={{ width: 24, height: 24, background: '#5b6af0' }}
          >
            <Icons.Logo />
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.13, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <p className="whitespace-nowrap text-xs font-medium" style={{ color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                  APS Dashboard
                </p>
                <p className="whitespace-nowrap" style={{ fontSize: 10, color: '#b0b2c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
                  Management
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-px px-2 py-2.5 overflow-hidden">
          {/* Section label */}
          <AnimatePresence>
            {isOpen && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="whitespace-nowrap px-1.5 pb-1"
                style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4c6d2', paddingTop: 8 }}
              >
                Navigation
              </motion.p>
            )}
          </AnimatePresence>

          {sidebarItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.screenKey}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 rounded-lg cursor-pointer relative overflow-hidden flex-shrink-0"
                style={{
                  padding: '7px 8px',
                  background: item.isActive ? '#eef0fd' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => {
                  if (!item.isActive) (e.currentTarget as HTMLElement).style.background = '#f4f5fa';
                }}
                onMouseLeave={e => {
                  if (!item.isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Active pip */}
                {item.isActive && (
                  <motion.div
                    layoutId="active-pip"
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{ width: 2.5, height: 16, background: '#5b6af0', borderRadius: '0 2px 2px 0' }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}

                {/* Icon */}
                <span
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 18,
                    height: 18,
                    color: item.isActive ? '#5b6af0' : '#c4c6d2',
                    transition: 'color 0.12s',
                  }}
                >
                  <Icon />
                </span>

                {/* Label */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.13, delay: idx * 0.012 }}
                      className="whitespace-nowrap overflow-hidden"
                      style={{
                        fontSize: 12.5,
                        fontWeight: item.isActive ? 500 : 400,
                        color: item.isActive ? '#5b6af0' : '#9496b0',
                        transition: 'color 0.12s',
                      }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-2 pb-3 flex-shrink-0" style={{ borderTop: '0.5px solid #e8e9ef', paddingTop: 8 }}>
          <motion.button
            onClick={handleLogout}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-2.5 rounded-lg cursor-pointer border-none bg-transparent overflow-hidden group"
            style={{ padding: '7px 8px', transition: 'background 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff0f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span
              className="flex-shrink-0 flex items-center justify-center group-hover:text-red-400 transition-colors duration-150"
              style={{ width: 18, height: 18, color: '#c4c6d2' }}
            >
              <Icons.SignOut />
            </span>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.13 }}
                  className="whitespace-nowrap group-hover:text-red-400 transition-colors duration-150"
                  style={{ fontSize: 12.5, color: '#c4c6d2' }}
                >
                  Sign out
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ background: '#f2f3f7' }}>
        {/* Topbar */}
        <div
          className="flex items-center justify-between flex-shrink-0 px-5"
          style={{ height: 52, borderBottom: '0.5px solid #e4e5ec', background: '#f2f3f7' }}
        >
          <p className="text-sm font-medium" style={{ color: '#1a1a2e', letterSpacing: '-0.01em' }}>
            {sidebarItems.find(i => i.isActive)?.name ?? 'Dashboard'}
          </p>
          <div
            className="flex items-center justify-center text-xs font-medium"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#eef0fd',
              border: '0.5px solid #d0d3f7',
              color: '#5b6af0',
            }}
          >
            AD
          </div>
        </div>

        {/* Content card */}
        <div
          className="flex-1 overflow-auto m-3 rounded-xl"
          style={{
            background: '#ffffff',
            border: '0.5px solid #e4e5ec',
          }}
        >
          {children ?? (
            <div className="flex items-center justify-center h-full flex-col gap-1.5">
              <div
                className="flex items-center justify-center rounded-lg mb-1"
                style={{ width: 36, height: 36, background: '#eef0fd' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1.2" stroke="#5b6af0" strokeWidth="1.3" />
                  <rect x="10" y="1.5" width="6.5" height="6.5" rx="1.2" stroke="#5b6af0" strokeWidth="1.3" opacity="0.5" />
                  <rect x="1.5" y="10" width="6.5" height="6.5" rx="1.2" stroke="#5b6af0" strokeWidth="1.3" opacity="0.5" />
                  <rect x="10" y="10" width="6.5" height="6.5" rx="1.2" stroke="#5b6af0" strokeWidth="1.3" opacity="0.25" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: '#9496b0' }}>
                {sidebarItems.length > 0
                  ? `Select ${sidebarItems[0].name} to get started`
                  : 'No screens available'}
              </p>
              <p style={{ fontSize: 11, color: '#c4c6d2' }}>Choose a section from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;