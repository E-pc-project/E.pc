export interface Game {
  id: string
  name: string
  genre: string
  price: number // per hour in MNT
  players: string
  description: string
  color: string // neon accent
  icon: string // emoji-free, just a short code label
  tag?: string
}

export interface EsportsCenter {
  id: string
  name: string
  district: string
  address: string
  phone: string
  pcCount: number
  pricePerHour: number
  rating: number
  reviewCount: number
  openHours: string
  amenities: string[]
  // grid position (percent x, y)
  x: number
  y: number
  color: string
}

export interface Review {
  centerId: string
  userName: string
  rating: number
  comment: string
  date: string
}

export const GAMES: Game[] = [
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    genre: 'FPS',
    price: 3000,
    players: '5v5',
    description: 'Дэлхийн хамгийн алдартай tactical shooter. CT vs T командууд.',
    color: '#f97316',
    icon: 'CS2',
    tag: 'TOP',
  },
  {
    id: 'valorant',
    name: 'Valorant',
    genre: 'Tactical FPS',
    price: 3000,
    players: '5v5',
    description: 'Riot Games-ийн tactical shooter. Unique agent abilities.',
    color: '#ff2d78',
    icon: 'VAL',
    tag: 'HOT',
  },
  {
    id: 'dota2',
    name: 'Dota 2',
    genre: 'MOBA',
    price: 2500,
    players: '5v5',
    description: 'Valve-ийн MOBA тоглоом. 120+ hero, гүнзгий strategy.',
    color: '#c026d3',
    icon: 'D2',
  },
  {
    id: 'lol',
    name: 'League of Legends',
    genre: 'MOBA',
    price: 2500,
    players: '5v5',
    description: 'Дэлхийн хамгийн их тоглогддог MOBA тоглоом.',
    color: '#00d4ff',
    icon: 'LoL',
  },
  {
    id: 'pubg',
    name: 'PUBG: Battlegrounds',
    genre: 'Battle Royale',
    price: 3500,
    players: '1-4',
    description: '100 тоглогч battle royale. Реалист график, тактик тоглолт.',
    color: '#eab308',
    icon: 'PBG',
    tag: 'NEW',
  },
  {
    id: 'fc25',
    name: 'EA Sports FC 25',
    genre: 'Sports',
    price: 2000,
    players: '1v1',
    description: 'Хөлбөмбөгийн симулятор. Ultimate Team, Career режимүүд.',
    color: '#22c55e',
    icon: 'FC25',
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    genre: 'Battle Royale FPS',
    price: 3000,
    players: '3v3',
    description: 'EA-ийн fast-paced battle royale. Legend abilities.',
    color: '#ef4444',
    icon: 'APX',
  },
  {
    id: 'ow2',
    name: 'Overwatch 2',
    genre: 'Hero Shooter',
    price: 2500,
    players: '5v5',
    description: 'Blizzard-ийн hero shooter. Tank, DPS, Support.',
    color: '#f97316',
    icon: 'OW2',
  },
  {
    id: 'r6s',
    name: 'Rainbow Six Siege',
    genre: 'Tactical FPS',
    price: 3500,
    players: '5v5',
    description: 'Ubisoft-ийн tactical shooter. Operator abilities, destructible env.',
    color: '#00d4ff',
    icon: 'R6S',
  },
  {
    id: 'genshin',
    name: 'Genshin Impact',
    genre: 'Action RPG',
    price: 2000,
    players: '1-4',
    description: 'Open world action RPG. Teyvat дэлхийд аялах.',
    color: '#a855f7',
    icon: 'GEN',
  },
  {
    id: 'wow',
    name: 'World of Warcraft',
    genre: 'MMORPG',
    price: 2500,
    players: 'MMO',
    description: 'Blizzard-ийн legendary MMORPG. Raid, dungeon, PvP.',
    color: '#f59e0b',
    icon: 'WoW',
  },
  {
    id: 'fortnite',
    name: 'Fortnite',
    genre: 'Battle Royale',
    price: 2500,
    players: '1-4',
    description: 'Epic-ийн battle royale. Building mechanics, seasonial events.',
    color: '#8b5cf6',
    icon: 'FTN',
    tag: 'HOT',
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    genre: 'Sandbox',
    price: 2000,
    players: '1-8',
    description: 'Дэлхийн хамгийн их зарагдсан тоглоом. Build, survive, explore.',
    color: '#84cc16',
    icon: 'MC',
  },
  {
    id: 'gta5',
    name: 'GTA V Online',
    genre: 'Open World',
    price: 3000,
    players: '1-30',
    description: 'Rockstar-ийн open world action. Los Santos-д чөлөөтэй тоглох.',
    color: '#14b8a6',
    icon: 'GTA',
  },
  {
    id: 'rocketleague',
    name: 'Rocket League',
    genre: 'Sports',
    price: 2000,
    players: '3v3',
    description: 'Машинтай хөлбөмбөг. Unique mechanics, competitive esports.',
    color: '#06b6d4',
    icon: 'RL',
  },
  {
    id: 'deadlock',
    name: 'Deadlock',
    genre: 'Hero Shooter MOBA',
    price: 3500,
    players: '6v6',
    description: 'Valve-ийн шинэ MOBA shooter hybrid. Early access.',
    color: '#ff2d78',
    icon: 'DLK',
    tag: 'NEW',
  },
  {
    id: 'starcraft2',
    name: 'StarCraft II',
    genre: 'RTS',
    price: 2000,
    players: '1v1',
    description: 'Blizzard-ийн legendary RTS. Pro scene-д хамгийн хүчтэй нэг.',
    color: '#3b82f6',
    icon: 'SC2',
  },
  {
    id: 'tekken8',
    name: 'Tekken 8',
    genre: 'Fighting',
    price: 2500,
    players: '1v1',
    description: 'Namco-ийн 3D fighting game. 32 character roster.',
    color: '#ef4444',
    icon: 'T8',
    tag: 'NEW',
  },
  {
    id: 'eldenring',
    name: 'Elden Ring',
    genre: 'Action RPG',
    price: 3000,
    players: '1-3',
    description: 'FromSoftware-ийн masterpiece. Open world soulslike.',
    color: '#d4a017',
    icon: 'ER',
  },
  {
    id: 'lethal',
    name: 'Lethal Company',
    genre: 'Horror Co-op',
    price: 2500,
    players: '1-4',
    description: 'Indie co-op horror. Хамт найзуудтайгаа monster-аас дүүрэх.',
    color: '#22c55e',
    icon: 'LC',
    tag: 'HOT',
  },
]

export const CENTERS: EsportsCenter[] = []
