// Lightweight, dependency-free i18n: a flat key -> string dictionary per language, persisted to
// localStorage like the rest of the app's client state. Scope note: this covers navigation and
// every mode's hero copy (the text every screen shows immediately) plus the Settings page itself.
// Deep long-tail content -- the 51 badge descriptions, ~40 shop item blurbs, and the German legal
// pages (which must stay in German regardless of UI language -- that's a legal requirement, not a
// preference) is intentionally left untranslated rather than machine-translating it hastily.

export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_STORAGE_KEY = "rocketdraft.language";
const DEFAULT_LANGUAGE: LanguageCode = "en";

const en = {
  nav_freeplay: "FREEPLAY", nav_career: "CAREER", nav_ranked: "RANKED 1V1", nav_shop: "SHOP", nav_profile: "PROFILE", nav_settings: "SETTINGS",
  freeplay_kicker: "RLCS HISTORY • FREEPLAY DRAFT DATABASE", freeplay_title1: "CREATE YOUR", freeplay_title2: "CHAMPIONS.",
  freeplay_intro: "Five picks. One trophy. Every choice shapes your run through the Rocket League playoffs.",
  career_kicker: "RLCS CAREER • SEASON 1 TO THE PRESENT", career_title1: "CLIMB THE", career_title2: "LADDER.",
  career_intro: "One save file. Every RLCS season, in order. Each one is harder than the last — clear it to unlock the next.",
  ranked_kicker: "ALL-SEASONS PLAYER POOL • ALTERNATING RANKED DRAFT", ranked_title1: "BEAT THE", ranked_title2: "LADDER.",
  ranked_intro: "Queue first, then draft turn-by-turn against your opponent — watch their roster take shape right alongside yours.",
  ranked_find_match: "FIND MATCH",
  shop_kicker: "COSMETIC ONLY • NO GAMEPLAY EFFECT", shop_title1: "SPEND YOUR", shop_title2: "COINS.",
  shop_intro: "Everything here is pure flex. Ratings and simulations never change.",
  profile_kicker: "YOUR CARD", profile_title1: "PLAYER", profile_title2: "PROFILE.",
  settings_kicker: "PREFERENCES", settings_title1: "YOUR", settings_title2: "SETTINGS.",
  settings_intro: "Personal preferences, stored on this device.",
  settings_language_label: "DISPLAY LANGUAGE",
  settings_language_hint: "Legal pages (Impressum, Datenschutz, AGB) always stay in German.",
};

type Dict = typeof en;

const de: Dict = {
  nav_freeplay: "FREEPLAY", nav_career: "KARRIERE", nav_ranked: "RANKED 1V1", nav_shop: "SHOP", nav_profile: "PROFIL", nav_settings: "EINSTELLUNGEN",
  freeplay_kicker: "RLCS-GESCHICHTE • FREEPLAY-DRAFT-DATENBANK", freeplay_title1: "ERSCHAFFE DEINE", freeplay_title2: "CHAMPIONS.",
  freeplay_intro: "Fünf Picks. Ein Pokal. Jede Entscheidung prägt deinen Weg durch die Rocket-League-Playoffs.",
  career_kicker: "RLCS-KARRIERE • VON SEASON 1 BIS HEUTE", career_title1: "ERKLIMME DIE", career_title2: "LEITER.",
  career_intro: "Ein Spielstand. Jede RLCS-Season, der Reihe nach. Jede ist schwerer als die letzte — schlage sie, um die nächste freizuschalten.",
  ranked_kicker: "SPIELERPOOL ALLER SEASONS • ABWECHSELNDER RANKED-DRAFT", ranked_title1: "BEZWINGE DIE", ranked_title2: "RANGLISTE.",
  ranked_intro: "Erst ein Match suchen, dann abwechselnd draften — sieh zu, wie sich das Team deines Gegners Zug um Zug formt.",
  ranked_find_match: "MATCH SUCHEN",
  shop_kicker: "REIN KOSMETISCH • KEIN EINFLUSS AUFS GAMEPLAY", shop_title1: "GIB DEINE", shop_title2: "MÜNZEN AUS.",
  shop_intro: "Hier geht's nur ums Angeben. Ratings und Simulationen ändern sich nie.",
  profile_kicker: "DEINE KARTE", profile_title1: "SPIELER-", profile_title2: "PROFIL.",
  settings_kicker: "EINSTELLUNGEN", settings_title1: "DEINE", settings_title2: "EINSTELLUNGEN.",
  settings_intro: "Persönliche Einstellungen, lokal auf diesem Gerät gespeichert.",
  settings_language_label: "ANZEIGESPRACHE",
  settings_language_hint: "Rechtsseiten (Impressum, Datenschutz, AGB) bleiben immer auf Deutsch.",
};

