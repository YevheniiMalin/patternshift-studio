"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleAlert,
  Download,
  FileImage,
  Languages,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languageNames, translations, type Language } from "@/app/i18n";

type Garment = "dress" | "top" | "skirt" | "trousers";
type Silhouette = "fitted" | "straight" | "aline";
type Sleeve = "none" | "short" | "long";
type Coverage = "front" | "frontBack" | "multi";
type Profile = "women" | "men";
type Size = "XS" | "S" | "M" | "L" | "XL";
type Measurements = {
  bust: number;
  waist: number;
  hips: number;
  shoulder: number;
  backLength: number;
  garmentLength: number;
};
type ReferenceImage = { name: string; url: string };

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const SIZE_PRESETS: Record<Profile, Record<Size, Pick<Measurements, "bust" | "waist" | "hips">>> = {
  women: {
    XS: { bust: 80, waist: 62, hips: 88 },
    S: { bust: 84, waist: 66, hips: 92 },
    M: { bust: 92, waist: 74, hips: 100 },
    L: { bust: 100, waist: 82, hips: 108 },
    XL: { bust: 110, waist: 92, hips: 118 },
  },
  men: {
    XS: { bust: 88, waist: 76, hips: 90 },
    S: { bust: 94, waist: 82, hips: 96 },
    M: { bust: 100, waist: 88, hips: 102 },
    L: { bust: 106, waist: 94, hips: 108 },
    XL: { bust: 114, waist: 102, hips: 116 },
  },
};

const en = {
  back: "Back to mode selection",
  eyebrow: "Create from visual references",
  title: "Build a preliminary pattern from images and measurements.",
  intro: "Upload photos, a sketch or a drawing, describe the garment and enter body measurements. PatternShift turns those confirmed inputs into a transparent base draft.",
  local: "Reference images stay in this browser",
  prototype: "Guided prototype",
  honestyTitle: "What this release does",
  honesty: "Images are used as visual references. The current release does not secretly invent hidden seams or perform full AI reconstruction; it combines your answers and measurements into a preliminary parametric pattern.",
  stepReference: "References",
  stepDesign: "Garment",
  stepMeasures: "Measurements",
  stepDraft: "Draft",
  referenceTitle: "Add visual references",
  referenceDesc: "A clean front photo is the minimum. A back and side view reduce the number of assumptions.",
  upload: "Choose images or drop them here",
  formats: "PNG, JPG or WebP · up to 4 images · 10 MB each",
  invalid: "Use PNG, JPG or WebP images smaller than 10 MB.",
  remove: "Remove reference image",
  coverageTitle: "Which views do you have?",
  coverageFront: "Front only",
  coverageFrontDesc: "Back and side details will be assumptions.",
  coverageBack: "Front + back",
  coverageBackDesc: "Main construction is visible from both sides.",
  coverageMulti: "Front + back + side",
  coverageMultiDesc: "Best current input for silhouette and depth.",
  nextDesign: "Describe the garment",
  designTitle: "Describe what the images show",
    designDesc: "These choices tell the generator what to construct, so it does not have to infer a fold or shadow.",
  garmentType: "Garment type",
  dress: "Dress",
  top: "Top / shirt",
  skirt: "Skirt",
  trousers: "Trousers",
  silhouette: "Silhouette",
  fitted: "Fitted",
  straight: "Straight",
  aline: "A-line",
  sleeves: "Sleeves",
  none: "Sleeveless",
  short: "Short",
  long: "Long",
  neckline: "Neckline",
  round: "Round",
  vneck: "V-neck",
  square: "Square",
  closure: "Closure",
  noClosure: "No visible closure",
  backClosure: "Back zipper / buttons",
  frontClosure: "Front zipper / buttons",
  sideClosure: "Side zipper",
  nextMeasures: "Add measurements",
  measuresTitle: "Set the real scale",
  measuresDesc: "Photos do not contain reliable centimetres. Use a size preset as a starting point, then replace it with the wearer’s actual measurements when possible.",
  profile: "Reference chart",
  women: "Women",
  men: "Men",
  targetSize: "Target size",
  applyPreset: "Fill from size chart",
  bust: "Bust / chest",
  waist: "Waist",
  hips: "Hips",
  shoulder: "Shoulder width",
  backLength: "Back waist length",
  garmentLength: "Finished garment length",
  ease: "Design ease",
  easeHelp: "Extra room added to the body measurements.",
  confirm: "I understand that hidden seams, darts, lining and fasteners must be checked manually.",
  generate: "Generate preliminary pattern",
  referenceSummary: "Reference quality",
  confidence: "Draft confidence",
  images: "images",
  visible: "Visible input",
  assumed: "Needs confirmation",
  visibleItems: ["Uploaded views", "Selected garment category", "Entered body measurements"],
  assumedItems: ["Hidden seams and darts", "Exact fabric behaviour", "Lining and internal construction"],
  resultTitle: "Your preliminary base pattern",
  resultDesc: "The generated SVG contains front and back pieces, grainlines, labels, a 10 cm control square and a stated seam allowance. Review it before resizing or cutting.",
  download: "Download preliminary SVG",
  openResize: "Open in resize studio",
  startOver: "Start over",
  draftLabel: "PRELIMINARY — VERIFY BEFORE CUTTING",
  frontPiece: "FRONT",
  backPiece: "BACK",
  sleevePiece: "SLEEVE",
  grainline: "GRAINLINE",
  controlSquare: "10 cm CONTROL",
    seamAllowance: "1.2 cm seam allowance reference",
  low: "More views are recommended",
  medium: "Useful starting point",
  high: "Strong reference set",
};

