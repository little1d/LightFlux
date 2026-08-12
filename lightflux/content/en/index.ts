import type { Translation } from '../types';
import { common } from './common';
import { today } from './today';
import { completed } from './completed';
import { settings } from './settings';
import { desktop } from './desktop';
import { statistics } from './statistics';
import { calendar } from './calendar';
import { groups } from './groups';
import { editor } from './editor';
import { agent } from './agent';
import { milestones } from './milestones';
import { trash } from './trash';
export const en: Translation = {
  ...common,
  ...today,
  completed,
  settings,
  desktop,
  statistics,
  calendar,
  groups,
  editor,
  agent,
  milestones,
  trash,
};