const es: Dict = {
  nav_freeplay: "FREEPLAY", nav_career: "CARRERA", nav_ranked: "RANKED 1V1", nav_shop: "TIENDA", nav_profile: "PERFIL", nav_settings: "AJUSTES",
  freeplay_kicker: "HISTORIA DE LA RLCS • BASE DE DATOS DE DRAFT FREEPLAY", freeplay_title1: "CREA A TUS", freeplay_title2: "CAMPEONES.",
  freeplay_intro: "Cinco elecciones. Un trofeo. Cada decisión moldea tu camino por los playoffs de Rocket League.",
  career_kicker: "CARRERA RLCS • DE LA TEMPORADA 1 HASTA HOY", career_title1: "ESCALA LA", career_title2: "ESCALERA.",
  career_intro: "Una sola partida guardada. Cada temporada de la RLCS, en orden. Cada una más difícil que la anterior — supérala para desbloquear la siguiente.",
  ranked_kicker: "JUGADORES DE TODAS LAS TEMPORADAS • DRAFT RANKED POR TURNOS", ranked_title1: "VENCE A LA", ranked_title2: "LIGA.",
  ranked_intro: "Primero busca partida, luego draftea por turnos — observa cómo se forma la plantilla de tu rival, elección a elección.",
  ranked_find_match: "BUSCAR PARTIDA",
  shop_kicker: "SOLO ESTÉTICO • SIN EFECTO EN EL JUEGO", shop_title1: "GASTA TUS", shop_title2: "MONEDAS.",
  shop_intro: "Todo esto es pura estética. Las valoraciones y las simulaciones nunca cambian.",
  profile_kicker: "TU FICHA", profile_title1: "PERFIL DE", profile_title2: "JUGADOR.",
  settings_kicker: "PREFERENCIAS", settings_title1: "TUS", settings_title2: "AJUSTES.",
  settings_intro: "Preferencias personales, guardadas en este dispositivo.",
  settings_language_label: "IDIOMA DE VISUALIZACIÓN",
  settings_language_hint: "Las páginas legales (Impressum, Datenschutz, AGB) siempre permanecen en alemán.",
};

const fr: Dict = {
  nav_freeplay: "FREEPLAY", nav_career: "CARRIÈRE", nav_ranked: "RANKED 1V1", nav_shop: "BOUTIQUE", nav_profile: "PROFIL", nav_settings: "PARAMÈTRES",
  freeplay_kicker: "HISTOIRE DE LA RLCS • BASE DE DRAFT FREEPLAY", freeplay_title1: "CRÉE TES", freeplay_title2: "CHAMPIONS.",
  freeplay_intro: "Cinq choix. Un trophée. Chaque décision façonne ton parcours dans les playoffs de Rocket League.",
  career_kicker: "CARRIÈRE RLCS • DE LA SAISON 1 À AUJOURD'HUI", career_title1: "GRAVIS LA", career_title2: "HIÉRARCHIE.",
  career_intro: "Une seule sauvegarde. Chaque saison de la RLCS, dans l'ordre. Chacune plus difficile que la précédente — remporte-la pour débloquer la suivante.",
  ranked_kicker: "TOUS LES JOUEURS DE TOUTES LES SAISONS • DRAFT RANKED EN ALTERNANCE", ranked_title1: "DOMINE LE", ranked_title2: "CLASSEMENT.",
  ranked_intro: "Trouve d'abord un match, puis draft à tour de rôle — regarde l'effectif de ton adversaire se dévoiler pick après pick.",
  ranked_find_match: "TROUVER UN MATCH",
  shop_kicker: "PUREMENT COSMÉTIQUE • AUCUN EFFET SUR LE JEU", shop_title1: "DÉPENSE TES", shop_title2: "PIÈCES.",
  shop_intro: "Tout ici est purement esthétique. Les notes et les simulations ne changent jamais.",
  profile_kicker: "TA CARTE", profile_title1: "PROFIL", profile_title2: "JOUEUR.",
  settings_kicker: "PRÉFÉRENCES", settings_title1: "TES", settings_title2: "PARAMÈTRES.",
  settings_intro: "Préférences personnelles, enregistrées sur cet appareil.",
  settings_language_label: "LANGUE D'AFFICHAGE",
  settings_language_hint: "Les pages légales (Impressum, Datenschutz, AGB) restent toujours en allemand.",
};