type CreateCopy = Omit<typeof en, "visibleItems" | "assumedItems"> & { visibleItems: string[]; assumedItems: string[] };

const copy: Record<Language, CreateCopy> = {
  en,
  ru: {
    back: "Назад к выбору режима",
    eyebrow: "Создание по визуальным ориентирам",
    title: "Создайте предварительную выкройку по изображениям и меркам.",
    intro: "Загрузите фотографии, эскиз или рисунок, опишите изделие и укажите мерки. PatternShift превратит подтверждённые данные в понятную базовую выкройку.",
    local: "Изображения остаются в этом браузере",
    prototype: "Пошаговый прототип",
    honestyTitle: "Что умеет эта версия",
    honesty: "Изображения используются как визуальные ориентиры. Текущая версия не придумывает скрытые швы и пока не выполняет полную AI-реконструкцию; она объединяет ваши ответы и мерки в предварительную параметрическую выкройку.",
    stepReference: "Изображения",
    stepDesign: "Изделие",
    stepMeasures: "Мерки",
    stepDraft: "Выкройка",
    referenceTitle: "Добавьте визуальные ориентиры",
    referenceDesc: "Минимум — чёткое фото спереди. Вид сзади и сбоку уменьшает количество предположений.",
    upload: "Выберите или перетащите изображения",
    formats: "PNG, JPG или WebP · до 4 изображений · по 10 МБ",
    invalid: "Используйте PNG, JPG или WebP размером меньше 10 МБ.",
    remove: "Удалить изображение",
    coverageTitle: "Какие виды у вас есть?",
    coverageFront: "Только спереди",
    coverageFrontDesc: "Задняя и боковая части будут предположениями.",
    coverageBack: "Спереди и сзади",
    coverageBackDesc: "Основная конструкция видна с двух сторон.",
    coverageMulti: "Спереди, сзади и сбоку",
    coverageMultiDesc: "Лучший вариант для силуэта и объёма.",
    nextDesign: "Описать изделие",
    designTitle: "Опишите, что видно на изображениях",
    designDesc: "Эти параметры прямо задают конструкцию, поэтому программе не приходится угадывать по складке или тени.",
    garmentType: "Тип изделия",
    dress: "Платье",
    top: "Топ / рубашка",
    skirt: "Юбка",
    trousers: "Брюки",
    silhouette: "Силуэт",
    fitted: "Прилегающий",
    straight: "Прямой",
    aline: "А-силуэт",
    sleeves: "Рукава",
    none: "Без рукавов",
    short: "Короткие",
    long: "Длинные",
    neckline: "Горловина",
    round: "Круглая",
    vneck: "V-образная",
    square: "Квадратная",
    closure: "Застёжка",
    noClosure: "Застёжка не видна",
    backClosure: "Молния / пуговицы сзади",
    frontClosure: "Молния / пуговицы спереди",
    sideClosure: "Боковая молния",
    nextMeasures: "Добавить мерки",
    measuresTitle: "Задайте реальный масштаб",
    measuresDesc: "По фотографии нельзя надёжно определить сантиметры. Используйте готовый размер как отправную точку, затем по возможности замените значения настоящими мерками.",
    profile: "Таблица размеров",
    women: "Женская",
    men: "Мужская",
    targetSize: "Целевой размер",
    applyPreset: "Заполнить по таблице",
    bust: "Грудь",
    waist: "Талия",
    hips: "Бёдра",
    shoulder: "Ширина плеч",
    backLength: "Длина спины до талии",
    garmentLength: "Длина готового изделия",
    ease: "Прибавка на свободу",
    easeHelp: "Дополнительный объём к меркам тела.",
    confirm: "Я понимаю, что скрытые швы, вытачки, подкладку и застёжки нужно проверить вручную.",
    generate: "Создать предварительную выкройку",
    referenceSummary: "Качество исходных данных",
    confidence: "Уверенность эскиза",
    images: "изображений",
    visible: "Подтверждённые данные",
    assumed: "Нужно подтвердить",
    visibleItems: ["Загруженные виды", "Выбранный тип изделия", "Введённые мерки тела"],
    assumedItems: ["Скрытые швы и вытачки", "Точное поведение ткани", "Подкладка и внутренняя конструкция"],
    resultTitle: "Ваша предварительная базовая выкройка",
    resultDesc: "SVG содержит детали переда и спинки, долевые линии, подписи, контрольный квадрат 10 см и указанный припуск. Проверьте его перед изменением размера или раскроем.",
    download: "Скачать предварительный SVG",
    openResize: "Открыть в редакторе размеров",
    startOver: "Начать заново",
    draftLabel: "ПРЕДВАРИТЕЛЬНО — ПРОВЕРИТЬ ДО РАСКРОЯ",
    frontPiece: "ПЕРЕД",
    backPiece: "СПИНКА",
    sleevePiece: "РУКАВ",
    grainline: "ДОЛЕВАЯ ЛИНИЯ",
    controlSquare: "КОНТРОЛЬ 10 см",
    seamAllowance: "Ориентир припуска: 1,2 см",
    low: "Рекомендуются дополнительные виды",
    medium: "Полезная отправная точка",
    high: "Хороший комплект изображений",
  },
  fi: {
    back: "Takaisin tilan valintaan",
    eyebrow: "Luo visuaalisista viitteistä",
    title: "Luo alustava kaava kuvista ja mitoista.",
    intro: "Lataa valokuvia, luonnos tai piirros, kuvaile vaate ja syötä vartalon mitat. PatternShift muuttaa vahvistetut tiedot läpinäkyväksi peruskaavaksi.",
    local: "Viitekuvat pysyvät tässä selaimessa",
    prototype: "Ohjattu prototyyppi",
    honestyTitle: "Mitä tämä versio tekee",
    honesty: "Kuvia käytetään visuaalisina viitteinä. Nykyinen versio ei keksi piilosaumoja eikä vielä tee täydellistä AI-rekonstruktiota; se yhdistää vastauksesi ja mittasi alustavaksi parametrikaavaksi.",
    stepReference: "Viitteet",
    stepDesign: "Vaate",
    stepMeasures: "Mitat",
    stepDraft: "Kaava",
    referenceTitle: "Lisää visuaaliset viitteet",
    referenceDesc: "Selkeä etukuva on vähimmäisvaatimus. Taka- ja sivukuva vähentävät oletuksia.",
    upload: "Valitse kuvat tai pudota ne tähän",
    formats: "PNG, JPG tai WebP · enintään 4 kuvaa · 10 Mt kukin",
    invalid: "Käytä alle 10 Mt:n PNG-, JPG- tai WebP-kuvia.",
    remove: "Poista viitekuva",
    coverageTitle: "Mitkä näkymät sinulla on?",
    coverageFront: "Vain edestä",
    coverageFrontDesc: "Taka- ja sivutiedot jäävät oletuksiksi.",
    coverageBack: "Etu- ja takakuva",
    coverageBackDesc: "Päärakenne näkyy molemmilta puolilta.",
    coverageMulti: "Etu-, taka- ja sivukuva",
    coverageMultiDesc: "Paras nykyinen aineisto siluetille ja syvyydelle.",
    nextDesign: "Kuvaile vaate",
    designTitle: "Kuvaile, mitä kuvissa näkyy",
    designDesc: "Valinnat kertovat suoraan, mitä rakennetaan, joten ohjelman ei tarvitse päätellä sitä laskoksesta tai varjosta.",
    garmentType: "Vaatteen tyyppi",
    dress: "Mekko",
    top: "Yläosa / paita",
    skirt: "Hame",
    trousers: "Housut",
    silhouette: "Siluetti",
    fitted: "Vartalonmyötäinen",
    straight: "Suora",
    aline: "A-linjainen",
    sleeves: "Hihat",
    none: "Hihaton",
    short: "Lyhyet",
    long: "Pitkät",
    neckline: "Pääntie",
    round: "Pyöreä",
    vneck: "V-pääntie",
    square: "Neliömäinen",
    closure: "Kiinnitys",
    noClosure: "Ei näkyvää kiinnitystä",
    backClosure: "Takavetoketju / napit",
    frontClosure: "Etuvetoketju / napit",
    sideClosure: "Sivuvetoketju",
    nextMeasures: "Lisää mitat",
    measuresTitle: "Aseta todellinen mittakaava",
    measuresDesc: "Valokuvasta ei saada luotettavia senttimetrejä. Käytä kokotaulukkoa lähtökohtana ja korvaa arvot käyttäjän oikeilla mitoilla, kun mahdollista.",
    profile: "Viitetaulukko",
    women: "Naiset",
    men: "Miehet",
    targetSize: "Tavoitekoko",
    applyPreset: "Täytä kokotaulukosta",
    bust: "Rinnanympärys",
    waist: "Vyötärö",
    hips: "Lantio",
    shoulder: "Hartialeveys",
    backLength: "Selän pituus vyötärölle",
    garmentLength: "Valmiin vaatteen pituus",
    ease: "Väljyysvara",
    easeHelp: "Vartalon mittoihin lisättävä liikkumavara.",
    confirm: "Ymmärrän, että piilosaumat, muotolaskokset, vuori ja kiinnikkeet on tarkistettava käsin.",
    generate: "Luo alustava kaava",
    referenceSummary: "Viiteaineiston laatu",
    confidence: "Luonnoksen luottamus",
    images: "kuvaa",
    visible: "Vahvistettu aineisto",
    assumed: "Vahvistettava",
    visibleItems: ["Ladatut näkymät", "Valittu vaateryhmä", "Syötetyt vartalon mitat"],
    assumedItems: ["Piilosaumat ja muotolaskokset", "Kankaan tarkka käyttäytyminen", "Vuori ja sisärakenne"],
    resultTitle: "Alustava peruskaavasi",
    resultDesc: "SVG sisältää etu- ja takakappaleet, langansuunnat, merkinnät, 10 cm:n tarkistusruudun ja ilmoitetun saumanvaran. Tarkista se ennen koon muuttamista tai leikkaamista.",
    download: "Lataa alustava SVG",
    openResize: "Avaa koonmuutosstudiossa",
    startOver: "Aloita alusta",
    draftLabel: "ALUSTAVA — TARKISTA ENNEN LEIKKAAMISTA",
    frontPiece: "ETUKAPPALE",
    backPiece: "TAKAKAPPALE",
    sleevePiece: "HIHA",
    grainline: "LANGANSUUNTA",
    controlSquare: "10 cm TARKISTUS",
    seamAllowance: "Saumanvaran viite: 1,2 cm",
    low: "Lisänäkymiä suositellaan",
    medium: "Hyödyllinen lähtökohta",
    high: "Vahva viiteaineisto",
  },
};

