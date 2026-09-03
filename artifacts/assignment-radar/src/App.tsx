import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  LayoutDashboard,
  Link2,
  ListChecks,
  Moon,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

type Priority = 'low' | 'medium' | 'high';
type Importance = 'low' | 'medium' | 'high';
type Status = 'not-started' | 'in-progress' | 'submitted';
type FilterKey = 'all' | 'today' | 'soon' | 'high' | 'not-started' | 'in-progress' | 'submitted';

type Assignment = {
  id: string;
  subject: string;
  title: string;
  description: string;
  teacher: string;
  dueDate: string;
  priority: Priority;
  effortMinutes: number;
  importance: Importance;
  submissionLink: string;
  status: Status;
  notes: string;
  attachmentName: string;
  createdAt: string;
};

const STORAGE_KEY = 'assignment-radar.assignments';
const THEME_KEY = 'assignment-radar.theme';

const addDays = (amount: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
};

const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const dateDiff = (dueDate: string) => {
  const now = new Date(`${todayKey()}T12:00:00`);
  const due = new Date(`${dueDate}T12:00:00`);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
};

const formatDate = (date: string, compact = false) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(compact ? {} : { weekday: 'short' }) }).format(
    new Date(`${date}T12:00:00`),
  );

const formatMinutes = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}` : `${minutes}m`);

const isValidUrl = (value: string) => {
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const importanceWeight: Record<Importance, number> = { low: 1, medium: 2, high: 3 };
const priorityWeight: Record<Priority, number> = { low: 1, medium: 2, high: 3 };
const smartScore = (assignment: Assignment) => {
  const days = dateDiff(assignment.dueDate);
  const urgency = days < 0 ? 5 : days === 0 ? 5 : days === 1 ? 4 : days <= 3 ? 3 : 1;
  return urgency * 3 + Math.min(4, Math.ceil(assignment.effortMinutes / 60)) + importanceWeight[assignment.importance] + priorityWeight[assignment.priority];
};

const urgencyLabel = (assignment: Assignment) => {
  const days = dateDiff(assignment.dueDate);
  if (assignment.status === 'submitted') return { label: 'Submitted', tone: 'done' };
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'overdue' };
  if (days === 0) return { label: 'Due today', tone: 'today' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'tomorrow' };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'soon' };
  return { label: `Due ${formatDate(assignment.dueDate, true)}`, tone: 'later' };
};

const seedAssignments = (): Assignment[] => [
  {
    id: 'seed-urban-essay',
    subject: 'Urban Studies',
    title: 'Transit Equity Field Notes',
    description: 'Synthesize the neighborhood walk-through into a 1,200-word field report with two observed patterns.',
    teacher: 'Dr. Maya Chen',
    dueDate: addDays(1),
    priority: 'high',
    effortMinutes: 150,
    importance: 'high',
    submissionLink: 'https://classroom.google.com/',
    status: 'in-progress',
    notes: 'Pull the bus-stop accessibility notes from Tuesday.',
    attachmentName: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-stats-lab',
    subject: 'Applied Statistics',
    title: 'Lab 04 · Confidence Intervals',
    description: 'Complete the notebook exercises and write a short interpretation of the bootstrap sample.',
    teacher: 'Prof. Jonah Reyes',
    dueDate: addDays(0),
    priority: 'high',
    effortMinutes: 75,
    importance: 'high',
    submissionLink: '',
    status: 'not-started',
    notes: 'Use the lecture example as a starting point.',
    attachmentName: 'lab-04-notebook.ipynb',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-typography',
    subject: 'Visual Communication',
    title: 'Type Specimen: Local Voices',
    description: 'Build a printed specimen that gives one type family a point of view.',
    teacher: 'Ari Wallace',
    dueDate: addDays(3),
    priority: 'medium',
    effortMinutes: 120,
    importance: 'medium',
    submissionLink: '',
    status: 'not-started',
    notes: '',
    attachmentName: 'specimen-brief.pdf',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-biology',
    subject: 'Cell Biology',
    title: 'Microscopy Reflection',
    description: 'Annotate the three microscopy images and connect each observation to the week 5 reading.',
    teacher: 'Dr. Lena Okafor',
    dueDate: addDays(5),
    priority: 'low',
    effortMinutes: 45,
    importance: 'medium',
    submissionLink: 'https://canvas.instructure.com/',
    status: 'not-started',
    notes: '',
    attachmentName: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-history',
    subject: 'Modern History',
    title: 'Archive Visit Response',
    description: 'A 600-word response to one primary source from the archive visit.',
    teacher: 'Professor Elian Moore',
    dueDate: addDays(-1),
    priority: 'medium',
    effortMinutes: 60,
    importance: 'low',
    submissionLink: '',
    status: 'submitted',
    notes: 'Submitted after seminar.',
    attachmentName: 'archive-response.docx',
    createdAt: new Date().toISOString(),
  },
];

const loadAssignments = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Assignment[];
  } catch {
    // A malformed local value should never block the workspace.
  }
  const seeded = seedAssignments();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/assignments', label: 'Assignments', icon: ListChecks },
  { href: '/submissions', label: 'Submissions', icon: Send },
  { href: '/workload', label: 'Workload', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings2 },
];

function AppContent() {
  const [assignments, setAssignments] = useState<Assignment[]>(loadAssignments);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light');
  const [notice, setNotice] = useState('');
  const [location] = useLocation();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const notify = (message: string) => setNotice(message);
  const addAssignment = (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    setAssignments((current) => [{ ...assignment, id: `assignment-${Date.now()}`, createdAt: new Date().toISOString() }, ...current]);
    notify('Assignment saved to your radar.');
  };
  const updateAssignment = (id: string, updates: Omit<Assignment, 'id' | 'createdAt'>) => {
    setAssignments((current) => current.map((item) => (item.id === id ? { ...updates, id, createdAt: item.createdAt } : item)));
    notify('Changes saved.');
  };
  const deleteAssignment = (id: string) => {
    setAssignments((current) => current.filter((item) => item.id !== id));
    notify('Assignment removed.');
  };
  const markSubmitted = (id: string) => {
    setAssignments((current) => current.map((item) => (item.id === id ? { ...item, status: 'submitted' } : item)));
    notify('Nice work — marked as submitted.');
  };
  const clearAll = () => {
    setAssignments([]);
    notify('Your radar is clear.');
  };

  return (
    <QuerylessBoundary resetKey={location}>
      <AppShell theme={theme} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        <Switch>
          <Route path="/">
            <DashboardPage assignments={assignments} onMarkSubmitted={markSubmitted} />
          </Route>
          <Route path="/assignments">
            <AssignmentsPage assignments={assignments} onAdd={addAssignment} onUpdate={updateAssignment} onDelete={deleteAssignment} onMarkSubmitted={markSubmitted} />
          </Route>
          <Route path="/submissions">
            <SubmissionsPage assignments={assignments} onMarkSubmitted={markSubmitted} />
          </Route>
          <Route path="/workload">
            <WorkloadPage assignments={assignments} />
          </Route>
          <Route path="/settings">
            <SettingsPage theme={theme} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onClear={clearAll} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </AppShell>
      {notice && <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-4 py-3 text-sm font-semibold text-[hsl(var(--background))] shadow-[var(--shadow-lg)] page-enter" role="status" data-testid="status-toast"><CheckCircle2 size={16} className="text-[hsl(var(--accent))]" />{notice}</div>}
    </QuerylessBoundary>
  );
}

function QuerylessBoundary({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  return <ErrorBoundary resetKey={resetKey}>{children}</ErrorBoundary>;
}

function AppShell({ children, theme, onThemeToggle }: { children: ReactNode; theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return (
    <div className="app-shell flex">
      <div className="grain" />
      <aside className="sidebar desktop-sidebar fixed inset-y-0 left-0 z-30 flex w-[244px] flex-col px-5 py-6">
        <Brand />
        <div className="mt-12 text-[10px] font-bold uppercase tracking-[.22em] text-[hsl(var(--sidebar-foreground)/.45)]">Workspace</div>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => <NavItem key={item.href} {...item} />)}
        </nav>
        <div className="mt-auto rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
          <Sparkles size={17} className="text-[hsl(var(--accent))]" />
          <p className="mt-3 text-sm font-semibold">A little structure goes a long way.</p>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.6)]">Keep the next step visible, not the whole semester.</p>
        </div>
        <button onClick={onThemeToggle} className="focus-ring mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-[hsl(var(--sidebar-foreground)/.7)] transition hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]" data-testid="button-toggle-theme">
          <span className="flex items-center gap-2">{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />} {theme === 'light' ? 'Night mode' : 'Day mode'}</span>
          <span className="mono-font text-[10px] uppercase tracking-wider opacity-50">{theme}</span>
        </button>
      </aside>
      <div className="w-full md:pl-[244px]">
        <header className="mobile-only sidebar sticky top-0 z-30 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-4 py-3">
          <Brand compact />
          <button onClick={onThemeToggle} className="focus-ring rounded-lg p-2 text-[hsl(var(--sidebar-foreground))]" data-testid="button-mobile-toggle-theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
        </header>
        <main className="mx-auto min-h-[100dvh] max-w-[1380px] px-4 py-7 sm:px-8 sm:py-10 lg:px-12">{children}</main>
        <nav className="mobile-only sidebar fixed inset-x-0 bottom-0 z-30 justify-around border-t border-[hsl(var(--sidebar-border))] px-2 py-2" aria-label="Mobile navigation">
          {navItems.map((item) => <NavItem key={item.href} {...item} mobile />)}
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={`flex items-center gap-2.5 text-[hsl(var(--sidebar-foreground))] ${compact ? '' : 'px-2'}`} data-testid="link-brand"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><RadarMark /></span><span className="display-font text-[20px] font-bold tracking-[-.03em]">Assignment <i className="font-normal not-italic text-[hsl(var(--accent))]">Radar</i></span></Link>;
}

function RadarMark() {
  return <span className="relative block h-4 w-4 rounded-full border-2 border-current"><span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" /><span className="absolute -right-1.5 top-1/2 h-px w-2 -translate-y-1/2 rotate-[-35deg] bg-current" /></span>;
}

function NavItem({ href, label, icon: Icon, mobile = false }: { href: string; label: string; icon: typeof LayoutDashboard; mobile?: boolean }) {
  const [location] = useLocation();
  const active = href === '/' ? location === '/' : location.startsWith(href);
  return <Link href={href} className={`focus-ring flex items-center gap-3 rounded-xl transition ${mobile ? 'flex-col gap-1 px-3 py-1 text-[10px]' : 'px-3 py-2.5 text-sm'} ${active ? 'bg-[hsl(var(--sidebar-primary))] font-bold text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.65)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={mobile ? 18 : 17} strokeWidth={active ? 2.5 : 1.8} /><span>{label}</span></Link>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-enter flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="display-font mt-2 text-4xl font-bold tracking-[-.04em] text-[hsl(var(--foreground))] sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-[15px] leading-6 text-[hsl(var(--muted-foreground))]">{description}</p></div>{action}</div>;
}

