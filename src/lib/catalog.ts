import type { CategoryId, Lang, TaskStatus, User } from "./types";
import { uiText } from "./i18n";
import { countsAsOpenJob, MIN_OFFER_INR } from "./workflow";

export const NEW_HELPER_TASKS = 5;
export const NEW_HELPER_CAP = 1000;

export const PLATFORM_FEE = 0.1;
export const CITY = "Rishikesh";

export const CATEGORIES: {
  id: CategoryId;
  emoji: string;
  en: string;
  hi: string;
}[] = [
  { id: "accommodation", emoji: "🏠", en: "Accommodation help", hi: "रहने की मदद" },
  { id: "transport", emoji: "🚕", en: "Transport / pickup", hi: "ट्रांसपोर्ट / पिकअप" },
  { id: "scooter", emoji: "🛵", en: "Scooter / bike", hi: "स्कूटर / बाइक" },
  { id: "luggage", emoji: "🧳", en: "Luggage assistance", hi: "सामान की मदद" },
  { id: "guide", emoji: "🗺️", en: "Local guide", hi: "लोकल गाइड" },
  { id: "shopping", emoji: "🛒", en: "Shopping / grocery", hi: "खरीदारी / राशन" },
  { id: "delivery", emoji: "📦", en: "Delivery / pickup", hi: "डिलीवरी / पिकअप" },
  { id: "tech", emoji: "💻", en: "Laptop / phone help", hi: "लैपटॉप / फोन" },
  { id: "translation", emoji: "🗣️", en: "Translation", hi: "अनुवाद" },
  { id: "photo", emoji: "📸", en: "Photography", hi: "फोटोग्राफी" },
  { id: "wellness", emoji: "🧘", en: "Yoga / wellness", hi: "योग / वेलनेस" },
  { id: "cleaning", emoji: "🧹", en: "Cleaning / household", hi: "सफाई / घर का काम" },
  { id: "repair", emoji: "🔧", en: "Repair", hi: "मरम्मत" },
  { id: "other", emoji: "📍", en: "Other", hi: "अन्य" },
];

export const AREAS: { id: string; en: string; hi: string; x: number; y: number; lat: number; lng: number }[] = [
  { id: "tapovan", en: "Tapovan", hi: "तपोवन", x: 70, y: 22, lat: 30.133, lng: 78.3235 },
  { id: "laxman", en: "Laxman Jhula", hi: "लक्ष्मण झूला", x: 54, y: 40, lat: 30.1268, lng: 78.329 },
  { id: "ram", en: "Ram Jhula", hi: "राम झूला", x: 40, y: 54, lat: 30.1178, lng: 78.3175 },
  { id: "swarg", en: "Swarg Ashram", hi: "स्वर्ग आश्रम", x: 48, y: 47, lat: 30.1198, lng: 78.321 },
  { id: "muni", en: "Muni Ki Reti", hi: "मुनि की रेती", x: 28, y: 32, lat: 30.1195, lng: 78.3105 },
  { id: "highbank", en: "High Bank", hi: "हाई बैंक", x: 76, y: 36, lat: 30.136, lng: 78.32 },
  { id: "triveni", en: "Triveni Ghat", hi: "त्रिवेणी घाट", x: 22, y: 74, lat: 30.105, lng: 78.299 },
];

export const WHENS: { id: string; en: string; hi: string; rank: number }[] = [
  { id: "today-5", en: "Today, 5 PM", hi: "आज, शाम 5 बजे", rank: 0 },
  { id: "today-eve", en: "Today, evening", hi: "आज, शाम", rank: 1 },
  { id: "tomorrow-10", en: "Tomorrow, 10 AM", hi: "कल, सुबह 10 बजे", rank: 2 },
  { id: "custom", en: "Other time", hi: "दूसरा समय", rank: 3 },
];

const BANNED =
  /\b(weapon|gun|pistol|rifle|drug|cocaine|heroin|weed|escort|prostitut|sexual service|fake id|fake passport|stolen|hitman|explosive|bomb)\b|हथियार|नशा|ड्रग|वेश्या/i;

