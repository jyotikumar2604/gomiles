// Shared heading for inner pages: title, one line of purpose, and the route-line motif from the home hero.
export default function PageHero({ title, lead, children }) {
  return (
    <header className="phero">
      <div className="phero-text">
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      <div className="phero-motif" aria-hidden="true"><span className="dot a" /><span className="line" /><span className="dot b" /></div>
      {children}
    </header>
  );
}