const ru: Dict = {
  nav_freeplay: "FREEPLAY", nav_career: "КАРЬЕРА", nav_ranked: "RANKED 1V1", nav_shop: "МАГАЗИН", nav_profile: "ПРОФИЛЬ", nav_settings: "НАСТРОЙКИ",
  freeplay_kicker: "ИСТОРИЯ RLCS • БАЗА ДАННЫХ ДРАФТА FREEPLAY", freeplay_title1: "СОЗДАЙ СВОИХ", freeplay_title2: "ЧЕМПИОНОВ.",
  freeplay_intro: "Пять пиков. Один трофей. Каждое решение определяет твой путь через плей-офф Rocket League.",
  career_kicker: "КАРЬЕРА RLCS • ОТ 1-ГО СЕЗОНА ДО НАСТОЯЩЕГО ВРЕМЕНИ", career_title1: "ПОДНИМИСЬ ПО", career_title2: "ЛЕСТНИЦЕ.",
  career_intro: "Один файл сохранения. Каждый сезон RLCS по порядку. Каждый следующий сложнее предыдущего — пройди его, чтобы открыть следующий.",
  ranked_kicker: "ИГРОКИ ВСЕХ СЕЗОНОВ • ПОПЕРЕМЕННЫЙ РЕЙТИНГОВЫЙ ДРАФТ", ranked_title1: "ПОКОРИ", ranked_title2: "РЕЙТИНГ.",
  ranked_intro: "Сначала найди матч, затем драфть по очереди — смотри, как состав соперника раскрывается пик за пиком.",
  ranked_find_match: "НАЙТИ МАТЧ",
  shop_kicker: "ТОЛЬКО КОСМЕТИКА • НЕ ВЛИЯЕТ НА ИГРОВОЙ ПРОЦЕСС", shop_title1: "ТРАТЬ СВОИ", shop_title2: "МОНЕТЫ.",
  shop_intro: "Здесь всё только ради стиля. Рейтинги и симуляции никогда не меняются.",
  profile_kicker: "ТВОЯ КАРТОЧКА", profile_title1: "ПРОФИЛЬ", profile_title2: "ИГРОКА.",
  settings_kicker: "НАСТРОЙКИ", settings_title1: "ТВОИ", settings_title2: "НАСТРОЙКИ.",
  settings_intro: "Личные настройки, сохранённые на этом устройстве.",
  settings_language_label: "ЯЗЫК ИНТЕРФЕЙСА",
  settings_language_hint: "Юридические страницы (Impressum, Datenschutz, AGB) всегда остаются на немецком языке.",
};

