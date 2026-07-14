import { useState } from 'react';
import logo from '../../assets/aumico-logo.png';
import { Icon } from '../ui/Icon';

const PRIMARY_NAV = [
  { id: 'projects', label: 'Projekte', icon: 'home' },
  { id: 'companies', label: 'Firmen', icon: 'building' },
  { id: 'closing', label: 'Aufgaben', icon: 'file' },
];

const FOOTER_NAV = [
  { id: 'notifications', label: 'Benachrichtigungen', icon: 'bell' },
  { id: 'settings', label: 'Organisationseinstellungen', icon: 'cog' },
  { id: 'support', label: 'Support', icon: 'info' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <button
        type="button"
        className="logo-row"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Navigation ausklappen' : 'Navigation einklappen'}
        aria-expanded={!collapsed}
      >
        <span className="logo-mark">
          <img src={logo} alt="aumico" />
        </span>
      </button>
      <nav className="nav">
        {PRIMARY_NAV.map((item) => (
          <div key={item.id} className={'item' + (item.id === 'projects' ? ' active' : '')} title={collapsed ? item.label : undefined}>
            <Icon name={item.icon} /> <span className="item-label">{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="spacer" />
      <div className="foot-items">
        {FOOTER_NAV.map((item) => (
          <div key={item.id} className="item" title={collapsed ? item.label : undefined}>
            <Icon name={item.icon} /> <span className="item-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="org-name">Meier Treuhand AG</div>
      <div className="user-card">
        <div className="av">SF</div>
        <div className="user-card-text">
          <div className="n">Sarah Furrer</div>
          <div className="o">sfurrer@meier-treuhand.ch</div>
        </div>
      </div>
    </aside>
  );
}
