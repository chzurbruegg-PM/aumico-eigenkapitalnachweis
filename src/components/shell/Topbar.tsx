import { Icon } from '../ui/Icon';

interface TopbarProps {
  crumbs: string[];
}

export function Topbar({ crumbs }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <Icon name="chev-rt" style={{ opacity: 0.5, width: 10, height: 10 }} />}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </span>
        ))}
      </div>
      <div className="grow" />
      <div className="search">
        <span className="ic" />
        <input placeholder="Kunde, Projekt oder Aufgabe suchen…" />
      </div>
      <button className="iconbtn">
        <Icon name="bell" />
      </button>
      <div className="av">SF</div>
    </header>
  );
}
