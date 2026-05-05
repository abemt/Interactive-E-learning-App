import { createContext, useContext, useMemo } from 'react';

const DEFAULT_DASHBOARD_THEME = {
  page:
    'min-h-screen bg-[radial-gradient(circle_at_top_left,#dff4ff_0%,#e8f8ff_30%,#f7ffec_60%,#fff9f0_100%)] text-slate-900',
  shell: 'container-fluid py-6 sm:py-8',
  panel:
    'mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-large backdrop-blur',
  card: 'rounded-3xl border border-primary-100 bg-white p-6 shadow-soft',
  softCard: 'rounded-2xl border border-primary-100 bg-primary-50/70 p-4',
  statCard: 'rounded-2xl border border-primary-100 bg-white p-4 text-center shadow-soft',
  statLabel: 'text-xs font-semibold uppercase tracking-widest text-slate-500',
  statValue: 'mt-2 text-3xl font-black text-primary-700',
  pill: 'badge badge-primary',
  buttonPrimary: 'btn-primary',
  buttonOutline: 'btn-outline',
  buttonSecondary: 'btn-secondary',
  alertError: 'alert alert-danger',
  alertInfo: 'alert alert-info'
};

const DashboardThemeContext = createContext(DEFAULT_DASHBOARD_THEME);

function DashboardThemeProvider({ children, value }) {
  const mergedTheme = useMemo(
    () => ({ ...DEFAULT_DASHBOARD_THEME, ...(value || {}) }),
    [value]
  );

  return (
    <DashboardThemeContext.Provider value={mergedTheme}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}

export { DashboardThemeProvider, useDashboardTheme };