function SummaryStat({ label, value, detail, tone = 'blue', icon: Icon }: { label: string; value: number; detail: string; tone?: string; icon: typeof CalendarDays }) {
  return <div className="card-lift stagger-in rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">{label}</span><span className={`rounded-lg p-2 ${tone === 'orange' ? 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]' : tone === 'green' ? 'bg-[hsl(151_37%_43%/.12)] text-[hsl(151_37%_35%)]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}><Icon size={17} /></span></div><div className="display-font mt-4 text-4xl font-bold">{value}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</div></div>;
}

function DashboardPage({ assignments, onMarkSubmitted }: { assignments: Assignment[]; onMarkSubmitted: (id: string) => void }) {
  const pending = assignments.filter((item) => item.status !== 'submitted');
  const today = assignments.filter((item) => item.status !== 'submitted' && dateDiff(item.dueDate) === 0);
  const tomorrow = assignments.filter((item) => item.status !== 'submitted' && dateDiff(item.dueDate) === 1);
  const soon = assignments.filter((item) => item.status !== 'submitted' && dateDiff(item.dueDate) >= 2 && dateDiff(item.dueDate) <= 7);
  const focus = [...pending].sort((a, b) => smartScore(b) - smartScore(a)).slice(0, 3);
  const completed = assignments.filter((item) => item.status === 'submitted').length;
  const totalMinutes = pending.reduce((sum, item) => sum + item.effortMinutes, 0);
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  return <div className="space-y-9">
    <PageIntro eyebrow={dateLabel} title="Good morning, Alex." description={pending.length ? `You have ${pending.length} open thread${pending.length === 1 ? '' : 's'} this week. Here is the calmest place to start.` : 'Your radar is quiet. That is worth noticing.'} action={<Link href="/assignments" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]" data-testid="link-dashboard-add"><Plus size={17} /> Add assignment</Link>} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryStat label="Due today" value={today.length} detail={today.length ? 'Give these first attention' : 'Nothing pressing today'} tone="orange" icon={Flame} /><SummaryStat label="Due tomorrow" value={tomorrow.length} detail={tomorrow.length ? 'Worth a quick look now' : 'Your tomorrow is open'} icon={CalendarDays} /><SummaryStat label="Due soon" value={soon.length} detail="Within the next 7 days" icon={Clock3} /><SummaryStat label="Completed" value={completed} detail={`${pending.length} still on the radar`} tone="green" icon={CheckCircle2} /></div>
    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-7" data-testid="section-deadline-radar"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Deadline radar</div><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">The next seven days, in perspective.</p></div><Link href="/workload" className="focus-ring text-xs font-bold text-[hsl(var(--primary))] hover:underline" data-testid="link-view-workload">View workload <ArrowUpRight size={13} className="ml-1 inline" /></Link></div><div className="mt-8 flex h-48 items-end gap-2 sm:gap-4">{Array.from({ length: 7 }, (_, index) => { const day = addDays(index); const items = pending.filter((item) => item.dueDate === day); const max = Math.max(1, ...Array.from({ length: 7 }, (_, i) => pending.filter((item) => item.dueDate === addDays(i)).length)); return <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={day} data-testid={`radar-day-${day}`}><div className="flex h-36 w-full items-end justify-center rounded-lg bg-[hsl(var(--muted)/.65)] p-1">{items.length > 0 ? <div className={`w-full rounded-md transition-all ${index === 0 ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary))]'}`} style={{ height: `${Math.max(16, (items.length / max) * 100)}%` }} title={`${items.length} assignment${items.length > 1 ? 's' : ''}`} /> : <div className="mb-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--border))]" />}</div><span className="mono-font text-[10px] text-[hsl(var(--muted-foreground))]">{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${day}T12:00:00`))}</span><span className="text-xs font-bold">{items.length || '—'}</span></div> })}</div></section>
      <section className="relative overflow-hidden rounded-2xl bg-[hsl(var(--sidebar))] p-6 text-[hsl(var(--sidebar-foreground))] sm:p-7" data-testid="section-workload-preview"><div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-[hsl(var(--accent)/.15)]" /><div className="relative"><div className="flex items-center gap-2 text-sm font-bold"><BarChart3 size={17} className="text-[hsl(var(--accent))]" /> At a glance</div><p className="mt-8 text-sm text-[hsl(var(--sidebar-foreground)/.6)]">Open workload</p><div className="display-font mt-1 text-5xl font-bold">{formatMinutes(totalMinutes)}</div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--sidebar-foreground)/.15)]"><div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${Math.min(100, (totalMinutes / 600) * 100)}%` }} /></div><p className="mt-3 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.55)]">Estimated across {pending.length} open assignment{pending.length === 1 ? '' : 's'}. Completed work stays out of the way.</p><Link href="/workload" className="focus-ring mt-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--accent))] hover:gap-3 transition-all" data-testid="link-preview-workload">Open full radar <ChevronRight size={15} /></Link></div></section>
    </div>
    <section data-testid="section-todays-focus"><div className="flex items-end justify-between"><div><div className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">Your next moves</div><h2 className="display-font mt-2 text-3xl font-bold tracking-[-.03em]">Today’s focus</h2></div><Link href="/assignments" className="focus-ring text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-see-all-assignments">See all <ArrowUpRight size={14} className="ml-1 inline" /></Link></div>{focus.length ? <div className="mt-5 grid gap-3 lg:grid-cols-3">{focus.map((item) => <AssignmentCard key={item.id} assignment={item} compact onMarkSubmitted={onMarkSubmitted} />)}</div> : <EmptyState compact />}</section>
  </div>;
}

function AssignmentCard({ assignment, compact = false, onOpen, onMarkSubmitted }: { assignment: Assignment; compact?: boolean; onOpen?: () => void; onMarkSubmitted?: (id: string) => void }) {
  const urgency = urgencyLabel(assignment);
  return <article className={`card-lift stagger-in group relative rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] ${compact ? 'p-5' : 'p-5 sm:p-6'}`} data-testid={`card-assignment-${assignment.id}`} onClick={onOpen}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]"><span className="h-1.5 w-1.5 rounded-full bg-current" />{assignment.subject}</div><h3 className="mt-2 truncate text-[17px] font-bold tracking-[-.02em]">{assignment.title}</h3></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${urgency.tone === 'overdue' ? 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]' : urgency.tone === 'today' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : urgency.tone === 'done' ? 'bg-[hsl(151_37%_43%/.12)] text-[hsl(151_37%_35%)]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{urgency.label}</span></div>{!compact && assignment.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[hsl(var(--muted-foreground))]">{assignment.description}</p>}<div className="mt-5 flex items-center justify-between gap-3 border-t border-[hsl(var(--border)/.7)] pt-4"><div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Clock3 size={13} /> {formatMinutes(assignment.effortMinutes)}</span><span className={`flex items-center gap-1 font-semibold ${assignment.priority === 'high' ? 'text-[hsl(var(--destructive))]' : ''}`}><span className="h-1.5 w-1.5 rounded-full bg-current" /> {assignment.priority} priority</span></div>{assignment.status !== 'submitted' && onMarkSubmitted && <button className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] opacity-70 transition hover:bg-[hsl(151_37%_43%/.12)] hover:text-[hsl(151_37%_35%)] hover:opacity-100" title="Mark as submitted" onClick={(event) => { event.stopPropagation(); onMarkSubmitted(assignment.id); }} data-testid={`button-submit-${assignment.id}`}><Check size={16} /></button>}</div></article>;
}

function EmptyState({ compact = false }: { compact?: boolean }) {
  return <div className={`rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] text-center ${compact ? 'p-8' : 'p-12'}`} data-testid="empty-assignments"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.22)] text-[hsl(var(--primary))]"><RadarMark /></div><h3 className="display-font mt-4 text-xl font-bold">A clear horizon.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">No assignments match this view. Add the next thing on your mind and we’ll give it a place to land.</p>{!compact && <Link href="/assignments" className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-empty-add"><Plus size={16} /> Add assignment</Link>}</div>;
}

function AssignmentsPage({ assignments, onAdd, onUpdate, onDelete, onMarkSubmitted }: { assignments: Assignment[]; onAdd: (data: Omit<Assignment, 'id' | 'createdAt'>) => void; onUpdate: (id: string, data: Omit<Assignment, 'id' | 'createdAt'>) => void; onDelete: (id: string) => void; onMarkSubmitted: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [editor, setEditor] = useState<Assignment | 'new' | null>(null);
  const [detail, setDetail] = useState<Assignment | null>(null);
  const filtered = useMemo(() => assignments.filter((item) => {
    const needle = search.toLowerCase();
    const matchesSearch = !needle || [item.title, item.subject, item.teacher].some((value) => value.toLowerCase().includes(needle));
    const days = dateDiff(item.dueDate);
    const matchesFilter = filter === 'all' || (filter === 'today' && days === 0) || (filter === 'soon' && days >= 0 && days <= 7 && item.status !== 'submitted') || (filter === 'high' && item.priority === 'high') || item.status === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => smartScore(b) - smartScore(a)), [assignments, filter, search]);
  const counts = { all: assignments.length, today: assignments.filter((a) => dateDiff(a.dueDate) === 0 && a.status !== 'submitted').length, soon: assignments.filter((a) => dateDiff(a.dueDate) >= 0 && dateDiff(a.dueDate) <= 7 && a.status !== 'submitted').length, high: assignments.filter((a) => a.priority === 'high').length, 'not-started': assignments.filter((a) => a.status === 'not-started').length, 'in-progress': assignments.filter((a) => a.status === 'in-progress').length, submitted: assignments.filter((a) => a.status === 'submitted').length };
  return <div className="space-y-8">
    <PageIntro eyebrow="Your academic desk" title="Assignments" description="Everything you need to remember, arranged by what deserves your attention next." action={<button onClick={() => setEditor('new')} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]" data-testid="button-add-assignment"><Plus size={17} /> Add assignment</button>} />
    <div className="flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, subject, or teacher" className="focus-ring h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-10 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary))]" data-testid="input-search-assignments" /></label><div className="flex items-center gap-2 overflow-x-auto pb-1"><Filter size={15} className="ml-1 shrink-0 text-[hsl(var(--muted-foreground))]" />{(['all', 'today', 'soon', 'high', 'not-started', 'in-progress', 'submitted'] as FilterKey[]).map((key) => <button key={key} onClick={() => setFilter(key)} className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${filter === key ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.4)]'}`} data-testid={`button-filter-${key}`}><span>{key === 'not-started' ? 'Not started' : key === 'in-progress' ? 'In progress' : key === 'high' ? 'High priority' : key === 'all' ? 'All' : key === 'today' ? 'Due today' : key === 'soon' ? 'Due soon' : 'Submitted'}</span><span className="mono-font text-[10px] opacity-70">{counts[key]}</span></button>)}</div></div>
    {filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <AssignmentCard key={item.id} assignment={item} onOpen={() => setDetail(item)} onMarkSubmitted={onMarkSubmitted} />)}</div> : <EmptyState />}
    {editor && <AssignmentForm initial={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSave={(data) => { if (editor === 'new') onAdd(data); else onUpdate(editor.id, data); setEditor(null); }} />}
    {detail && <AssignmentDetail assignment={detail} onClose={() => setDetail(null)} onEdit={() => { setEditor(detail); setDetail(null); }} onDelete={() => { if (window.confirm('Remove this assignment from your radar?')) { onDelete(detail.id); setDetail(null); } }} onMarkSubmitted={() => { onMarkSubmitted(detail.id); setDetail({ ...detail, status: 'submitted' }); }} />}
  </div>;
}

