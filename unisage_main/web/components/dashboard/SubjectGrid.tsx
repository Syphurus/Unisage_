'use client';

import { SubjectCard } from './SubjectCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Subject } from '@/lib/types';

interface SubjectGridProps {
  subjects: Subject[];
  progressMap?: Record<string, number>;
}

export function SubjectGrid({ subjects, progressMap = {} }: SubjectGridProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subjects yet"
        description="Subjects will appear here once they are published."
        icon="book"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {subjects.map((subject, index) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          progress={progressMap[subject.id] || 0}
          index={index}
        />
      ))}
    </div>
  );
}
