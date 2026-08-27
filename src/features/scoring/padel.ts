import { awardPoint, pointLabel, situation } from './engine';
import { PADEL_DEFAULT_FORMAT, type RuleSet } from './types';

/**
 * The padel ruleset.
 *
 * V1 ships only this. It conforms to RuleSet so a second sport is a new file
 * rather than a refactor — see the end of 03-scoring-engine.md for what
 * badminton would change (rally scoring to 21, cap 30, serve follows the point
 * winner rather than alternating by game).
 */
export const padel: RuleSet = {
  id: 'padel',
  label: 'Padel',
  defaultFormat: PADEL_DEFAULT_FORMAT,
  pointLabel,
  reduce: awardPoint,
  situation,
};

export const RULE_SETS = { padel } as const;

export const getRuleSet = (id: keyof typeof RULE_SETS) => RULE_SETS[id];
