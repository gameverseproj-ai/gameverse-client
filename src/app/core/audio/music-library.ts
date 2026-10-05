import { MusicGenre } from '../models/music.model';
export interface MusicTrack { title: string; artist: string; src: string; source: string; license: string }
export const MUSIC_TRACKS: Record<MusicGenre, readonly MusicTrack[]> = {
  "rock": [
    {
      "title": "Twisted",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/twisted.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400046",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Exhilarate",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/exhilarate.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300028",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Breakdown",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/breakdown.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100796",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Slow Burn",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/slow-burn.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100609",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Noise Attack",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/noise-attack.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100629",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Motivator",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/motivator.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100803",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    }
  ],
  "pop": [
    {
      "title": "Newer Wave",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/newer-wave.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2000024",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Shiny Tech",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/shiny-tech.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100078",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Super Power Cool Dude",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/super-power-cool-dude.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600036",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "What Is Love",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/what-is-love.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500067",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Rhinoceros",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/rhinoceros.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500040",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Pinball Spring 160",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/pinball-spring-160.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100742",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    }
  ],
  "funk": [
    {
      "title": "Funky Chunk",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/funky-chunk.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500054",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Cold Funk",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/cold-funk.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100499",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Got Funk",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/got-funk.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200005",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Flutey Funk",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/flutey-funk.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100519",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Just Nasty",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/just-nasty.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100518",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Enter the Party",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/enter-the-party.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100240",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    }
  ],
  "trance": [
    {
      "title": "Mercury",
      "artist": "Shane Ivers",
      "src": "/assets/music/mercury.mp3",
      "source": "https://www.silvermansound.com/free-music/mercury",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Nightchaser",
      "artist": "Shane Ivers",
      "src": "/assets/music/nightchaser.mp3",
      "source": "https://www.silvermansound.com/free-music/nightchaser",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Big Trance",
      "artist": "Kris Klavenes",
      "src": "/assets/music/big-trance.mp3",
      "source": "https://opengameart.org/content/big-trance-by-kris-klavenes-for-game",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Trance Battle",
      "artist": "MintoDog",
      "src": "/assets/music/trance-battle.mp3",
      "source": "https://opengameart.org/content/trance-battle",
      "license": "https://creativecommons.org/publicdomain/zero/1.0/"
    },
    {
      "title": "Trance Boss Battle",
      "artist": "MintoDog",
      "src": "/assets/music/trance-boss-battle.mp3",
      "source": "https://opengameart.org/content/trance-boss-battle",
      "license": "https://creativecommons.org/publicdomain/zero/1.0/"
    },
    {
      "title": "Silver",
      "artist": "SOUND AIRYLUVS by ISAo",
      "src": "/assets/music/silver.mp3",
      "source": "https://opengameart.org/content/progressive-trance-edm-silver",
      "license": "https://opengameart.org/content/oga-by-30-faq"
    }
  ],
  "metal": [
    {
      "title": "Metalmania",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/metalmania.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700023",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Aggressor",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/aggressor.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700051",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Feral Angel Waltz",
      "artist": "Kevin MacLeod feat. Alexander Nakarada",
      "src": "/assets/music/feral-angel-waltz.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100010",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Burn The World Waltz",
      "artist": "Kevin MacLeod feat. Alexander Nakarada",
      "src": "/assets/music/burn-the-world-waltz.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100009",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Waltz Primordial",
      "artist": "Kevin MacLeod feat. Alexander Nakarada",
      "src": "/assets/music/waltz-primordial.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100008",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Heavy Battle 2",
      "artist": "MintoDog",
      "src": "/assets/music/heavy-battle-2.mp3",
      "source": "https://opengameart.org/content/heavy-battle-2",
      "license": "https://creativecommons.org/publicdomain/zero/1.0/"
    }
  ],
  "lounge": [
    {
      "title": "Bossa Antigua",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/bossa-antigua.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700069",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "BossaBossa",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/bossabossa.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600055",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Suave Standpipe",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/suave-standpipe.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500078",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Local Forecast - Slower",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/local-forecast-slower.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300011",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Daybreak",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/daybreak.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100266",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    },
    {
      "title": "Sincerely",
      "artist": "Kevin MacLeod",
      "src": "/assets/music/sincerely.mp3",
      "source": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1900016",
      "license": "https://creativecommons.org/licenses/by/4.0/"
    }
  ]
};
