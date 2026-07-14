import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  crumbs: string[];
  children: React.ReactNode;
  /** Rechte Spalte über die volle Höhe (z.B. Co-Pilot-Panel/Strip) */
  right?: React.ReactNode;
}

export function AppShell({ crumbs, children, right }: AppShellProps) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar crumbs={crumbs} />
        <div className="content">{children}</div>
      </div>
      {right}
    </div>
  );
}