function AssignmentForm({ initial, onClose, onSave }: { initial?: Assignment; onClose: () => void; onSave: (data: Omit<Assignment, 'id' | 'createdAt'>) => void }) {
  const [subject, setSubject] = useState(initial?.subject || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [teacher, setTeacher] = useState(initial?.teacher || '');
  const [dueDate, setDueDate] = useState(initial?.dueDate || addDays(1));
  const [priority, setPriority] = useState<Priority>(initial?.priority || 'medium');
  const [importance, setImportance] = useState<Importance>(initial?.importance || 'medium');
  const [effortMinutes, setEffortMinutes] = useState(String(initial?.effortMinutes || 60));
  const [submissionLink, setSubmissionLink] = useState(initial?.submissionLink || '');
  const [status, setStatus] = useState<Status>(initial?.status || 'not-started');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [attachmentName, setAttachmentName] = useState(initial?.attachmentName || '');
  const [error, setError] = useState('');
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !title.trim() || !dueDate) { setError('Subject, title, and due date are required.'); return; }
    const safeLink = isValidUrl(submissionLink) ? submissionLink.trim() : '';
    onSave({ subject: subject.trim(), title: title.trim(), description: description.trim(), teacher: teacher.trim(), dueDate, priority, importance, effortMinutes: Math.max(5, Number(effortMinutes) || 60), submissionLink: safeLink, status, notes: notes.trim(), attachmentName: attachmentName.trim() });
  };
  return <Modal title={initial ? 'Edit assignment' : 'Add assignment'} onClose={onClose}><form onSubmit={save} className="space-y-5" data-testid="form-assignment"><div className="grid gap-4 sm:grid-cols-2"><Field label="Subject *"><input autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Environmental Ethics" className="form-input" data-testid="input-subject" /></Field><Field label="Title *"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" className="form-input" data-testid="input-title" /></Field></div><Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="A little context for future you..." className="form-input resize-none" data-testid="input-description" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Teacher"><input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Who assigned it?" className="form-input" data-testid="input-teacher" /></Field><Field label="Due date *"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="form-input" data-testid="input-due-date" /></Field></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="form-input" data-testid="select-priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Importance"><select value={importance} onChange={(e) => setImportance(e.target.value as Importance)} className="form-input" data-testid="select-importance"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Estimated effort"><input type="number" min="5" step="5" value={effortMinutes} onChange={(e) => setEffortMinutes(e.target.value)} className="form-input" data-testid="input-effort" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Submission link"><div className="relative"><Link2 size={15} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><input value={submissionLink} onChange={(e) => setSubmissionLink(e.target.value)} placeholder="https://..." className="form-input pl-9" data-testid="input-submission-link" /></div><span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">Invalid links are saved as blank.</span></Field><Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="form-input" data-testid="select-status"><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="submitted">Submitted</option></select></Field></div><Field label="Attachment name"><input value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Optional file name" className="form-input" data-testid="input-attachment" /></Field><Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Tiny reminders, useful links, next steps..." className="form-input resize-none" data-testid="input-notes" /></Field>{error && <p className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--destructive))]" data-testid="status-form-error"><TriangleAlert size={15} />{error}</p>}<div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-5"><button type="button" onClick={onClose} className="focus-ring rounded-xl px-4 py-2.5 text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="button-cancel-assignment">Cancel</button><button type="submit" className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-save-assignment">{initial ? 'Save changes' : 'Save assignment'}</button></div></form></Modal>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-semibold"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</span>{children}</label>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(var(--foreground)/.45)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className="page-enter max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-xl)] sm:rounded-3xl sm:p-8"><div className="mb-7 flex items-center justify-between"><h2 className="display-font text-2xl font-bold">{title}</h2><button onClick={onClose} className="focus-ring rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="button-close-modal"><X size={19} /></button></div>{children}</div></div>;
}

