export interface LyricsProvider {
  name: string;
  fetch(query: { artist?: string; title?: string }): Promise<string>;
}