function generatePatternSvg(
  garment: Garment,
  silhouette: Silhouette,
  sleeve: Sleeve,
  neckline: string,
  closure: string,
  measurements: Measurements,
  ease: number,
  labels: Pick<CreateCopy, "draftLabel" | "frontPiece" | "backPiece" | "sleevePiece" | "grainline" | "controlSquare" | "seamAllowance">,
) {
  const seam = 12;
  const quarterBust = ((measurements.bust + ease) * 10) / 4;
  const quarterWaist = ((measurements.waist + ease * 0.7) * 10) / 4;
  const quarterHip = ((measurements.hips + ease) * 10) / 4;
  const garmentHeight = Math.max(380, measurements.garmentLength * 10);
  const pieceGap = 70;
  const margin = 60;
  const line = "#332a37";
  const guide = "#8a5b79";
  let pieces = "";
  let canvasWidth = 1500;
  let canvasHeight = garmentHeight + 240;

  const labelBlock = (x: number, y: number, label: string, grainLength: number) => `
    <text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="${line}">${label}</text>
    <line x1="${x + 30}" y1="${y + 35}" x2="${x + 30}" y2="${y + 35 + grainLength}" stroke="${guide}" stroke-width="3" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    <text x="${x + 44}" y="${y + 55 + grainLength / 2}" font-family="Arial,sans-serif" font-size="15" fill="${guide}" transform="rotate(90 ${x + 44} ${y + 55 + grainLength / 2})">${labels.grainline}</text>`;

  if (garment === "dress" || garment === "top") {
    const hemBase = garment === "dress" ? quarterHip : quarterWaist;
    const hemWidth = silhouette === "aline" ? hemBase * 1.25 : silhouette === "straight" ? Math.max(quarterHip, quarterWaist) : hemBase;
    const pieceWidth = Math.max(quarterBust, quarterWaist, hemWidth) + seam * 2;
    const neckWidth = Math.min(95, measurements.shoulder * 2.1);
    const armDepth = Math.max(175, measurements.bust * 2.25);
    const topY = 100;
    const xFront = margin;
    const xBack = xFront + pieceWidth + pieceGap;
    const bodyHeight = garment === "top" ? Math.min(720, garmentHeight) : garmentHeight;
    const bodyPath = (x: number, front: boolean) => {
      const neckDepth = front ? 92 : 38;
      const neckShape = front && neckline === "v"
        ? `L ${x + neckWidth * .48} ${topY + neckDepth + 28} L ${x + neckWidth} ${topY + 4}`
        : front && neckline === "square"
          ? `L ${x + neckWidth * .18} ${topY + neckDepth} L ${x + neckWidth} ${topY + neckDepth} L ${x + neckWidth} ${topY + 4}`
          : `Q ${x + neckWidth * .45} ${topY - 8} ${x + neckWidth} ${topY + 4}`;
      return `M ${x} ${topY + neckDepth} ${neckShape} L ${x + measurements.shoulder * 5.1} ${topY + 25} Q ${x + pieceWidth + 10} ${topY + armDepth * .55} ${x + quarterBust + seam} ${topY + armDepth} L ${x + quarterWaist + seam} ${topY + Math.min(bodyHeight * .46, measurements.backLength * 10)} L ${x + hemWidth + seam} ${topY + bodyHeight} L ${x} ${topY + bodyHeight} Z`;
    };
    pieces += `<path d="${bodyPath(xFront, true)}"/><path d="${bodyPath(xBack, false)}"/>`;
    if (closure === "front") pieces += `<line x1="${xFront + 8}" y1="${topY + 105}" x2="${xFront + 8}" y2="${topY + Math.min(bodyHeight, 520)}" stroke-dasharray="12 9"/>`;
    if (closure === "back") pieces += `<line x1="${xBack + 8}" y1="${topY + 55}" x2="${xBack + 8}" y2="${topY + Math.min(bodyHeight, 520)}" stroke-dasharray="12 9"/>`;
    if (closure === "side") pieces += `<line x1="${xFront + quarterBust + seam - 5}" y1="${topY + armDepth}" x2="${xFront + quarterWaist + seam - 5}" y2="${topY + Math.min(bodyHeight * .58, 540)}" stroke-dasharray="12 9"/>`;
    pieces += labelBlock(xFront + pieceWidth * .42, topY + bodyHeight * .25, labels.frontPiece, Math.min(300, bodyHeight * .35));
    pieces += labelBlock(xBack + pieceWidth * .42, topY + bodyHeight * .25, labels.backPiece, Math.min(300, bodyHeight * .35));
    canvasWidth = xBack + pieceWidth + margin;

    if (sleeve !== "none") {
      const sleeveLength = sleeve === "short" ? 280 : 610;
      const sleeveWidth = quarterBust * .78 + 70;
      const sleeveX = canvasWidth + pieceGap;
      const sleeveY = 100;
      pieces += `<path d="M ${sleeveX} ${sleeveY + 90} Q ${sleeveX + sleeveWidth / 2} ${sleeveY - 35} ${sleeveX + sleeveWidth} ${sleeveY + 90} L ${sleeveX + sleeveWidth * .78} ${sleeveY + sleeveLength} L ${sleeveX + sleeveWidth * .22} ${sleeveY + sleeveLength} Z"/>`;
      pieces += labelBlock(sleeveX + sleeveWidth * .4, sleeveY + 150, labels.sleevePiece, Math.min(220, sleeveLength * .45));
      canvasWidth = sleeveX + sleeveWidth + margin;
      canvasHeight = Math.max(canvasHeight, sleeveY + sleeveLength + 180);
    }
  } else if (garment === "skirt") {
    const waistWidth = quarterWaist + seam * 2;
    const hipWidth = quarterHip + seam * 2;
    const hemWidth = silhouette === "aline" ? hipWidth * 1.3 : silhouette === "fitted" ? hipWidth * .96 : hipWidth;
    const pieceWidth = Math.max(hipWidth, hemWidth);
    const xFront = margin;
    const xBack = xFront + pieceWidth + pieceGap;
    const y = 100;
    const path = (x: number) => `M ${x} ${y} L ${x + waistWidth} ${y} Q ${x + hipWidth + 14} ${y + 170} ${x + hipWidth} ${y + 230} L ${x + hemWidth} ${y + garmentHeight} L ${x} ${y + garmentHeight} Z`;
    pieces += `<path d="${path(xFront)}"/><path d="${path(xBack)}"/>`;
    pieces += labelBlock(xFront + pieceWidth * .43, y + 170, labels.frontPiece, Math.min(360, garmentHeight * .48));
    pieces += labelBlock(xBack + pieceWidth * .43, y + 170, labels.backPiece, Math.min(360, garmentHeight * .48));
    canvasWidth = xBack + pieceWidth + margin;
  } else {
    const hipWidth = quarterHip + seam * 2;
    const legWidth = Math.max(150, hipWidth * .58);
    const crotch = Math.max(55, hipWidth * .2);
    const xFront = margin;
    const xBack = xFront + hipWidth + crotch + pieceGap;
    const y = 100;
    const trouserPath = (x: number, back: boolean) => {
      const extension = back ? crotch * 1.45 : crotch;
      return `M ${x} ${y} L ${x + hipWidth} ${y} L ${x + hipWidth + extension} ${y + 250} L ${x + legWidth} ${y + garmentHeight} L ${x + 25} ${y + garmentHeight} L ${x + hipWidth * .28} ${y + 280} Z`;
    };
    pieces += `<path d="${trouserPath(xFront, false)}"/><path d="${trouserPath(xBack, true)}"/>`;
    pieces += labelBlock(xFront + hipWidth * .42, y + 210, labels.frontPiece, Math.min(420, garmentHeight * .5));
    pieces += labelBlock(xBack + hipWidth * .42, y + 210, labels.backPiece, Math.min(420, garmentHeight * .5));
    canvasWidth = xBack + hipWidth + crotch * 1.5 + margin;
  }

  canvasWidth = Math.ceil(canvasWidth + 140);
  canvasHeight = Math.ceil(canvasHeight + 140);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(canvasWidth / 10).toFixed(1)}cm" height="${(canvasHeight / 10).toFixed(1)}cm" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${guide}"/></marker></defs>
  <rect width="100%" height="100%" fill="#fffdf9"/>
  <text x="60" y="45" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#8b4f42">${labels.draftLabel}</text>
  <g fill="none" stroke="${line}" stroke-width="3.2" stroke-linejoin="round">${pieces}</g>
  <g transform="translate(${canvasWidth - 190} ${canvasHeight - 190})"><rect width="100" height="100" fill="none" stroke="${line}" stroke-width="3"/><text x="0" y="125" font-family="Arial,sans-serif" font-size="15" fill="${line}">${labels.controlSquare}</text></g>
  <text x="60" y="${canvasHeight - 55}" font-family="Arial,sans-serif" font-size="16" fill="${guide}">${labels.seamAllowance}</text>
  </svg>`;
}

export default function CreateFromImages() {
  const [language, setLanguage] = useState<Language>("en");
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<ReferenceImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("");
  const [coverage, setCoverage] = useState<Coverage>("front");
  const [garment, setGarment] = useState<Garment>("dress");
  const [silhouette, setSilhouette] = useState<Silhouette>("straight");
  const [sleeve, setSleeve] = useState<Sleeve>("none");
  const [neckline, setNeckline] = useState("round");
  const [closure, setClosure] = useState("none");
  const [profile, setProfile] = useState<Profile>("women");
  const [size, setSize] = useState<Size>("M");
  const [measurements, setMeasurements] = useState<Measurements>({ bust: 92, waist: 74, hips: 100, shoulder: 38, backLength: 42, garmentLength: 105 });
  const [ease, setEase] = useState(4);
  const [confirmed, setConfirmed] = useState(false);
  const [generatedSvg, setGeneratedSvg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = copy[language];

  useEffect(() => {
    const stored = window.localStorage.getItem("patternshift-language") as Language | null;
    if (stored && stored in copy) setLanguage(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("patternshift-language", language);
  }, [language]);

  useEffect(() => () => images.forEach((image) => URL.revokeObjectURL(image.url)), [images]);

  const confidence = useMemo(() => {
    const coverageScore = coverage === "front" ? 42 : coverage === "frontBack" ? 62 : 76;
    const imageBonus = Math.min(images.length * 3, 9);
    const complexityPenalty = garment === "trousers" ? 7 : garment === "dress" ? 3 : 0;
    return Math.max(35, Math.min(85, coverageScore + imageBonus - complexityPenalty));
  }, [coverage, garment, images.length]);
  const confidenceLabel = confidence < 55 ? t.low : confidence < 73 ? t.medium : t.high;
  const previewUrl = generatedSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generatedSvg)}` : "";
  const steps = [t.stepReference, t.stepDesign, t.stepMeasures, t.stepDraft];

  function addImages(files: FileList | File[]) {
    const candidates = Array.from(files).slice(0, Math.max(0, 4 - images.length));
    const valid = candidates.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    if (valid.length !== candidates.length) setStatus(t.invalid);
    else setStatus("");
    if (!valid.length) return;
    setImages((current) => [...current, ...valid.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))].slice(0, 4));
    if (valid.length >= 3) setCoverage("multi");
    else if (valid.length >= 2) setCoverage("frontBack");
  }

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addImages(event.target.files);
    event.target.value = "";
  }

  function removeImage(index: number) {
    setImages((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, imageIndex) => imageIndex !== index);
    });
  }

  function applyPreset() {
    setMeasurements((current) => ({ ...current, ...SIZE_PRESETS[profile][size] }));
  }

  function setMeasurement(key: keyof Measurements, value: string) {
    const number = Math.max(1, Number(value));
    setMeasurements((current) => ({ ...current, [key]: number }));
  }

  function generateDraft() {
    const svg = generatePatternSvg(garment, silhouette, sleeve, neckline, closure, measurements, ease, t);
    setGeneratedSvg(svg);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadSvg() {
    if (!generatedSvg) return;
    const url = URL.createObjectURL(new Blob([generatedSvg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `PatternShift-${garment}-${size}-preliminary.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openInResizeStudio() {
    if (!generatedSvg) return;
    window.sessionStorage.setItem("patternshift-generated-pattern", generatedSvg);
    window.sessionStorage.setItem("patternshift-generated-name", `PatternShift-${garment}-${size}-preliminary.svg`);
    window.location.href = `${publicBasePath}/resize/`;
  }

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#251f2b]">
      <header className="atelier-header border-b border-[#d9d0c3]">
        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#5b3b68] text-white"><Scissors className="size-5" /></div><div><p className="font-serif text-xl font-semibold leading-none">PatternShift</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.2em] text-[#786d79]">{translations[language].digitalStudio}</p></div></div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full text-[#61406b]"><Link href="/"><ArrowLeft /><span className="hidden sm:inline">{t.back}</span></Link></Button>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}><SelectTrigger aria-label={translations[language].language} className="h-9 min-w-32 rounded-full border-[#cfc3d2] bg-white/90 font-semibold text-[#563961]"><Languages className="size-4" /><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(languageNames) as Language[]).map((code) => <SelectItem key={code} value={code}>{languageNames[code]}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      </header>

      <section className="border-b border-[#d9d0c3] bg-[linear-gradient(135deg,#faf7f0_0%,#f2e9f4_100%)]">
        <div className="mx-auto grid max-w-[1450px] gap-5 px-4 py-8 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end lg:py-11">
          <div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#75507e]"><WandSparkles className="size-4" />{t.eyebrow}</p><h1 className="max-w-4xl font-serif text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl">{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#645b66] sm:text-base">{t.intro}</p></div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-[#ccbcd1] bg-white/75 px-3 py-2 text-xs font-semibold text-[#5c4263]"><Sparkles className="size-3.5" />{t.prototype}</span><span className="inline-flex items-center gap-2 rounded-full border border-[#cdd9d0] bg-white/75 px-3 py-2 text-xs font-semibold text-[#42604b]"><ShieldCheck className="size-3.5" />{t.local}</span></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1450px] px-4 pt-5 sm:px-7">
        <div className="flex gap-3 rounded-2xl border border-[#dbcba9] bg-[#fff8e8] p-4 text-sm text-[#624f32]"><CircleAlert className="mt-0.5 size-5 shrink-0 text-[#8e652c]" /><p><strong>{t.honestyTitle}.</strong> {t.honesty}</p></div>
      </section>

      <nav className="mx-auto max-w-[1450px] px-4 pt-5 sm:px-7" aria-label="Progress">
        <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-[#d8cec3] bg-[#fffdf9] p-2 sm:grid-cols-4">{steps.map((label, index) => <li key={label}><button type="button" onClick={() => index < step && setStep(index)} disabled={index > step} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${index === step ? "bg-[#5b3b68] text-white" : index < step ? "bg-[#edf3ef] text-[#3f6249]" : "text-[#8b818c]"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index === step ? "bg-white/16" : index < step ? "bg-[#dbeadf]" : "bg-[#eee9e2]"}`}>{index < step ? <Check className="size-3.5" /> : index + 1}</span><span className="text-xs font-semibold sm:text-sm">{label}</span></button></li>)}</ol>
      </nav>

      <div className="mx-auto grid max-w-[1450px] gap-5 px-4 py-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-[1.5rem] border border-[#d8cec3] bg-[#fffdf9] shadow-[0_12px_38px_rgba(47,34,50,.06)]">
          {step === 0 && <div className="p-5 sm:p-7"><StepTitle icon={<Camera />} title={t.referenceTitle} description={t.referenceDesc} />
            <button type="button" className={`mt-6 flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${dragActive ? "border-[#6c4776] bg-[#f3eaf5]" : "border-[#cfc2d2] bg-[#faf7f1] hover:bg-[#f5eff6]"}`} onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); addImages(event.dataTransfer.files); }}><span className="grid size-12 place-items-center rounded-full bg-[#e9deec] text-[#62406d]"><FileImage className="size-6" /></span><strong className="font-serif text-xl">{t.upload}</strong><span className="text-xs text-[#776d78]">{t.formats}</span></button>
            <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" multiple className="sr-only" onChange={handleImages} />
            {status && <p role="status" className="mt-3 text-sm text-[#a23c32]">{status}</p>}
            {images.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((image, index) => <figure key={`${image.name}-${index}`} className="relative overflow-hidden rounded-xl border border-[#d7cec3] bg-white"><img src={image.url} alt={image.name} className="aspect-square w-full object-cover" /><figcaption className="truncate px-2 py-2 text-[10px] text-[#6f6570]">{image.name}</figcaption><button type="button" aria-label={t.remove} onClick={() => removeImage(index)} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[#2c2430]/80 text-white"><X className="size-3.5" /></button></figure>)}</div>}
            <div className="mt-7"><Label className="mb-3 text-sm font-semibold">{t.coverageTitle}</Label><div className="grid gap-3 sm:grid-cols-3">{(["front", "frontBack", "multi"] as Coverage[]).map((value) => { const title = value === "front" ? t.coverageFront : value === "frontBack" ? t.coverageBack : t.coverageMulti; const desc = value === "front" ? t.coverageFrontDesc : value === "frontBack" ? t.coverageBackDesc : t.coverageMultiDesc; return <Choice key={value} selected={coverage === value} title={title} description={desc} onClick={() => setCoverage(value)} />; })}</div></div>
            <div className="mt-7 flex justify-end"><Button size="lg" className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" disabled={!images.length} onClick={() => setStep(1)}>{t.nextDesign}<ArrowRight /></Button></div>
          </div>}

          {step === 1 && <div className="p-5 sm:p-7"><StepTitle icon={<Scissors />} title={t.designTitle} description={t.designDesc} />
            <div className="mt-6"><Label className="mb-3 text-sm font-semibold">{t.garmentType}</Label><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(["dress", "top", "skirt", "trousers"] as Garment[]).map((value) => <Choice key={value} selected={garment === value} title={t[value]} onClick={() => setGarment(value)} />)}</div></div>
            <div className="mt-6"><Label className="mb-3 text-sm font-semibold">{t.silhouette}</Label><div className="grid grid-cols-3 gap-3">{(["fitted", "straight", "aline"] as Silhouette[]).map((value) => <Choice key={value} selected={silhouette === value} title={t[value]} onClick={() => setSilhouette(value)} />)}</div></div>
            {(garment === "dress" || garment === "top") && <div className="mt-6"><Label className="mb-3 text-sm font-semibold">{t.sleeves}</Label><div className="grid grid-cols-3 gap-3">{(["none", "short", "long"] as Sleeve[]).map((value) => <Choice key={value} selected={sleeve === value} title={t[value]} onClick={() => setSleeve(value)} />)}</div></div>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2"><SelectField label={t.neckline} value={neckline} onChange={setNeckline} options={[["round", t.round], ["v", t.vneck], ["square", t.square]]} /><SelectField label={t.closure} value={closure} onChange={setClosure} options={[["none", t.noClosure], ["back", t.backClosure], ["front", t.frontClosure], ["side", t.sideClosure]]} /></div>
            <div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" className="rounded-xl" onClick={() => setStep(0)}><ArrowLeft />{t.stepReference}</Button><Button size="lg" className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" onClick={() => setStep(2)}>{t.nextMeasures}<ArrowRight /></Button></div>
          </div>}

          {step === 2 && <div className="p-5 sm:p-7"><StepTitle icon={<Ruler />} title={t.measuresTitle} description={t.measuresDesc} />
            <div className="mt-6 grid gap-4 rounded-2xl border border-[#ded4c9] bg-[#faf7f1] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><SelectField label={t.profile} value={profile} onChange={(value) => setProfile(value as Profile)} options={[["women", t.women], ["men", t.men]]} /><SelectField label={t.targetSize} value={size} onChange={(value) => setSize(value as Size)} options={(["XS", "S", "M", "L", "XL"] as Size[]).map((value) => [value, value])} /><Button variant="outline" className="rounded-xl border-[#bfaec4] bg-white" onClick={applyPreset}>{t.applyPreset}</Button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(["bust", "waist", "hips", "shoulder", "backLength", "garmentLength"] as (keyof Measurements)[]).map((key) => <div key={key}><div className="mb-1.5 flex items-center justify-between"><Label className="text-xs text-[#6c626d]">{t[key]}</Label><span className="text-[10px] uppercase text-[#958996]">cm</span></div><Input type="number" min={1} step={0.5} value={measurements[key]} onChange={(event) => setMeasurement(key, event.target.value)} /></div>)}</div>
            <div className="mt-5 rounded-2xl border border-[#ded4c9] bg-[#faf7f1] p-4"><div className="flex items-end gap-4"><div className="flex-1"><div className="mb-1.5 flex items-center justify-between"><Label className="text-xs text-[#6c626d]">{t.ease}</Label><span className="text-[10px] uppercase text-[#958996]">cm</span></div><Input type="number" min={-2} max={20} step={1} value={ease} onChange={(event) => setEase(Number(event.target.value))} /></div><p className="max-w-sm pb-2 text-xs leading-5 text-[#776d78]">{t.easeHelp}</p></div></div>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8cbdc] bg-[#f5eff6] p-4 text-sm leading-6 text-[#5f5063]"><Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(Boolean(value))} className="mt-1 border-[#8e7c92] data-[state=checked]:bg-[#5b3b68]" />{t.confirm}</label>
            <div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" className="rounded-xl" onClick={() => setStep(1)}><ArrowLeft />{t.stepDesign}</Button><Button size="lg" className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" disabled={!confirmed} onClick={generateDraft}><WandSparkles />{t.generate}</Button></div>
          </div>}

          {step === 3 && <div className="p-5 sm:p-7"><StepTitle icon={<Sparkles />} title={t.resultTitle} description={t.resultDesc} />
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#d7cec3] bg-[#f8f6f1] p-4"><img src={previewUrl} alt={t.resultTitle} className="max-h-[720px] w-full object-contain" /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Button size="lg" variant="outline" className="h-12 rounded-xl border-[#bcaac1]" onClick={downloadSvg}><Download />{t.download}</Button><Button size="lg" className="h-12 rounded-xl bg-[#5b3b68] hover:bg-[#493055]" onClick={openInResizeStudio}>{t.openResize}<ArrowRight /></Button></div>
            <Button variant="ghost" className="mt-3 text-[#684c6e]" onClick={() => { setGeneratedSvg(""); setStep(0); }}>{t.startOver}</Button>
          </div>}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-[1.5rem] border border-[#d5c7d9] bg-[#fffdf9] p-5 shadow-[0_12px_38px_rgba(47,34,50,.05)]"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#76517e]">{t.referenceSummary}</p><div className="mt-3 flex items-end justify-between"><div><strong className="font-serif text-4xl">{confidence}%</strong><p className="mt-1 text-xs text-[#776d78]">{confidenceLabel}</p></div><span className="rounded-full bg-[#eee6f0] px-3 py-1.5 text-xs font-semibold text-[#62406d]">{images.length} {t.images}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8e1d9]"><div className="h-full rounded-full bg-[#76517e] transition-all" style={{ width: `${confidence}%` }} /></div></div>
          <SummaryList title={t.visible} items={t.visibleItems} tone="positive" />
          <SummaryList title={t.assumed} items={t.assumedItems} tone="warning" />
        </aside>
      </div>
    </main>
  );
}

function StepTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ede5ef] text-[#62406d] [&_svg]:size-5">{icon}</span><div><h2 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#706671]">{description}</p></div></div>;
}

function Choice({ selected, title, description, onClick }: { selected: boolean; title: string; description?: string; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-xl border p-3 text-left transition ${selected ? "border-[#6d4a76] bg-[#f1e8f3] text-[#4f3458] shadow-[inset_0_0_0_1px_rgba(91,59,104,.1)]" : "border-[#d9d0c6] bg-white hover:border-[#bfaec4]"}`}><span className="flex items-center gap-2 text-sm font-semibold">{selected && <Check className="size-3.5" />}{title}</span>{description && <small className="mt-1.5 block text-[11px] leading-4 text-[#776d78]">{description}</small>}</button>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="min-w-0"><Label className="mb-1.5 text-xs text-[#6c626d]">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full border-[#d7cec3] bg-white"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent></Select></div>;
}

function SummaryList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "warning" }) {
  return <div className={`rounded-[1.3rem] border p-5 ${tone === "positive" ? "border-[#c9d8cd] bg-[#f3f8f4]" : "border-[#dfcda9] bg-[#fff8e8]"}`}><h3 className={`font-serif text-lg font-semibold ${tone === "positive" ? "text-[#365d43]" : "text-[#6b4e27]"}`}>{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-[#665d67]"><span className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full ${tone === "positive" ? "bg-[#dceade] text-[#356249]" : "bg-[#f3e3bd] text-[#845c22]"}`}>{tone === "positive" ? <Check className="size-2.5" /> : <CircleAlert className="size-2.5" />}</span>{item}</li>)}</ul></div>;
}