function AssignmentDetail({ assignment, onClose, onEdit, onDelete, onMarkSubmitted }: { assignment: Assignment; onClose: () => void; onEdit: () => void; onDelete: () => void; onMarkSubmitted: () => void }) {
  const urgency = urgencyLabel(assignment);
  return <Modal title="Assignment details" onClose={onClose}><div className="space-y-6" data-testid={`detail-assignment-${assignment.id}`}><div><div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]"><BookOpen size={15} />{assignment.subject}</div><h3 className="display-font mt-2 text-3xl font-bold tracking-[-.04em]">{assignment.title}</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{assignment.teacher || 'No teacher added'}</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><DetailItem label="Due" value={urgency.label} /><DetailItem label="Effort" value={formatMinutes(assignment.effortMinutes)} /><DetailItem label="Priority" value={assignment.priority} /><DetailItem label="Importance" value={assignment.importance} /></div>{assignment.description && <div><h4 className="text-xs font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Description</h4><p className="mt-2 text-sm leading-6">{assignment.description}</p></div>}{assignment.notes && <div className="rounded-xl bg-[hsl(var(--accent)/.18)] p-4"><h4 className="text-xs font-bold uppercase tracking-wide">Notes</h4><p className="mt-2 text-sm leading-6">{assignment.notes}</p></div>}{assignment.attachmentName && <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3 text-sm"><FileText size={17} className="text-[hsl(var(--primary))]" /><span className="truncate">{assignment.attachmentName}</span></div>}{assignment.submissionLink && <button onClick={() => window.open(assignment.submissionLink, '_blank', 'noopener,noreferrer')} className="focus-ring flex w-full items-center justify-between rounded-xl border border-[hsl(var(--border))] p-3 text-left text-sm font-bold transition hover:border-[hsl(var(--primary)/.4)] hover:bg-[hsl(var(--muted)/.5)]" data-testid="button-open-submission-link"><span className="flex items-center gap-2"><Link2 size={17} className="text-[hsl(var(--primary))]" /> Open submission link</span><ExternalLink size={15} /></button>}<div className="flex flex-wrap justify-between gap-2 border-t border-[hsl(var(--border))] pt-5"><button onClick={onDelete} className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]" data-testid="button-delete-assignment"><Trash2 size={16} /> Delete</button><div className="flex gap-2"><button onClick={onEdit} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 text-sm font-bold hover:bg-[hsl(var(--muted))]" data-testid="button-edit-assignment"><Pencil size={15} /> Edit</button>{assignment.status !== 'submitted' && <button onClick={onMarkSubmitted} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-detail-submit"><Check size={15} /> Mark submitted</button>}</div></div></div></Modal>;
}

function DetailItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[hsl(var(--muted)/.7)] p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</div><div className="mt-1 text-sm font-bold capitalize">{value}</div></div>; }

function SubmissionsPage({ assignments, onMarkSubmitted }: { assignments: Assignment[]; onMarkSubmitted: (id: string) => void }) {
  const pending = assignments.filter((item) => item.status !== 'submitted').sort((a, b) => dateDiff(a.dueDate) - dateDiff(b.dueDate));
  return <div className="space-y-8"><PageIntro eyebrow="Close the loop" title="Submissions" description="A simple handoff point for work that is ready, almost ready, or needs one last push." /><div className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] sm:p-8" data-testid="section-submission-summary"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-sm font-bold opacity-70">Still to hand in</div><div className="display-font mt-2 text-5xl font-bold">{pending.length}</div></div><div className="max-w-xs text-sm leading-6 opacity-75">Open a course portal from each card, then mark it here when it leaves your hands.</div></div></div>{pending.length ? <div className="space-y-3">{pending.map((item) => <div key={item.id} className="card-lift stagger-in flex flex-col gap-4 rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-submission-${item.id}`}><div className="min-w-0"><div className="text-xs font-bold text-[hsl(var(--primary))]">{item.subject}</div><h3 className="mt-1 truncate text-lg font-bold">{item.title}</h3><div className="mt-2 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><CalendarDays size={13} /> {formatDate(item.dueDate)}</span><span className="flex items-center gap-1"><Clock3 size={13} /> {formatMinutes(item.effortMinutes)}</span></div></div><div className="flex shrink-0 items-center gap-2">{isValidUrl(item.submissionLink) ? <button onClick={() => window.open(item.submissionLink, '_blank', 'noopener,noreferrer')} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]" data-testid={`button-open-link-${item.id}`}><ExternalLink size={14} /> Open link</button> : <span className="rounded-xl bg-[hsl(var(--muted))] px-3 py-2.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">No link added</span>}<button onClick={() => onMarkSubmitted(item.id)} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid={`button-mark-submitted-${item.id}`}><Check size={14} /> Mark submitted</button></div></div>)}</div> : <EmptyState />}</div>;
}

function WorkloadPage({ assignments }: { assignments: Assignment[] }) {
  const pending = assignments.filter((item) => item.status !== 'submitted');
  const week = Array.from({ length: 7 }, (_, index) => { const date = addDays(index); const items = pending.filter((item) => item.dueDate === date); return { date, items, minutes: items.reduce((sum, item) => sum + item.effortMinutes, 0) }; });
  const max = Math.max(1, ...week.map((day) => day.minutes));
  const heavy = [...week].sort((a, b) => b.minutes - a.minutes)[0];
  return <div className="space-y-8"><PageIntro eyebrow="Plan with your actual time" title="Workload" description="A week-sized view of the energy your deadlines are asking for. Submitted work has already stepped out of the way." /><section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-8" data-testid="section-weekly-workload"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm font-bold"><BarChart3 size={17} className="text-[hsl(var(--primary))]" /> Weekly radar</div><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Estimated minutes by due date</p></div><div className="mono-font rounded-lg bg-[hsl(var(--accent)/.25)] px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide">7 days</div></div><div className="mt-10 grid grid-cols-7 gap-2 sm:gap-4">{week.map((day, index) => <div key={day.date} className="text-center" data-testid={`workload-day-${day.date}`}><div className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{index === 0 ? 'Today' : new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`))}</div><div className="flex h-64 items-end justify-center rounded-xl bg-[hsl(var(--muted)/.7)] p-1.5"><div className={`w-full rounded-lg transition-all ${day.minutes === heavy.minutes && day.minutes > 0 ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary))]'}`} style={{ height: day.minutes ? `${Math.max(10, (day.minutes / max) * 100)}%` : '3px' }} /></div><div className="mt-3 text-sm font-bold">{day.minutes ? formatMinutes(day.minutes) : '—'}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{day.items.length} item{day.items.length === 1 ? '' : 's'}</div></div>)}</div></section><div className="grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6" data-testid="section-heavy-days"><div className="flex items-center gap-2 text-sm font-bold"><Flame size={17} className="text-[hsl(var(--destructive))]" /> Heavy-workload days</div>{heavy.minutes ? <div className="mt-5 flex items-end justify-between gap-4"><div><div className="display-font text-3xl font-bold">{formatDate(heavy.date)}</div><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Your fullest day · {formatMinutes(heavy.minutes)} estimated</p></div><div className="mono-font text-3xl font-bold text-[hsl(var(--destructive))]">{heavy.items.length}</div></div> : <p className="mt-5 text-sm text-[hsl(var(--muted-foreground))]">Nothing on the radar yet. Add a deadline to see the week take shape.</p>}</section><section className="rounded-2xl bg-[hsl(var(--sidebar))] p-6 text-[hsl(var(--sidebar-foreground))]" data-testid="section-workload-note"><ShieldCheck size={19} className="text-[hsl(var(--accent))]" /><h3 className="display-font mt-4 text-2xl font-bold">Leave some margin.</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--sidebar-foreground)/.6)]">If one day is carrying most of the weight, start the highest-effort item a little earlier. Future you will notice.</p></section></div></div>;
}

function SettingsPage({ theme, onThemeToggle, onClear }: { theme: 'light' | 'dark'; onThemeToggle: () => void; onClear: () => void }) {
  return <div className="space-y-8"><PageIntro eyebrow="Your space, your rules" title="Settings" description="Assignment Radar is local-first. Your coursework lives in this browser, under your control." /><div className="max-w-3xl space-y-4"><section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6" data-testid="section-appearance"><div className="flex items-start gap-4"><div className="rounded-xl bg-[hsl(var(--accent)/.22)] p-3"><Sun size={19} /></div><div className="flex-1"><h2 className="font-bold">Appearance</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Choose the light of your desk.</p><div className="mt-5 flex gap-2"><button onClick={() => theme === 'dark' && onThemeToggle()} className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${theme === 'light' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid="button-theme-light"><Sun size={15} /> Light</button><button onClick={() => theme === 'light' && onThemeToggle()} className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${theme === 'dark' ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid="button-theme-dark"><Moon size={15} /> Dark</button></div></div></div></section><section className="rounded-2xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--card))] p-6" data-testid="section-data-controls"><div className="flex items-start gap-4"><div className="rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-[hsl(var(--destructive))]"><Trash2 size={19} /></div><div className="flex-1"><h2 className="font-bold">Clear local data</h2><p className="mt-1 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">Remove every assignment from this browser. This cannot be undone, so make sure you really mean it.</p><button onClick={() => { if (window.confirm('Clear every assignment from Assignment Radar? This cannot be undone.')) onClear(); }} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--destructive)/.4)] px-4 py-2.5 text-sm font-bold text-[hsl(var(--destructive))] transition hover:bg-[hsl(var(--destructive)/.1)]" data-testid="button-clear-all"><Trash2 size={15} /> Clear all data</button></div></div></section><div className="flex items-center gap-2 px-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-local-storage-note"><ShieldCheck size={14} /> Stored only on this device · no account required</div></div></div>;
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppContent /></WouterRouter>;
}

export default App;