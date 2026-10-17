import type { ImageMetadata } from 'astro';
import catalog from '../data/games.json';

export type Group = { id: string; label: string };

export type Game = {
  id: string;
  name: string;
  category: string;
  group: string;
  desc: string;
  rating?: number;
  votes?: number;
  contentRating: string;
  media: string;
  banner?: string;
  appStore?: string;
  featured?: boolean;
  note?: string;
};

export type GameWithImages = Game & { icon: ImageMetadata; bannerImage: ImageMetadata };

const images = import.meta.glob<{ default: ImageMetadata }>('../assets/games/*/*.{png,jpg}', { eager: true });

function image(dir: string, file: string): ImageMetadata {
  const found = images[`../assets/games/${dir}/${file}`];
  if (!found) throw new Error(`Missing image src/assets/games/${dir}/${file}`);
  return found.default;
}

export const groups: Group[] = catalog.groups;

export const games: GameWithImages[] = (catalog.games as Game[]).map((g) => ({
  ...g,
  icon: image(g.media, 'launcher.png'),
  bannerImage: image(g.media, g.banner ?? 'play_store_graphic.png'),
}));

export const playUrl = (id: string) => `https://play.google.com/store/apps/details?id=${id}`;
export const appStoreUrl = (id: string) => `https://apps.apple.com/app/id${id}`;
export const PLAY_DEVELOPER_URL = 'https://play.google.com/store/apps/dev?id=8228670503574649511';
export const SUPPORT_EMAIL = 'support@emberfox.online';