const PHRASES: { en: string; hi: string }[] = [
  {
    en: "need someone to pick up my luggage",
    hi: "किसी को मेरा सामान उठाना है",
  },
  {
    en: "2 bags, need help taking them to my hostel",
    hi: "2 बैग हैं, इन्हें मेरे हॉस्टल तक ले जाने में मदद चाहिए",
  },
  {
    en: "need help taking scooter to mechanic",
    hi: "स्कूटर को मैकेनिक तक ले जाने में मदद चाहिए",
  },
  {
    en: "it will not start. mechanic is near laxman jhula.",
    hi: "स्टार्ट नहीं हो रहा। मैकेनिक लक्ष्मण झूला के पास है।",
  },
  {
    en: "need hindi to english help for 1 hour",
    hi: "1 घंटे के लिए हिंदी से अंग्रेज़ी मदद चाहिए",
  },
  {
    en: "clinic visit. i need someone who can translate clearly.",
    hi: "क्लिनिक जाना है। किसी ऐसे व्यक्ति की ज़रूरत है जो साफ़ अनुवाद कर सके।",
  },
  {
    en: "grocery run at the local market",
    hi: "लोकल मार्केट से राशन लाना है",
  },
  {
    en: "rice, fruit, and drinking water for the guesthouse.",
    hi: "गेस्टहाउस के लिए चावल, फल, और पीने का पानी।",
  },
  {
    en: "i need someone to help me find a local sim card.",
    hi: "मुझे लोकल सिम कार्ड ढूँढने में मदद चाहिए।",
  },
  {
    en: "you are connected. keep the task and payment inside localmate.",
    hi: "आप जुड़ गए हैं। काम और पेमेंट LocalMate के अंदर ही रखें।",
  },
  { en: "i can do this", hi: "मैं यह कर सकता हूँ" },
  { en: "i can do this.", hi: "मैं यह कर सकता हूँ।" },
  { en: "on my way", hi: "मैं रास्ते में हूँ" },
  { en: "i have arrived", hi: "मैं पहुँच गया हूँ" },
  { en: "where should we meet?", hi: "हम कहाँ मिलें?" },
  { en: "very helpful and arrived on time.", hi: "बहुत मददगार थे और समय पर आए।" },
];

const EN_HI: Record<string, string> = {
  i: "मैं",
  need: "चाहिए",
  someone: "किसी",
  help: "मदद",
  luggage: "सामान",
  bags: "बैग",
  bag: "बैग",
  hostel: "हॉस्टल",
  scooter: "स्कूटर",
  mechanic: "मैकेनिक",
  today: "आज",
  tomorrow: "कल",
  evening: "शाम",
  morning: "सुबह",
  market: "मार्केट",
  grocery: "राशन",
  water: "पानी",
  translate: "अनुवाद",
  translation: "अनुवाद",
  hindi: "हिंदी",
  english: "अंग्रेज़ी",
  hour: "घंटा",
  please: "कृपया",
  thanks: "धन्यवाद",
  thank: "धन्यवाद",
  you: "आप",
  where: "कहाँ",
  meet: "मिलें",
  arrived: "पहुँच गया",
  way: "रास्ते",
  local: "लोकल",
  sim: "सिम",
  card: "कार्ड",
  find: "ढूँढना",
  pickup: "पिकअप",
  pick: "लेना",
  up: "",
  my: "मेरा",
  to: "तक",
  the: "",
  a: "",
  for: "के लिए",
  and: "और",
  with: "के साथ",
  near: "पास",
  ghat: "घाट",
  bridge: "पुल",
  photo: "फोटो",
  yoga: "योग",
  cleaning: "सफाई",
  repair: "मरम्मत",
  phone: "फोन",
  laptop: "लैपटॉप",
  guide: "गाइड",
  hotel: "होटल",
  yes: "हाँ",
  no: "नहीं",
  ok: "ठीक है",
  okay: "ठीक है",
};

const HI_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_HI)
    .filter(([, hi]) => hi)
    .map(([en, hi]) => [hi, en]),
);

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function splitFee(amount: number) {
  const fee = Math.round(amount * PLATFORM_FEE);
  return { fee, helper: amount - fee, total: amount };
}

export function tx(lang: Lang, en: string, hi: string) {
  return uiText(lang, en, hi);
}

export function categoryLabel(category: { en: string; hi: string }, lang: Lang) {
  return tx(lang, category.en, category.hi);
}

export function isCategory(value: string): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

