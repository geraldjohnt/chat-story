export const pad2 = (n: number) => String(n).padStart(2, '0');

/** story-0001-part-01-screenshot-01.png */
export function screenshotFilename(storyId: string, partNumber: number, index: number): string {
  return `story-${storyId}-part-${pad2(partNumber)}-screenshot-${pad2(index)}.png`;
}

/** story-0001-part-01-screenshots.zip */
export function zipFilename(storyId: string, partNumber: number): string {
  return `story-${storyId}-part-${pad2(partNumber)}-screenshots.zip`;
}
