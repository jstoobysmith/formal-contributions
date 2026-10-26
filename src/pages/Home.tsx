import { Link } from 'react-router-dom';
import { ReportList } from '../components/ReportListing';
import { Content } from '../components/Content';
import { Container, Spinner } from '../components/ui';
import { SECTIONS, SITE, SPECIMEN_SLUG } from '../lib/config';
import { useReports } from '../site/data';
import { useTitle } from '../site/useTitle';

export default function Home() {
  useTitle();
  const reports = useReports();
  const published = reports.status === 'ready' ? reports.data.published : [];

  return (
    <Container className="grid gap-y-8">
      <div className="min-w-0">
        <h1 className="sr-only">{SITE.title}</h1>
        <Content file="home/intro" className="max-w-3xl font-serif text-[1.0625rem] leading-relaxed" />
        <p className="mt-3 text-sm">
          <Link to="/submit" className="font-bold">
            Submit a contribution
          </Link>{' '}
          · <Link to="/about">How it works</Link> · <Link to="/about#verifiers">Who reviews reports</Link> ·{' '}
          <Link to="/verify">Check a report</Link>
        </p>
      </div>

      <div className="min-w-0">
        <h2 className="border-b border-rule pb-1 font-serif text-xl font-bold">Sections</h2>
        <ul className="mt-2 space-y-2">
          {SECTIONS.map((s) => {
            const n = published.filter((e) => e.section === s.id).length;
            return (
              <li key={s.id}>
                <Link to={`/sections/${s.id}`} className="font-bold">
                  {s.numeral}. {s.name}
                </Link>{' '}
                <span className="text-muted">— {s.summary}</span>{' '}
                <span className="text-sm text-muted">
                  ({n} {n === 1 ? 'report' : 'reports'})
                </span>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 border-b border-rule pb-1 font-serif text-xl font-bold">Latest reports</h2>
        {reports.status === 'loading' && <Spinner />}
        {reports.status === 'error' && <p className="py-3 text-sm text-muted">The list of reports could not be loaded.</p>}
        {reports.status === 'ready' && published.length === 0 && (
          <p className="py-3 text-sm">
            No reports have been published yet. The <Link to={`/reports/${SPECIMEN_SLUG}`}>specimen report</Link> shows what one looks like.
          </p>
        )}
        {published.length > 0 && (
          <>
            <ReportList entries={published.slice(0, 8)} />
            <p className="mt-2 text-sm">
              <Link to="/archive">All reports</Link>
            </p>
          </>
        )}
      </div>

    </Container>
  );
}
