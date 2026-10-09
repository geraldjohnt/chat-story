import { useLibrary } from '../features/library/LibraryContext';

export function useStoryEntry(storyId: string | undefined) {
  const lib = useLibrary();
  const item = lib.library?.stories.find((s) => s.entry.id === storyId) ?? null;
  return { ...lib, item };
}
