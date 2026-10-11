import { AnimeHome } from '@/components/home/AnimeHome';
import { animeHomeMarkup } from '@/data/anime-home-markup';
import '@/styles/anime-core.css';
import '@/styles/anime-home.css';

export function AnimeHomePage() {
  return <AnimeHome markup={animeHomeMarkup} />;
}
