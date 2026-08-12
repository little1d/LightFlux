import type { Language } from '../types/todo';
import { en } from './en';
import type { Translation } from './types';
import { zh } from './zh';
export type { Translation } from './types';
export const translations: Record<Language, Translation> = { en, zh };
