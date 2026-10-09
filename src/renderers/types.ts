import type { ComponentType } from 'react';
import type { Character, Screenshot, ScreenshotType } from '../types';
import type { TextMeasurer } from './measure';
import type { PaginatedShot } from './pagination/types';
import type { ExportProfile } from './profiles';

export type CharacterMap = ReadonlyMap<string, Character>;

export interface ScreenProps<T extends Screenshot = Screenshot> {
  shot: T;
  page: number;
  pages: number;
  profile: ExportProfile;
  characters: CharacterMap;
}

export interface RendererDefinition<T extends Screenshot = Screenshot> {
  type: T['type'];
  label: string;
  description: string;
  paginate(shot: T, profile: ExportProfile, measurer: TextMeasurer): PaginatedShot<T>[];
  Component: ComponentType<ScreenProps<T>>;
}

export type RendererRegistry = { [K in ScreenshotType]: RendererDefinition<Extract<Screenshot, { type: K }>> };

export function displayName(characters: CharacterMap, id: string | undefined): string {
  if (!id) return '';
  const c = characters.get(id);
  return c ? (c.contactName ?? c.name) : id;
}
