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
    description: 'Дэлхийн хамгийн алдартай tactical shooter — Counter-Terrorist ба Terrorist хоёр тал бөмбөг тавих, саармагжуулах зорилготойгоор нарийн aim, buy-round эдийн засгийн стратегиар тулалддаг. Дэлхийн хамгийн том Major тэмцээнүүд энд болдог.',
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
    description: 'Riot Games-ийн tactical shooter — нарийн aim-ийг Overwatch маягийн unique agent ability-тэй хослуулсан. 20 гаруй agent тус бүр өөрийн онцлог чадвартай тул баг бүрдүүлэлт, стратегийн сонголт маш өргөн.',
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
    description: 'Valve-ийн гүнзгий strategy MOBA — 120 гаруй hero, өргөн item build систем, багийн хамтын ажиллагаа шаардсан. The International тэмцээн нь дэлхийн хамгийн том mөнгөн шагналтай esports эвент.',
    color: '#c026d3',
    icon: 'D2',
  },
  {
    id: 'lol',
    name: 'League of Legends',
    genre: 'MOBA',
    price: 2500,
    players: '5v5',
    description: 'Дэлхийн хамгийн их тоглогддог MOBA — 160 гаруй champion, сурахад хялбар ч эзэмшихэд гүнзгий gameplay. Worlds аварга шалгаруулах тэмцээн нь дэлхийн хамгийн олон үзэгчтэй esports эвентүүдийн нэг.',
    color: '#00d4ff',
    icon: 'LoL',
  },
  {
    id: 'pubg',
    name: 'PUBG: Battlegrounds',
    genre: 'Battle Royale',
    price: 3500,
    players: '1-4',
    description: '100 тоглогчтой эх battle royale — тойргийн бүс багасах тусам loot цуглуулж, тээврийн хэрэгсэл ашиглан сүүлчийн амьд үлдэгч болохын төлөө тэмцдэг. Реалист ballistics, том газрын зураг нь тэвчээр, тактик шаарддаг.',
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
    description: 'EA Sports-ийн хамгийн шинэ хөлбөмбөгийн симулятор — Ultimate Team горимд карт цуглуулж мөрөөдлийн багаа бүрдүүлж, Career горимд клубоо удирдана. Лиценз бүхий баг, тамирчид, реалист физик тоглолттой.',
    color: '#22c55e',
    icon: 'FC25',
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    genre: 'Battle Royale FPS',
    price: 3000,
    players: '3v3',
    description: 'EA-ийн хурдтай battle royale — 3 хүний squad-аар тоглодог, өвөрмөц чадвар бүхий Legend-үүд, slide/wall-run зэрэг movement-т суурилсан gameplay. Ranked систем нь маш өрсөлдөөнтэй, pro league-тэй.',
    color: '#ef4444',
    icon: 'APX',
  },
  {
    id: 'ow2',
    name: 'Overwatch 2',
    genre: 'Hero Shooter',
    price: 2500,
    players: '5v5',
    description: 'Blizzard-ийн баг дээр суурилсан hero shooter — Tank, DPS, Support гэсэн 3 үүрэгтэй, тус бүр өвөрмөц чадвар бүхий hero сонгоно. Хурдтай, амьд өнгөт тоглоом бөгөөд Overwatch League дэлхийн pro тэмцээнтэй.',
    color: '#f97316',
    icon: 'OW2',
  },
  {
    id: 'r6s',
    name: 'Rainbow Six Siege',
    genre: 'Tactical FPS',
    price: 3500,
    players: '5v5',
    description: 'Ubisoft-ийн tactical shooter — бараг бүхэлдээ хагарах боломжтой орчинтой, Operator тус бүрийн онцгой gadget нь довтолгоо/хамгаалалтын стратегид чухал үүрэгтэй. Six Invitational дэлхийн тэмцээнтэй, идэвхтэй pro scene-тэй.',
    color: '#00d4ff',
    icon: 'R6S',
  },
  {
    id: 'genshin',
    name: 'Genshin Impact',
    genre: 'Action RPG',
    price: 2000,
    players: '1-4',
    description: 'miHoYo-гийн open world action RPG — Teyvat дэлхийг чөлөөтэй судлаж, gacha системээр character цуглуулж, элементийн combo combat-аар тулалддаг. Anime маягийн тод график, тогтмол үнэгүй content шинэчлэлттэй.',
    color: '#a855f7',
    icon: 'GEN',
  },
  {
    id: 'wow',
    name: 'World of Warcraft',
    genre: 'MMORPG',
    price: 2500,
    players: 'MMO',
    description: 'Blizzard-ийн legendary MMORPG — 20 гаруй жилийн түүхтэй, том хэмжээний raid, dungeon, PvP battleground-той. Alliance болон Horde хоёр faction, олон арван class/spec хослол бүхий гүнзгий RPG систем.',
    color: '#f59e0b',
    icon: 'WoW',
  },
  {
    id: 'fortnite',
    name: 'Fortnite',
    genre: 'Battle Royale',
    price: 2500,
    players: '1-4',
    description: 'Epic Games-ийн battle royale — өвөрмөц building mechanic ашиглан хурдан хамгаалалт барьж, тактик давуу тал олно. Улирал бүр шинэ газрын зураг, түүх, cross-over content нэмэгддэг тул тоглоом байнга шинэлэг байдаг.',
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
    description: 'Дэлхийн хамгийн их зарагдсан тоглоом — block ашиглан бүхэл дэлхий барих, амьд үлдэх, судлах sandbox. Creative болон Survival горимтой, олон найзтайгаа multiplayer server дээр хамтдаа тоглох боломжтой.',
    color: '#84cc16',
    icon: 'MC',
  },
  {
    id: 'gta5',
    name: 'GTA V Online',
    genre: 'Open World',
    price: 3000,
    players: '1-30',
    description: 'Rockstar-ийн open world action — Los Santos хотод чөлөөтэй аялж, heist хийж, уралдаж, эсвэл зүгээр л хот дундуур эргэлдэж болно. GTA Online горимд найзуудтайгаа бизнес удирдаж, PvP тэмцэлдэх боломжтой.',
    color: '#14b8a6',
    icon: 'GTA',
  },
  {
    id: 'rocketleague',
    name: 'Rocket League',
    genre: 'Sports',
    price: 2000,
    players: '3v3',
    description: 'Psyonix-ийн машинтай хөлбөмбөг — physics-based gameplay, агаарт үсрэн бөмбөг цохих онцгой mechanic шаарддаг. Хурдтай, өндөр skill ceiling-тэй бөгөөд spectator-д хамгийн хөгжилтэй esports тоглоомуудын нэг.',
    color: '#06b6d4',
    icon: 'RL',
  },
  {
    id: 'deadlock',
    name: 'Deadlock',
    genre: 'Hero Shooter MOBA',
    price: 3500,
    players: '6v6',
    description: 'Valve-ийн шинэ MOBA болон third-person shooter хосолсон hybrid — lane, hero, item build зэрэг MOBA элементийг shooter combat-той нэгтгэсэн. Early access шатандаа байгаа ч аль хэдийн том community цуглуулсан.',
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
    description: 'Blizzard-ийн legendary RTS — Terran, Protoss, Zerg гэсэн 3 race, өндөр APM шаардсан нарийн micro/macro менежмент. Дэлхийн хамгийн стратегийн гүнзгий тоглоомуудын нэг гэж тооцогддог, Солонгост pro scene хамгийн хүчтэй.',
    color: '#3b82f6',
    icon: 'SC2',
  },
  {
    id: 'tekken8',
    name: 'Tekken 8',
    genre: 'Fighting',
    price: 2500,
    players: '1v1',
    description: 'Bandai Namco-ийн 3D fighting game — 32 гаруй character roster, combo-д суурилсан хурдтай тулаан систем. Шинэ Heat систем нь довтолгооны механик нэмж, EVO зэрэг том FGC тэмцээнүүдэд тэргүүлэгч байдаг.',
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
    description: 'FromSoftware-ийн masterpiece — том open world дахь challenging soulslike combat, Жорж Р.Р. Мартинтай хамтарсан гүнзгий lore. Хэцүү boss тулаан, чөлөөт build систем нь тоглогчийг дахин дахин эргэн ирүүлдэг.',
    color: '#d4a017',
    icon: 'ER',
  },
  {
    id: 'lethal',
    name: 'Lethal Company',
    genre: 'Horror Co-op',
    price: 2500,
    players: '1-4',
    description: 'Indie co-op horror — 1-4 хүний багаар аюултай гаригуудад scrap цуглуулж, чудвар/monster-аас зугтаж, компанийн quota-г биелүүлнэ. Хачирхалтай хошин болон айдас хослосон, найзуудтайгаа тоглоход хамгийн хөгжилтэй.',
    color: '#22c55e',
    icon: 'LC',
    tag: 'HOT',
  },
]

export const CENTERS: EsportsCenter[] = []
