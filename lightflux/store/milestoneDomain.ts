import { Milestone, MilestoneType } from '../types/todo';

export const MILESTONE_TYPE_THEME: Record<
  MilestoneType,
  { color: string; icon: string }
> = {
  anniversary: {
    color: '#F28B82',
    icon: 'heart-outline',
  },
  countdown: {
    color: '#6D8DF5',
    icon: 'hourglass-outline',
  },
  birthday: {
    color: '#F2A65A',
    icon: 'gift-outline',
  },
  holiday: {
    color: '#55B9A5',
    icon: 'balloon-outline',
  },
  custom: {
    color: '#8B7EFF',
    icon: 'sparkles-outline',
  },
};

export const milestoneState = (allMilestones: Milestone[]) => ({
  allMilestones,
  milestones: allMilestones.filter(
    (milestone) =>
      milestone.trashedAt === null && milestone.archivedAt === null,
  ),
  archivedMilestones: allMilestones.filter(
    (milestone) =>
      milestone.trashedAt === null && milestone.archivedAt !== null,
  ),
  trashedMilestones: allMilestones.filter(
    (milestone) => milestone.trashedAt !== null,
  ),
});