export function categoryById(id: CategoryId) {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function areaById(id: string) {
  return AREAS.find((area) => area.id === id) ?? AREAS[0];
}

export function areaName(id: string, lang: Lang) {
  const area = areaById(id);
  return lang === "hi" ? area.hi : area.en;
}

export function whenById(id: string) {
  return WHENS.find((when) => when.id === id) ?? WHENS[0];
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function roundKm(km: number) {
  return km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
}

export function kmBetween(a: string, b: string) {
  const from = areaById(a);
  const to = areaById(b);
  if (from.id === to.id) return 0.3;
  return Math.max(0.3, roundKm(haversineKm(from.lat, from.lng, to.lat, to.lng)));
}

export function kmFromPoint(lat: number, lng: number, areaId: string) {
  const to = areaById(areaId);
  return roundKm(haversineKm(lat, lng, to.lat, to.lng));
}

export function nearestArea(lat: number, lng: number) {
  return AREAS.slice().sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng))[0];
}

export const RISHIKESH = { lat: 30.1087, lng: 78.2946 };

export function mapsEmbedUrl(lat: number, lng: number, zoom = 15) {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function mapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}

export function mapsPlaceUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function isBanned(text: string) {
  return BANNED.test(text);
}

export function translate(text: string, to: Lang) {
  if (to !== "hi" && to !== "en") return text;
  const trimmed = text.trim();
  const key = trimmed.toLowerCase();
  const phrase = PHRASES.find((item) => item.en === key || item.hi === trimmed);
  if (phrase) {
    if (to === "hi") return phrase.hi;
    if (phrase.en === key) return trimmed;
    return phrase.en;
  }

  const dict = to === "hi" ? EN_HI : HI_EN;
  let changed = false;
  const out = text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const bare = part.toLowerCase().replace(/^[^a-z0-9\u0900-\u097f]+|[^a-z0-9\u0900-\u097f]+$/gi, "");
      const hit = dict[bare];
      if (!hit) return part;
      changed = true;
      return part.replace(new RegExp(bare, "i"), hit);
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();

  return changed ? out : text;
}

export function localize(original: string, preset: string | undefined, lang: Lang) {
  if (lang === "hi") return preset || translate(original, "hi");
  return original;
}

export function timeAgo(iso: string, lang: Lang) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return tx(lang, "Just now", "अभी");
  if (minutes < 60) return tx(lang, "{n}m ago", "{n} मि पहले").replaceAll("{n}", String(minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 24) return tx(lang, "{n}h ago", "{n} घं पहले").replaceAll("{n}", String(hours));
  const days = Math.round(hours / 24);
  return tx(lang, "{n}d ago", "{n} दि पहले").replaceAll("{n}", String(days));
}

export function workerCategories(user: User) {
  return user.categories ?? [];
}

export function isClearedHelper(user: User) {
  return (
    user.role === "helper" &&
    user.phoneVerified &&
    user.identityVerified &&
    user.conductAccepted === true &&
    workerCategories(user).length > 0
  );
}

export type WorkerBlock = "setup" | "id" | "category" | "amount" | "busy" | "low";

export function openJobCount(
  tasks: { id: string; helperId?: string; status: string }[],
  offers: { helperId: string; taskId: string }[],
  helperId: string,
  ignoreTaskId?: string,
) {
  const active = tasks.filter(
    (task) =>
      task.helperId === helperId &&
      countsAsOpenJob((task.status as TaskStatus) || "looking"),
  ).length;
  const pending = offers.filter((offer) => {
    if (offer.helperId !== helperId || offer.taskId === ignoreTaskId) return false;
    const task = tasks.find((item) => item.id === offer.taskId);
    return task?.status === "looking";
  }).length;
  return active + pending;
}

export function workerBlock(
  user: User,
  task: { category: CategoryId; budget: number; priceMode: "fixed" | "negotiable" },
  amount: number,
  openCount: number,
): WorkerBlock | null {
  if (!user.phoneVerified || user.conductAccepted !== true || workerCategories(user).length === 0) return "setup";
  if (!user.identityVerified) return "id";
  if (!workerCategories(user).includes(task.category)) return "category";
  const price = task.priceMode === "fixed" ? task.budget : amount;
  if (!Number.isFinite(price) || price < MIN_OFFER_INR) return "low";
  const newbie = user.tasksCompleted < NEW_HELPER_TASKS;
  if (newbie && price > NEW_HELPER_CAP) return "amount";
  if (openCount >= (newbie ? 1 : 3)) return "busy";
  return null;
}

export function taskHref(status: string, id: string) {
  if (status === "active" || status === "awaiting_customer_confirmation" || status === "flagged") return `/task/${id}/work`;
  if (status === "pay") return `/task/${id}/pay`;
  if (status === "review") return `/task/${id}/review`;
  if (status === "matched") return `/task/${id}/chat`;
  return `/task/${id}`;
}
