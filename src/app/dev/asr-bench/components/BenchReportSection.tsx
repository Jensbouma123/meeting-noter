import type { BenchReportSectionProps } from './BenchReportSection.types';
import type { BenchReport } from '../types';

const reportAsText = (report: BenchReport): string =>
  [
    `backend=${report.backend} encoder=${report.encoderQuant} clip=${report.audioSeconds.toFixed(1)}s`,
    `load=${(report.loadMs / 1000).toFixed(1)}s meanRTF=${report.meanRtf.toFixed(3)}`,
    ...report.results.map(
      (r) => `run${r.run}: ${(r.transcribeMs / 1000).toFixed(2)}s RTF=${r.rtf.toFixed(3)} text="${r.text.slice(0, 120)}"`,
    ),
    `UA: ${report.userAgent}`,
  ].join('\n');

export function BenchReportSection({ report, onCopied }: BenchReportSectionProps) {
  const copyReport = () => {
    void navigator.clipboard.writeText(reportAsText(report));
    onCopied();
  };
  return (
    <section style={{ marginTop: '1rem', border: '1px solid #888', padding: '0.75rem' }}>
      <h2>
        {report.backend}/{report.encoderQuant}: mean RTF {report.meanRtf.toFixed(3)}
      </h2>
      <ul>
        {report.results.map((r) => (
          <li key={r.run}>
            run {r.run}: {(r.transcribeMs / 1000).toFixed(2)} s — “{r.text || '(no speech detected)'}”
          </li>
        ))}
      </ul>
      <button onClick={copyReport}>Copy report</button>
    </section>
  );
}
