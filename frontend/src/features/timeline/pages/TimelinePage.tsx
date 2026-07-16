import { useState, useMemo } from 'react';
import { SEO } from '@/shared/components/SEO';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { EmptyState } from '@/shared/components/EmptyState';
import { Skeleton } from '@/shared/components/Skeleton';
import { Section, SectionHeader } from '@/shared/components/Section';
import { useTimeline } from '@/shared/hooks/useTimeline';
import { useEditable } from '@/features/admin/hooks/useEditable';
import { CreateButton } from '@/features/admin/components/CreateButton';
import { EditButton } from '@/features/admin/components/EditButton';
import { TimelineEventFormModal } from '@/features/admin/components/TimelineEventFormModal';
import { TimelineCard } from '@/features/timeline/components/TimelineCard';
import { useLocale } from '@/shared/i18n';
import { TimelineEvent } from '@/shared/types';

function getDecade(event: TimelineEvent): string {
  const year = new Date(event.dataEvento).getFullYear();
  return `${Math.floor(year / 10) * 10}`;
}

function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.dataEvento).getTime();
    const dateB = new Date(b.dataEvento).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.ordem - b.ordem;
  });
}

export function TimelinePage() {
  const { t } = useLocale();
  const { data: events, isLoading, error, refetch } = useTimeline();
  const { canEdit } = useEditable();
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [editingTimelineEvent, setEditingTimelineEvent] = useState<TimelineEvent | null>(null);

  const sortedEvents = useMemo(() => (events ? sortEvents(events) : []), [events]);
  const decades = useMemo(
    () => Array.from(new Set(sortedEvents.map(getDecade))).sort((a, b) => Number(a) - Number(b)),
    [sortedEvents]
  );

  const openTimelineCreate = () => {
    setEditingTimelineEvent(null);
    setTimelineModalOpen(true);
  };

  const openTimelineEdit = (event: TimelineEvent) => {
    setEditingTimelineEvent(event);
    setTimelineModalOpen(true);
  };

  return (
    <>
      <SEO title={t.timeline.title} />
      <main id="main-content">
        <Section ariaLabelledby="timeline-title">
          <Breadcrumb items={[{ label: t.navigation.timeline }]} className="mb-6" />

          <SectionHeader
            title={t.timeline.title}
            titleId="timeline-title"
            subtitle={t.timeline.subtitle}
            centered
            action={
              canEdit ? (
                <CreateButton onClick={openTimelineCreate} label={t.home.eventCreate} />
              ) : undefined
            }
          />

          {isLoading && (
            <div className="space-y-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Skeleton className="h-64 w-full" />
                  <div className="hidden md:block" />
                </div>
              ))}
            </div>
          )}
          {error && <ErrorMessage onRetry={refetch} />}

          {!isLoading && sortedEvents.length === 0 && (
            <EmptyState title={t.timeline.emptyTitle} description={t.home.noTimelineDescription} />
          )}

          {!isLoading && sortedEvents.length > 0 && (
            <>
              <nav
                aria-label={t.timeline.navigateByDecade}
                className="mb-10 flex flex-wrap justify-center gap-2"
              >
                {decades.map((decade) => (
                  <a
                    key={decade}
                    href={`#decada-${decade}`}
                    className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100 no-underline"
                  >
                    {decade}
                  </a>
                ))}
              </nav>

              <div
                className="relative grid grid-cols-1 md:grid-cols-2 md:gap-x-8"
                style={{ gridAutoRows: '1fr' }}
              >
                {/* linha vertical central contínua */}
                <div
                  className="absolute left-4 top-0 bottom-0 w-0.5 bg-brand-200 md:left-1/2 md:-translate-x-1/2"
                  aria-hidden="true"
                />

                {sortedEvents.map((event, index) => {
                  const isLeft = index % 2 === 0;
                  const decade = getDecade(event);
                  const previousEvent = index > 0 ? sortedEvents[index - 1] : null;
                  const previousDecade = previousEvent ? getDecade(previousEvent) : null;
                  const isNewDecade = decade !== previousDecade;

                  return (
                    <div
                      key={event.id}
                      id={isNewDecade ? `decada-${decade}` : undefined}
                      className={`relative col-span-1 md:col-span-2 h-full ${
                        isLeft ? 'md:pr-[calc(50%+1rem)]' : 'md:pl-[calc(50%+1rem)]'
                      }`}
                    >
                      {/* ponto na linha */}
                      <span
                        className="absolute left-4 top-4 h-4 w-4 -translate-x-1/2 rounded-full bg-brand-600 ring-4 ring-white md:left-1/2"
                        aria-hidden="true"
                      />

                      {/* card */}
                      <div className="relative h-full pl-10 md:pl-0">
                        {canEdit && (
                          <div className={`absolute -top-2 ${isLeft ? 'right-0' : 'left-0'}`}>
                            <EditButton
                              onClick={() => openTimelineEdit(event)}
                              label={t.admin.edit}
                            />
                          </div>
                        )}
                        <TimelineCard event={event} showImage showDocumentLink className="h-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      </main>

      <TimelineEventFormModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
        event={editingTimelineEvent}
      />
    </>
  );
}
