import type { BenchReport } from '../types';

export interface BenchReportSectionProps {
  report: BenchReport;
  onCopied: () => void;
}
