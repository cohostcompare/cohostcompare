/** AirROI attribution for pages showing derived market or listing figures (their terms, section 5.9/5.10). */
export default function DataSource({ lead }: { lead?: string }) {
  return (
    <p className="hint" style={{ margin: 0 }}>
      {lead ? `${lead} ` : ''}Data source: AirROI (<a href="https://www.airroi.com">www.airroi.com</a>). This material incorporates aggregated estimates and modelled data derived from publicly available sources. All figures are estimates, not verified statements of fact. AirROI has not reviewed, approved or endorsed this material.
    </p>
  );
}
