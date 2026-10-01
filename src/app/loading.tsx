// Shown straight away while the next page loads, so clicks feel instant.
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="page-loading">
      <div className="sk sk-title" />
      <div className="sk sk-line" />
      <div className="sk sk-line short" />
      <div className="sk sk-block" />
    </main>
  );
}