const it: Dict = {
  nav_freeplay: "FREEPLAY", nav_career: "CARRIERA", nav_ranked: "RANKED 1V1", nav_shop: "NEGOZIO", nav_profile: "PROFILO", nav_settings: "IMPOSTAZIONI",
  freeplay_kicker: "STORIA DELLA RLCS • DATABASE DRAFT FREEPLAY", freeplay_title1: "CREA I TUOI", freeplay_title2: "CAMPIONI.",
  freeplay_intro: "Cinque scelte. Un trofeo. Ogni decisione plasma il tuo percorso nei playoff di Rocket League.",
  career_kicker: "CARRIERA RLCS • DALLA STAGIONE 1 A OGGI", career_title1: "SCALA LA", career_title2: "CLASSIFICA.",
  career_intro: "Un solo salvataggio. Ogni stagione RLCS, in ordine. Ognuna più difficile della precedente — superala per sbloccare la successiva.",
  ranked_kicker: "GIOCATORI DI TUTTE LE STAGIONI • DRAFT RANKED A TURNI ALTERNATI", ranked_title1: "DOMINA LA", ranked_title2: "CLASSIFICA.",
  ranked_intro: "Prima trova una partita, poi draftate a turno — guarda la squadra del tuo avversario prendere forma scelta dopo scelta.",
  ranked_find_match: "TROVA PARTITA",
  shop_kicker: "SOLO ESTETICO • NESSUN EFFETTO SUL GIOCO", shop_title1: "SPENDI LE TUE", shop_title2: "MONETE.",
  shop_intro: "Qui è tutta questione di stile. Valutazioni e simulazioni non cambiano mai.",
  profile_kicker: "LA TUA SCHEDA", profile_title1: "PROFILO", profile_title2: "GIOCATORE.",
  settings_kicker: "PREFERENZE", settings_title1: "LE TUE", settings_title2: "IMPOSTAZIONI.",
  settings_intro: "Preferenze personali, salvate su questo dispositivo.",
  settings_language_label: "LINGUA DELL'INTERFACCIA",
  settings_language_hint: "Le pagine legali (Impressum, Datenschutz, AGB) restano sempre in tedesco.",
};

const pl: Dict = {
  nav_freeplay: "FREEPLAY", nav_career: "KARIERA", nav_ranked: "RANKED 1V1", nav_shop: "SKLEP", nav_profile: "PROFIL", nav_settings: "USTAWIENIA",
  freeplay_kicker: "HISTORIA RLCS • BAZA DRAFTU FREEPLAY", freeplay_title1: "STWÓRZ SWOICH", freeplay_title2: "MISTRZÓW.",
  freeplay_intro: "Pięć wyborów. Jeden puchar. Każda decyzja kształtuje twoją drogę przez playoffy Rocket League.",
  career_kicker: "KARIERA RLCS • OD SEZONU 1 DO DZIŚ", career_title1: "WSPINAJ SIĘ PO", career_title2: "DRABINCE.",
  career_intro: "Jeden zapis gry. Każdy sezon RLCS po kolei. Każdy trudniejszy od poprzedniego — pokonaj go, by odblokować następny.",
  ranked_kicker: "PULA GRACZY ZE WSZYSTKICH SEZONÓW • NAPRZEMIENNY DRAFT RANKINGOWY", ranked_title1: "POKONAJ", ranked_title2: "DRABINKĘ.",
  ranked_intro: "Najpierw znajdź mecz, potem draftujcie na zmianę — obserwuj, jak skład przeciwnika kształtuje się wybór po wyborze.",
  ranked_find_match: "ZNAJDŹ MECZ",
  shop_kicker: "WYŁĄCZNIE KOSMETYCZNE • BRAK WPŁYWU NA ROZGRYWKĘ", shop_title1: "WYDAJ SWOJE", shop_title2: "MONETY.",
  shop_intro: "Tutaj chodzi wyłącznie o styl. Oceny i symulacje nigdy się nie zmieniają.",
  profile_kicker: "TWOJA KARTA", profile_title1: "PROFIL", profile_title2: "GRACZA.",
  settings_kicker: "PREFERENCJE", settings_title1: "TWOJE", settings_title2: "USTAWIENIA.",
  settings_intro: "Ustawienia osobiste, zapisane na tym urządzeniu.",
  settings_language_label: "JĘZYK WYŚWIETLANIA",
  settings_language_hint: "Strony prawne (Impressum, Datenschutz, AGB) zawsze pozostają w języku niemieckim.",
};

export const translations: Record<LanguageCode, Dict> = { en, de, es, fr, ru, it, pl };
export type TranslationKey = keyof Dict;

export function readLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return raw && raw in translations ? (raw as LanguageCode) : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function writeLanguage(code: LanguageCode) {
  try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code); } catch { /* ignore */ }
}
