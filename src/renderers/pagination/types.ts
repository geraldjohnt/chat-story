export interface PaginatedShot<T> {
  /** Screenshot data containing only this page's content. */
  shot: T;
  page: number;
  pages: number;
  contentHeight: number;
  capacity: number;
  /** True if some content could not be fit even after splitting. */
  overflow: boolean;
}
