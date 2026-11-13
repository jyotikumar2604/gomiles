const MAP = {
  pending: ['Pending review', 'neutral'], quoted: ['Quote issued', 'teal'], accepted: ['Accepted, awaiting payment', 'teal'],
  confirmed: ['Confirmed', 'ok'], active: ['Trip in progress', 'ok'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', 'danger'],
  available: ['Available', 'ok'], maintenance: ['Maintenance', 'warn'], 'on-leave': ['On leave', 'warn'],
};
export default function StatusBadge({ status }) {
  const [label, tone] = MAP[status] || [status, 'neutral'];
  return <span className={'badge ' + tone}><span className="bd" aria-hidden="true" />{label}</span>;
}
export const STATUS_LABELS = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [k, v[0]]));
