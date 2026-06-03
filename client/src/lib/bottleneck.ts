export type BottleneckType = 'Blocked' | 'Stale' | 'Overdue' | 'Stuck' | null;

export interface BottleneckInfo {
  type: NonNullable<BottleneckType>;
  days: number; // Days since created, updated, or due
  description: string;
  color: string;
}

export function getStoryBottleneck(story: any): BottleneckInfo | null {
  if (story.status === 'Done') return null;

  const now = new Date();
  const updatedDate = new Date(story.updatedAt);
  const dueDate = story.dueDate ? new Date(story.dueDate) : null;
  const createdDate = new Date(story.createdAt);
  
  const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  // Rule 1: Explicitly Blocked
  if (story.status === 'Blocked') {
    return {
      type: 'Blocked',
      days: daysSinceUpdate,
      description: `Blocked for ${daysSinceUpdate} days`,
      color: 'border-red-500 bg-red-50 text-red-700'
    };
  }

  // Rule 2: Overdue
  if (dueDate && dueDate < now) {
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      type: 'Overdue',
      days: daysOverdue,
      description: `Overdue by ${daysOverdue} days`,
      color: 'border-rose-500 bg-rose-50 text-rose-700'
    };
  }

  // Rule 3: Stale (No updates in 7+ days)
  if (daysSinceUpdate >= 7) {
    return {
      type: 'Stale',
      days: daysSinceUpdate,
      description: `No updates in ${daysSinceUpdate} days`,
      color: 'border-orange-500 bg-orange-50 text-orange-700'
    };
  }

  // Rule 4: Stuck (In progress but not updated recently - 5+ days)
  if (story.status === 'In Progress' && daysSinceUpdate >= 5) {
    return {
      type: 'Stuck',
      days: daysSinceUpdate,
      description: `Stuck in progress for ${daysSinceUpdate} days`,
      color: 'border-yellow-500 bg-yellow-50 text-yellow-700'
    };
  }

  return null;
}
