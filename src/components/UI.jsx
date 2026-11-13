import { CircleAlert, CheckCircle2, Info } from 'lucide-react';

export function Alert({ tone = 'info', title, children }) {
  const Icon = tone === 'error' ? CircleAlert : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div className={'alert ' + tone} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" /><div>{title && <strong>{title}</strong>}<p>{children}</p></div>
    </div>
  );
}
export function EmptyState({ icon: Icon, title, children }) {
  return <div className="empty">{Icon && <Icon size={28} aria-hidden="true" />}<h3>{title}</h3><p>{children}</p></div>;
}
