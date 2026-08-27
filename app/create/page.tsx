"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Camera,
  Check,
  CircleAlert,
  Download,
  FileImage,
  Focus,
  Languages,
  KeyRound,
  RefreshCcw,
  Ruler,
  ScanLine,
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
import { Slider } from "@/components/ui/slider";
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
type ViewRole = "front" | "back" | "side" | "detail";
type DartMode = "none" | "waist" | "bustWaist";
type AnalysisEngine = "local" | "sewformer";
type Measurements = {
  bust: number;
  waist: number;
  hips: number;
  shoulder: number;
  backLength: number;
  garmentLength: number;
};
type ReferenceImage = { name: string; url: string; role: ViewRole };
type ShapeProfile = { shoulder: number; waist: number; hip: number; hem: number; length: number };
type ShapeAnalysis = {
  sourceName: string;
  previewUrl: string;
  score: number;
  foregroundCoverage: number;
  ratios: ShapeProfile;
};
type PatternCheck = { label: string; detail: string; passed: boolean };
type AiPattern = {
  model: string;
  modelVersion: string;
  patternSvg: string;
  panelCount: number;
  stitchCount: number;
  widthCm: number;
  heightCm: number;
  appliedScale: number;
  targetLengthCm: number | null;
  specification: Record<string, unknown>;
  warnings: string[];
};

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const defaultAiEndpoint = process.env.NEXT_PUBLIC_PATTERN_AI_URL ?? "";

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

const DEFAULT_SHAPE: ShapeProfile = { shoulder: 100, waist: 100, hip: 100, hem: 100, length: 100 };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function analyzeSilhouette(url: string, sourceName: string): Promise<ShapeAnalysis> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(1, 420 / image.naturalWidth, 560 / image.naturalHeight);
  const width = Math.max(80, Math.round(image.naturalWidth * scale));
  const height = Math.max(100, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const patch = Math.max(4, Math.round(Math.min(width, height) * .035));
  const corners = [[0, 0], [width - patch, 0], [0, height - patch], [width - patch, height - patch]];
  let red = 0; let green = 0; let blue = 0; let samples = 0;
  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + patch; y += 1) {
      for (let x = startX; x < startX + patch; x += 1) {
        const offset = (y * width + x) * 4;
        red += pixels.data[offset]; green += pixels.data[offset + 1]; blue += pixels.data[offset + 2]; samples += 1;
      }
    }
  }
  red /= samples; green /= samples; blue /= samples;
  let cornerVariation = 0;
  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + patch; y += 2) {
      for (let x = startX; x < startX + patch; x += 2) {
        const offset = (y * width + x) * 4;
        cornerVariation += Math.hypot(pixels.data[offset] - red, pixels.data[offset + 1] - green, pixels.data[offset + 2] - blue);
      }
    }
  }
  cornerVariation /= Math.max(1, samples / 4);
  const threshold = clamp(25 + cornerVariation * 1.8, 28, 96);
  const leftEdges = new Array<number>(height).fill(-1);
  const rightEdges = new Array<number>(height).fill(-1);
  let foregroundPixels = 0;
  let contrastSum = 0;

  for (let y = 0; y < height; y += 1) {
    const segments: { left: number; right: number; contrast: number }[] = [];
    let segmentStart = -1; let segmentContrast = 0;
    for (let x = 0; x <= width; x += 1) {
      let foreground = false; let distance = 0;
      if (x < width) {
        const offset = (y * width + x) * 4;
        distance = Math.hypot(pixels.data[offset] - red, pixels.data[offset + 1] - green, pixels.data[offset + 2] - blue);
        foreground = pixels.data[offset + 3] > 20 && distance > threshold;
      }
      if (foreground && segmentStart < 0) segmentStart = x;
      if (foreground) segmentContrast += distance;
      if (!foreground && segmentStart >= 0) {
        if (x - segmentStart >= Math.max(3, width * .015)) segments.push({ left: segmentStart, right: x - 1, contrast: segmentContrast });
        segmentStart = -1; segmentContrast = 0;
      }
    }
    const centre = width / 2;
    const best = segments.sort((a, b) => {
      const scoreA = (a.right - a.left) - Math.abs((a.left + a.right) / 2 - centre) * .35;
      const scoreB = (b.right - b.left) - Math.abs((b.left + b.right) / 2 - centre) * .35;
      return scoreB - scoreA;
    })[0];
    if (best) {
      leftEdges[y] = best.left; rightEdges[y] = best.right;
      foregroundPixels += best.right - best.left + 1;
      contrastSum += best.contrast;
    }
  }

  const validRows = leftEdges.map((left, index) => left >= 0 && rightEdges[index] > left ? index : -1).filter((row) => row >= 0);
  if (validRows.length < height * .18) throw new Error("No coherent silhouette");
  const top = validRows[0];
  const bottom = validRows[validRows.length - 1];
  const span = Math.max(1, bottom - top);
  const widthAt = (position: number) => {
    const target = top + span * position;
    const band = Math.max(2, Math.round(span * .025));
    const values: number[] = [];
    for (let y = Math.max(top, Math.round(target - band)); y <= Math.min(bottom, Math.round(target + band)); y += 1) {
      if (leftEdges[y] >= 0) values.push(rightEdges[y] - leftEdges[y] + 1);
    }
    return median(values);
  };
  const shoulderWidth = widthAt(.14);
  const chestWidth = Math.max(1, widthAt(.29));
  const waistWidth = widthAt(.48);
  const hipWidth = widthAt(.65);
  const hemWidth = widthAt(.94);
  const ratios: ShapeProfile = {
    shoulder: Math.round(clamp((shoulderWidth / chestWidth) / .86 * 100, 72, 132)),
    waist: Math.round(clamp((waistWidth / chestWidth) / .78 * 100, 68, 138)),
    hip: Math.round(clamp((hipWidth / chestWidth) / 1.02 * 100, 72, 138)),
    hem: Math.round(clamp((hemWidth / chestWidth) / 1.02 * 100, 65, 155)),
    length: 100,
  };
  const coverage = foregroundPixels / (width * height);
  const validRowRatio = validRows.length / height;
  const averageContrast = contrastSum / Math.max(1, foregroundPixels);
  const coveragePenalty = coverage < .06 || coverage > .78 ? 18 : 0;
  const score = Math.round(clamp(28 + validRowRatio * 34 + Math.min(24, (averageContrast - threshold) * .28) - coveragePenalty, 25, 92));

  const preview = document.createElement("canvas");
  preview.width = width; preview.height = height;
  const previewContext = preview.getContext("2d");
  if (!previewContext) throw new Error("Canvas unavailable");
  previewContext.fillStyle = "#fffdf9"; previewContext.fillRect(0, 0, width, height);
  previewContext.globalAlpha = .24; previewContext.drawImage(image, 0, 0, width, height); previewContext.globalAlpha = 1;
  previewContext.fillStyle = "rgba(91,59,104,.72)";
  for (let y = top; y <= bottom; y += 1) if (leftEdges[y] >= 0) previewContext.fillRect(leftEdges[y], y, rightEdges[y] - leftEdges[y] + 1, 1);
  previewContext.strokeStyle = "#251f2b"; previewContext.lineWidth = Math.max(1, width / 220);
  previewContext.beginPath();
  for (let y = top; y <= bottom; y += 1) if (leftEdges[y] >= 0) previewContext.lineTo(leftEdges[y], y);
  for (let y = bottom; y >= top; y -= 1) if (rightEdges[y] >= 0) previewContext.lineTo(rightEdges[y], y);
  previewContext.closePath(); previewContext.stroke();
  return { sourceName, previewUrl: preview.toDataURL("image/png"), score, foregroundCoverage: coverage, ratios };
}

const en = {
  back: "Back to mode selection",
  eyebrow: "Create from visual references",
  title: "Reconstruct a checkable pattern from images and measurements.",
  intro: "Upload photos, a sketch or a drawing. PatternShift analyzes the visible contour, lets you correct the detected proportions and builds measurable pattern pieces from the confirmed result.",
  local: "Local mode keeps images in this browser",
  prototype: "Contour-assisted workflow",
  honestyTitle: "What this release does",
  honesty: "The browser now analyzes the visible silhouette and uses it in the pattern geometry. Hidden seams and fabric behaviour still cannot be proven from pixels, so every detected proportion remains editable and every assumption is reported.",
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
  engineTitle: "Reconstruction engine",
  engineDesc: "Use the private local contour workflow now, or connect a GPU server running the official SewFormer checkpoint.",
  localEngine: "Local contour",
  localEngineDesc: "Fast, private and available without a server.",
  aiEngine: "SewFormer AI",
  aiEngineDesc: "Predicts panels and stitch relationships on an external NVIDIA GPU.",
  aiEndpoint: "AI server address",
  aiEndpointPlaceholder: "https://your-gpu-server.example.com",
  aiApiKey: "Server access key",
  aiApiKeyHelp: "The key stays in this browser tab and is sent only to the selected server.",
  aiServerMissing: "Enter the HTTPS address of a running PatternShift AI server.",
  aiAnalyzing: "SewFormer is reconstructing panels and stitches…",
  aiFailed: "The AI server could not complete reconstruction. Local contour analysis is still available.",
  aiSuccess: "SewFormer reconstruction completed.",
  aiPatternTitle: "SewFormer pattern structure",
  aiPatternDesc: "These panels and stitch relationships came from the trained research checkpoint, not from the local parametric template.",
  aiPanels: "Panels",
  aiStitches: "Stitch pairs",
  aiCanvas: "Pattern canvas",
  aiResultDesc: "This SVG uses SewFormer-predicted panels and stitch relationships, scaled to the entered garment length. Verify every seam and add production seam allowances before cutting.",
  aiAllowanceDetail: "SewFormer predicts seam lines. A production offset must be added and verified separately.",
  aiRenderFailed: "The AI pattern could not be rescaled. Check the server connection and try again.",
  aiRendering: "Preparing the measured AI pattern…",
  viewRole: "Image view",
  frontView: "Front",
  backView: "Back",
  sideView: "Side",
  detailView: "Detail",
  coverageTitle: "Which views do you have?",
  coverageFront: "Front only",
  coverageFrontDesc: "Back and side details will be assumptions.",
  coverageBack: "Front + back",
  coverageBackDesc: "Main construction is visible from both sides.",
  coverageMulti: "Front + back + side",
  coverageMultiDesc: "Best current input for silhouette and depth.",
  nextDesign: "Analyze silhouette and continue",
  analyzing: "Analyzing the visible contour locally…",
  analysisFailed: "The automatic contour was not reliable. You can still set the proportions manually in the next step.",
  analysisTitle: "Detected silhouette",
  analysisDesc: "The purple area is the foreground contour separated from the corner background colours. Check it before using the detected proportions.",
  detectedContour: "Contour preview",
  pixelCoverage: "Foreground coverage",
  correctionTitle: "Correct the detected proportions",
  correctionDesc: "Move a control only when the contour includes a pose, loose fold, shadow or background object. The values change the generated pattern, not the body measurements.",
  shoulderShape: "Shoulder line",
  waistShape: "Waist shaping",
  hipShape: "Hip shaping",
  hemShape: "Hem width",
  lengthShape: "Vertical proportion",
  resetDetection: "Reset from contour",
  narrower: "narrower",
  neutral: "detected",
  wider: "wider",
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
  constructionTitle: "Construction controls",
  seamAllowanceLabel: "Seam allowance",
  dartMode: "Dart construction",
  dartNone: "No darts",
  dartWaist: "Waist darts",
  dartBustWaist: "Bust + waist darts",
  confirm: "I understand that hidden seams, darts, lining and fasteners must be checked manually.",
  generate: "Generate and check pattern",
  referenceSummary: "Reference quality",
  confidence: "Draft confidence",
  images: "images",
  visible: "Visible input",
  assumed: "Needs confirmation",
  visibleItems: ["Uploaded views", "Selected garment category", "Entered body measurements"],
  assumedItems: ["Hidden seams and darts", "Exact fabric behaviour", "Lining and internal construction"],
  resultTitle: "Your analyzed pattern draft",
  resultDesc: "The SVG now combines the detected contour, your corrections, body measurements, construction choices, grainlines, notches, darts and a 10 cm control square.",
  checksTitle: "Construction checks",
  checksDesc: "Passed checks are guaranteed by the generated geometry. Review items depend on information that a photograph cannot prove.",
  passed: "Passed",
  review: "Review",
  checkSideSeams: "Front and back side seams",
  checkSideDetail: "Generated from the same verified vertical construction length.",
  checkWaistSegments: "Waist seam segments",
  checkWaistDetail: "Front and back waist positions share the entered back-waist length.",
  checkControlSquare: "Print calibration",
  checkControlDetail: "A 10 cm control square is embedded in the SVG.",
  checkSleeveCap: "Sleeve cap and armhole",
  checkSleeveDetail: "Measure the printed seam lines before cutting; photo contour cannot prove sleeve mobility.",
  checkImageAnalysis: "Image contour quality",
  checkAnalysisDetail: "Automatic contour quality should be at least 65% or corrected manually.",
  checkAllowance: "Seam allowance range",
  checkAllowanceDetail: "The selected allowance should normally stay between 0.6 and 2.5 cm.",
  editSettings: "Edit construction",
  download: "Download preliminary SVG",
  openResize: "Open in resize studio",
  startOver: "Start over",
  draftLabel: "PRELIMINARY — VERIFY BEFORE CUTTING",
  frontPiece: "FRONT",
  backPiece: "BACK",
  sleevePiece: "SLEEVE",
  grainline: "GRAINLINE",
  controlSquare: "10 cm CONTROL",
  seamAllowance: "Seam allowance",
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
    title: "Восстановите проверяемую выкройку по изображениям и меркам.",
    intro: "Загрузите фотографии, эскиз или рисунок. PatternShift проанализирует видимый контур, позволит исправить распознанные пропорции и построит измеряемые детали выкройки.",
    local: "В локальном режиме изображения остаются в браузере",
    prototype: "Режим с анализом контура",
    honestyTitle: "Что умеет эта версия",
    honesty: "Браузер анализирует видимый силуэт и использует его в геометрии выкройки. Скрытые швы и поведение ткани нельзя доказать по пикселям, поэтому все пропорции можно исправить, а каждое предположение показывается отдельно.",
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
    engineTitle: "Механизм реконструкции",
    engineDesc: "Используйте локальный анализ контура или подключите GPU-сервер с официальным checkpoint SewFormer.",
    localEngine: "Локальный контур",
    localEngineDesc: "Быстро, конфиденциально и без отдельного сервера.",
    aiEngine: "AI SewFormer",
    aiEngineDesc: "Предсказывает детали и связи швов на внешнем NVIDIA GPU.",
    aiEndpoint: "Адрес AI-сервера",
    aiEndpointPlaceholder: "https://ваш-gpu-сервер.example.com",
    aiApiKey: "Ключ доступа к серверу",
    aiApiKeyHelp: "Ключ остаётся в этой вкладке браузера и отправляется только выбранному серверу.",
    aiServerMissing: "Укажите HTTPS-адрес работающего сервера PatternShift AI.",
    aiAnalyzing: "SewFormer восстанавливает детали и связи швов…",
    aiFailed: "AI-сервер не смог завершить реконструкцию. Локальный анализ контура всё ещё доступен.",
    aiSuccess: "Реконструкция SewFormer завершена.",
    aiPatternTitle: "Структура выкройки SewFormer",
    aiPatternDesc: "Эти детали и связи швов получены обученной исследовательской моделью, а не локальным параметрическим шаблоном.",
    aiPanels: "Детали",
    aiStitches: "Пары швов",
    aiCanvas: "Полотно выкройки",
    aiResultDesc: "SVG использует детали и связи швов, предсказанные SewFormer, и масштабирован по введённой длине изделия. Проверьте каждый шов и добавьте производственные припуски до раскроя.",
    aiAllowanceDetail: "SewFormer предсказывает линии швов. Производственный припуск нужно добавить и проверить отдельно.",
    aiRenderFailed: "Не удалось изменить масштаб AI-выкройки. Проверьте соединение с сервером и попробуйте снова.",
    aiRendering: "Подготавливаем AI-выкройку по заданным меркам…",
    viewRole: "Вид изображения",
    frontView: "Спереди",
    backView: "Сзади",
    sideView: "Сбоку",
    detailView: "Деталь",
    coverageTitle: "Какие виды у вас есть?",
    coverageFront: "Только спереди",
    coverageFrontDesc: "Задняя и боковая части будут предположениями.",
    coverageBack: "Спереди и сзади",
    coverageBackDesc: "Основная конструкция видна с двух сторон.",
    coverageMulti: "Спереди, сзади и сбоку",
    coverageMultiDesc: "Лучший вариант для силуэта и объёма.",
    nextDesign: "Проанализировать силуэт",
    analyzing: "Видимый контур анализируется локально…",
    analysisFailed: "Автоматический контур получился ненадёжным. В следующем шаге пропорции всё равно можно задать вручную.",
    analysisTitle: "Распознанный силуэт",
    analysisDesc: "Фиолетовая область — передний план, отделённый от цветов фона по углам изображения. Проверьте её перед использованием пропорций.",
    detectedContour: "Предпросмотр контура",
    pixelCoverage: "Заполнение изображения",
    correctionTitle: "Исправьте распознанные пропорции",
    correctionDesc: "Меняйте параметр, только если в контур попали поза, свободная складка, тень или объект фона. Эти значения изменяют выкройку, а не мерки тела.",
    shoulderShape: "Линия плеч",
    waistShape: "Приталивание",
    hipShape: "Линия бёдер",
    hemShape: "Ширина низа",
    lengthShape: "Вертикальная пропорция",
    resetDetection: "Вернуть распознавание",
    narrower: "уже",
    neutral: "распознано",
    wider: "шире",
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
    constructionTitle: "Параметры конструкции",
    seamAllowanceLabel: "Припуск на шов",
    dartMode: "Конструкция вытачек",
    dartNone: "Без вытачек",
    dartWaist: "Талиевые вытачки",
    dartBustWaist: "Нагрудные и талиевые",
    confirm: "Я понимаю, что скрытые швы, вытачки, подкладку и застёжки нужно проверить вручную.",
    generate: "Создать и проверить выкройку",
    referenceSummary: "Качество исходных данных",
    confidence: "Уверенность эскиза",
    images: "изображений",
    visible: "Подтверждённые данные",
    assumed: "Нужно подтвердить",
    visibleItems: ["Загруженные виды", "Выбранный тип изделия", "Введённые мерки тела"],
    assumedItems: ["Скрытые швы и вытачки", "Точное поведение ткани", "Подкладка и внутренняя конструкция"],
    resultTitle: "Ваша выкройка на основе анализа",
    resultDesc: "SVG объединяет распознанный контур, ваши исправления, мерки тела, конструктивные параметры, долевые линии, надсечки, вытачки и контрольный квадрат 10 см.",
    checksTitle: "Проверка конструкции",
    checksDesc: "Пройденные проверки обеспечиваются геометрией генератора. Пункты для проверки зависят от данных, которые фотография не может подтвердить.",
    passed: "Пройдено",
    review: "Проверить",
    checkSideSeams: "Боковые швы переда и спинки",
    checkSideDetail: "Построены по одной проверенной вертикальной длине конструкции.",
    checkWaistSegments: "Сегменты линии талии",
    checkWaistDetail: "Перед и спинка используют введённую длину спины до талии.",
    checkControlSquare: "Калибровка печати",
    checkControlDetail: "В SVG встроен контрольный квадрат 10 см.",
    checkSleeveCap: "Окат рукава и пройма",
    checkSleeveDetail: "Измерьте линии швов после печати: контур фотографии не подтверждает подвижность рукава.",
    checkImageAnalysis: "Качество анализа изображения",
    checkAnalysisDetail: "Качество автоматического контура должно быть не ниже 65% либо пропорции нужно исправить вручную.",
    checkAllowance: "Диапазон припуска",
    checkAllowanceDetail: "Обычно выбранный припуск должен находиться между 0,6 и 2,5 см.",
    editSettings: "Изменить конструкцию",
    download: "Скачать предварительный SVG",
    openResize: "Открыть в редакторе размеров",
    startOver: "Начать заново",
    draftLabel: "ПРЕДВАРИТЕЛЬНО — ПРОВЕРИТЬ ДО РАСКРОЯ",
    frontPiece: "ПЕРЕД",
    backPiece: "СПИНКА",
    sleevePiece: "РУКАВ",
    grainline: "ДОЛЕВАЯ ЛИНИЯ",
    controlSquare: "КОНТРОЛЬ 10 см",
    seamAllowance: "Припуск на шов",
    low: "Рекомендуются дополнительные виды",
    medium: "Полезная отправная точка",
    high: "Хороший комплект изображений",
  },
  fi: {
    back: "Takaisin tilan valintaan",
    eyebrow: "Luo visuaalisista viitteistä",
    title: "Rekonstruoi tarkistettava kaava kuvista ja mitoista.",
    intro: "Lataa valokuvia, luonnos tai piirros. PatternShift analysoi näkyvän ääriviivan, antaa korjata tunnistetut suhteet ja rakentaa mitattavat kaavakappaleet.",
    local: "Paikallistilassa kuvat pysyvät selaimessa",
    prototype: "Ääriviiva-avusteinen työnkulku",
    honestyTitle: "Mitä tämä versio tekee",
    honesty: "Selain analysoi näkyvän siluetin ja käyttää sitä kaavan geometriassa. Piilosaumoja tai kankaan käyttäytymistä ei voi todistaa pikseleistä, joten kaikkia suhteita voi korjata ja oletukset näytetään erikseen.",
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
    engineTitle: "Rekonstruktiomoottori",
    engineDesc: "Käytä paikallista ääriviiva-analyysia tai yhdistä GPU-palvelimeen, jossa on virallinen SewFormer-tarkistuspiste.",
    localEngine: "Paikallinen ääriviiva",
    localEngineDesc: "Nopea, yksityinen ja toimii ilman erillistä palvelinta.",
    aiEngine: "SewFormer AI",
    aiEngineDesc: "Ennustaa kappaleet ja saumasuhteet ulkoisella NVIDIA GPU:lla.",
    aiEndpoint: "AI-palvelimen osoite",
    aiEndpointPlaceholder: "https://gpu-palvelimesi.example.com",
    aiApiKey: "Palvelimen käyttöavain",
    aiApiKeyHelp: "Avain pysyy tässä selainvälilehdessä ja lähetetään vain valitulle palvelimelle.",
    aiServerMissing: "Anna toimivan PatternShift AI -palvelimen HTTPS-osoite.",
    aiAnalyzing: "SewFormer rekonstruoi kappaleita ja saumoja…",
    aiFailed: "AI-palvelin ei saanut rekonstruktiota valmiiksi. Paikallinen ääriviiva-analyysi on silti käytettävissä.",
    aiSuccess: "SewFormer-rekonstruktio valmistui.",
    aiPatternTitle: "SewFormer-kaavarakenne",
    aiPatternDesc: "Nämä kappaleet ja saumasuhteet tulivat koulutetusta tutkimusmallista, eivät paikallisesta parametrisesta mallipohjasta.",
    aiPanels: "Kappaleet",
    aiStitches: "Saumaparit",
    aiCanvas: "Kaavapohja",
    aiResultDesc: "SVG käyttää SewFormerin ennustamia kappaleita ja saumasuhteita sekä syötettyyn vaatteen pituuteen perustuvaa mittakaavaa. Tarkista jokainen sauma ja lisää tuotannon saumanvarat ennen leikkaamista.",
    aiAllowanceDetail: "SewFormer ennustaa saumalinjat. Tuotannon saumanvara on lisättävä ja tarkistettava erikseen.",
    aiRenderFailed: "AI-kaavan mittakaavaa ei voitu muuttaa. Tarkista palvelinyhteys ja yritä uudelleen.",
    aiRendering: "Valmistellaan mitoitettua AI-kaavaa…",
    viewRole: "Kuvan näkymä",
    frontView: "Edestä",
    backView: "Takaa",
    sideView: "Sivulta",
    detailView: "Yksityiskohta",
    coverageTitle: "Mitkä näkymät sinulla on?",
    coverageFront: "Vain edestä",
    coverageFrontDesc: "Taka- ja sivutiedot jäävät oletuksiksi.",
    coverageBack: "Etu- ja takakuva",
    coverageBackDesc: "Päärakenne näkyy molemmilta puolilta.",
    coverageMulti: "Etu-, taka- ja sivukuva",
    coverageMultiDesc: "Paras nykyinen aineisto siluetille ja syvyydelle.",
    nextDesign: "Analysoi siluetti",
    analyzing: "Näkyvää ääriviivaa analysoidaan paikallisesti…",
    analysisFailed: "Automaattinen ääriviiva ei ollut luotettava. Voit silti asettaa suhteet käsin seuraavassa vaiheessa.",
    analysisTitle: "Tunnistettu siluetti",
    analysisDesc: "Violetti alue on etuala, joka erotettiin kuvan kulmien taustaväreistä. Tarkista se ennen suhteiden käyttöä.",
    detectedContour: "Ääriviivan esikatselu",
    pixelCoverage: "Etualan peitto",
    correctionTitle: "Korjaa tunnistetut suhteet",
    correctionDesc: "Muuta säädintä vain, jos ääriviivaan sisältyy asento, väljä laskos, varjo tai taustaesine. Arvot muuttavat kaavaa, eivät vartalon mittoja.",
    shoulderShape: "Hartialinja",
    waistShape: "Vyötärön muotoilu",
    hipShape: "Lantion muotoilu",
    hemShape: "Helman leveys",
    lengthShape: "Pystysuhde",
    resetDetection: "Palauta tunnistus",
    narrower: "kapeampi",
    neutral: "tunnistettu",
    wider: "leveämpi",
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
    constructionTitle: "Rakenteen säädöt",
    seamAllowanceLabel: "Saumanvara",
    dartMode: "Muotolaskokset",
    dartNone: "Ei muotolaskoksia",
    dartWaist: "Vyötärömuotolaskokset",
    dartBustWaist: "Rinta- ja vyötärömuotolaskokset",
    confirm: "Ymmärrän, että piilosaumat, muotolaskokset, vuori ja kiinnikkeet on tarkistettava käsin.",
    generate: "Luo ja tarkista kaava",
    referenceSummary: "Viiteaineiston laatu",
    confidence: "Luonnoksen luottamus",
    images: "kuvaa",
    visible: "Vahvistettu aineisto",
    assumed: "Vahvistettava",
    visibleItems: ["Ladatut näkymät", "Valittu vaateryhmä", "Syötetyt vartalon mitat"],
    assumedItems: ["Piilosaumat ja muotolaskokset", "Kankaan tarkka käyttäytyminen", "Vuori ja sisärakenne"],
    resultTitle: "Analyysiin perustuva kaavasi",
    resultDesc: "SVG yhdistää tunnistetun ääriviivan, korjauksesi, vartalon mitat, rakennevalinnat, langansuunnat, hakit, muotolaskokset ja 10 cm:n tarkistusruudun.",
    checksTitle: "Rakenteen tarkistukset",
    checksDesc: "Läpäistyt tarkistukset taataan luodulla geometrialla. Tarkistettavat kohdat riippuvat tiedoista, joita valokuva ei voi todistaa.",
    passed: "Läpäisty",
    review: "Tarkista",
    checkSideSeams: "Etu- ja takakappaleen sivusaumat",
    checkSideDetail: "Luotu samasta vahvistetusta pystysuuntaisesta rakennepituudesta.",
    checkWaistSegments: "Vyötärösauman osat",
    checkWaistDetail: "Etu- ja takakappale käyttävät syötettyä selän vyötäröpituutta.",
    checkControlSquare: "Tulostuksen kalibrointi",
    checkControlDetail: "SVG sisältää 10 cm:n tarkistusruudun.",
    checkSleeveCap: "Hihan pyöriö ja kädentie",
    checkSleeveDetail: "Mittaa tulostetut saumalinjat ennen leikkaamista; valokuvan ääriviiva ei todista hihan liikkuvuutta.",
    checkImageAnalysis: "Kuva-analyysin laatu",
    checkAnalysisDetail: "Automaattisen ääriviivan laadun tulee olla vähintään 65 % tai suhteet on korjattava käsin.",
    checkAllowance: "Saumanvaran alue",
    checkAllowanceDetail: "Valitun saumanvaran tulisi yleensä olla 0,6–2,5 cm.",
    editSettings: "Muokkaa rakennetta",
    download: "Lataa alustava SVG",
    openResize: "Avaa koonmuutosstudiossa",
    startOver: "Aloita alusta",
    draftLabel: "ALUSTAVA — TARKISTA ENNEN LEIKKAAMISTA",
    frontPiece: "ETUKAPPALE",
    backPiece: "TAKAKAPPALE",
    sleevePiece: "HIHA",
    grainline: "LANGANSUUNTA",
    controlSquare: "10 cm TARKISTUS",
    seamAllowance: "Saumanvara",
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
  shapeProfile: ShapeProfile,
  seamAllowance: number,
  dartMode: DartMode,
  labels: Pick<CreateCopy, "draftLabel" | "frontPiece" | "backPiece" | "sleevePiece" | "grainline" | "controlSquare" | "seamAllowance">,
) {
  const seam = seamAllowance * 10;
  const quarterBust = ((measurements.bust + ease) * 10) / 4;
  const quarterWaist = ((measurements.waist + ease * 0.7) * 10) / 4 * shapeProfile.waist / 100;
  const quarterHip = ((measurements.hips + ease) * 10) / 4 * shapeProfile.hip / 100;
  const garmentHeight = Math.max(380, measurements.garmentLength * 10 * shapeProfile.length / 100);
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
    const hemWidth = (silhouette === "aline" ? hemBase * 1.25 : silhouette === "straight" ? Math.max(quarterHip, quarterWaist) : hemBase) * shapeProfile.hem / 100;
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
      return `M ${x} ${topY + neckDepth} ${neckShape} L ${x + measurements.shoulder * 5.1 * shapeProfile.shoulder / 100} ${topY + 25} Q ${x + pieceWidth + 10} ${topY + armDepth * .55} ${x + quarterBust + seam} ${topY + armDepth} L ${x + quarterWaist + seam} ${topY + Math.min(bodyHeight * .46, measurements.backLength * 10)} L ${x + hemWidth + seam} ${topY + bodyHeight} L ${x} ${topY + bodyHeight} Z`;
    };
    pieces += `<path d="${bodyPath(xFront, true)}"/><path d="${bodyPath(xBack, false)}"/>`;
    const waistY = topY + Math.min(bodyHeight * .46, measurements.backLength * 10);
    if (dartMode !== "none") {
      const dartLength = Math.min(155, bodyHeight * .22);
      const frontDartX = xFront + quarterWaist * .52;
      const backDartX = xBack + quarterWaist * .56;
      pieces += `<path d="M ${frontDartX - 14} ${waistY} L ${frontDartX} ${waistY - dartLength} L ${frontDartX + 14} ${waistY}"/><path d="M ${backDartX - 13} ${waistY} L ${backDartX} ${waistY - dartLength * .82} L ${backDartX + 13} ${waistY}"/>`;
    }
    if (dartMode === "bustWaist") {
      const bustDartY = topY + armDepth * .74;
      pieces += `<path d="M ${xFront + quarterBust + seam} ${bustDartY - 18} L ${xFront + quarterBust * .64} ${bustDartY + 24} L ${xFront + quarterBust + seam} ${bustDartY + 18}"/>`;
    }
    pieces += `<path d="M ${xFront + quarterWaist + seam - 8} ${waistY - 10} L ${xFront + quarterWaist + seam + 10} ${waistY} L ${xFront + quarterWaist + seam - 8} ${waistY + 10}"/><path d="M ${xBack + quarterWaist + seam - 8} ${waistY - 10} L ${xBack + quarterWaist + seam + 10} ${waistY} L ${xBack + quarterWaist + seam - 8} ${waistY + 10}"/>`;
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
    const hemWidth = (silhouette === "aline" ? hipWidth * 1.3 : silhouette === "fitted" ? hipWidth * .96 : hipWidth) * shapeProfile.hem / 100;
    const pieceWidth = Math.max(hipWidth, hemWidth);
    const xFront = margin;
    const xBack = xFront + pieceWidth + pieceGap;
    const y = 100;
    const path = (x: number) => `M ${x} ${y} L ${x + waistWidth} ${y} Q ${x + hipWidth + 14} ${y + 170} ${x + hipWidth} ${y + 230} L ${x + hemWidth} ${y + garmentHeight} L ${x} ${y + garmentHeight} Z`;
    pieces += `<path d="${path(xFront)}"/><path d="${path(xBack)}"/>`;
    if (dartMode !== "none") {
      pieces += `<path d="M ${xFront + waistWidth * .45 - 13} ${y} L ${xFront + waistWidth * .45} ${y + 135} L ${xFront + waistWidth * .45 + 13} ${y}"/><path d="M ${xBack + waistWidth * .5 - 13} ${y} L ${xBack + waistWidth * .5} ${y + 120} L ${xBack + waistWidth * .5 + 13} ${y}"/>`;
    }
    pieces += `<path d="M ${xFront + hipWidth - 7} ${y + 220} L ${xFront + hipWidth + 11} ${y + 230} L ${xFront + hipWidth - 7} ${y + 240}"/><path d="M ${xBack + hipWidth - 7} ${y + 220} L ${xBack + hipWidth + 11} ${y + 230} L ${xBack + hipWidth - 7} ${y + 240}"/>`;
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
    if (dartMode !== "none") pieces += `<path d="M ${xBack + hipWidth * .5 - 13} ${y} L ${xBack + hipWidth * .5} ${y + 125} L ${xBack + hipWidth * .5 + 13} ${y}"/>`;
    pieces += `<path d="M ${xFront + hipWidth - 8} ${y + 238} L ${xFront + hipWidth + 10} ${y + 250} L ${xFront + hipWidth - 8} ${y + 262}"/><path d="M ${xBack + hipWidth - 8} ${y + 238} L ${xBack + hipWidth + 10} ${y + 250} L ${xBack + hipWidth - 8} ${y + 262}"/>`;
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
  <text x="60" y="${canvasHeight - 55}" font-family="Arial,sans-serif" font-size="16" fill="${guide}">${labels.seamAllowance}: ${seamAllowance.toFixed(1)} cm</text>
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
  const [analysis, setAnalysis] = useState<ShapeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [engine, setEngine] = useState<AnalysisEngine>("local");
  const [aiEndpoint, setAiEndpoint] = useState(defaultAiEndpoint);
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiPattern, setAiPattern] = useState<AiPattern | null>(null);
  const [shapeProfile, setShapeProfile] = useState<ShapeProfile>(DEFAULT_SHAPE);
  const [shapeTouched, setShapeTouched] = useState(false);
  const [seamAllowance, setSeamAllowance] = useState(1.2);
  const [dartMode, setDartMode] = useState<DartMode>("waist");
  const [confirmed, setConfirmed] = useState(false);
  const [generatedSvg, setGeneratedSvg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ReferenceImage[]>([]);
  const t = copy[language];

  useEffect(() => {
    const stored = window.localStorage.getItem("patternshift-language") as Language | null;
    // Hydrate the persisted browser preference after the server's English render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored && stored in copy) setLanguage(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("patternshift-language", language);
  }, [language]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url)), []);

  const confidence = useMemo(() => {
    const coverageScore = coverage === "front" ? 42 : coverage === "frontBack" ? 62 : 76;
    const imageBonus = Math.min(images.length * 3, 9);
    const complexityPenalty = garment === "trousers" ? 7 : garment === "dress" ? 3 : 0;
    const contourScore = aiPattern ? 88 : analysis ? analysis.score * .58 + coverageScore * .42 : coverageScore;
    const correctionBonus = shapeTouched ? 3 : 0;
    return Math.round(Math.max(35, Math.min(92, contourScore + imageBonus + correctionBonus - complexityPenalty)));
  }, [aiPattern, analysis, coverage, garment, images.length, shapeTouched]);
  const confidenceLabel = confidence < 55 ? t.low : confidence < 73 ? t.medium : t.high;
  const previewUrl = generatedSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generatedSvg)}` : "";
  const steps = [t.stepReference, t.stepDesign, t.stepMeasures, t.stepDraft];
  const patternChecks = useMemo<PatternCheck[]>(() => [
    { label: t.checkSideSeams, detail: t.checkSideDetail, passed: aiPattern ? aiPattern.stitchCount > 0 : true },
    { label: t.checkWaistSegments, detail: t.checkWaistDetail, passed: true },
    { label: t.checkControlSquare, detail: t.checkControlDetail, passed: true },
    { label: t.checkSleeveCap, detail: t.checkSleeveDetail, passed: sleeve === "none" },
    { label: t.checkImageAnalysis, detail: t.checkAnalysisDetail, passed: Boolean(aiPattern) || Boolean(analysis && analysis.score >= 65) || shapeTouched },
    { label: t.checkAllowance, detail: aiPattern ? t.aiAllowanceDetail : t.checkAllowanceDetail, passed: !aiPattern && seamAllowance >= .6 && seamAllowance <= 2.5 },
  ], [aiPattern, analysis, seamAllowance, shapeTouched, sleeve, t]);
  const passedChecks = patternChecks.filter((check) => check.passed).length;

  function addImages(files: FileList | File[]) {
    const candidates = Array.from(files).slice(0, Math.max(0, 4 - images.length));
    const valid = candidates.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    if (valid.length !== candidates.length) setStatus(t.invalid);
    else setStatus("");
    if (!valid.length) return;
    setImages((current) => {
      const roles: ViewRole[] = ["front", "back", "side", "detail"];
      return [...current, ...valid.map((file, index) => ({ name: file.name, url: URL.createObjectURL(file), role: roles[current.length + index] ?? "detail" }))].slice(0, 4);
    });
    const total = Math.min(4, images.length + valid.length);
    if (total >= 3) setCoverage("multi");
    else if (total >= 2) setCoverage("frontBack");
    setAnalysis(null);
    setAiPattern(null);
    setShapeProfile(DEFAULT_SHAPE);
    setShapeTouched(false);
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
    setAnalysis(null);
    setAiPattern(null);
    setShapeProfile(DEFAULT_SHAPE);
    setShapeTouched(false);
  }

  function setImageRole(index: number, role: ViewRole) {
    setImages((current) => current.map((image, imageIndex) => imageIndex === index ? { ...image, role } : image));
    setAnalysis(null);
    setAiPattern(null);
    setShapeTouched(false);
  }

  async function requestAiReconstruction(source: ReferenceImage): Promise<AiPattern> {
    const endpoint = aiEndpoint.trim().replace(/\/+$/, "");
    if (!endpoint) throw new Error(t.aiServerMissing);
    const imageResponse = await fetch(source.url);
    const imageBlob = await imageResponse.blob();
    const form = new FormData();
    form.append("image", imageBlob, source.name);
    form.append("target_length_cm", String(measurements.garmentLength));
    const headers: HeadersInit = {};
    if (aiApiKey) headers["X-PatternShift-Key"] = aiApiKey;
    const response = await fetch(`${endpoint}/v1/reconstruct`, { method: "POST", headers, body: form });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(problem.detail || `HTTP ${response.status}`);
    }
    return await response.json() as AiPattern;
  }

  async function renderAiPattern(targetLengthCm: number): Promise<AiPattern> {
    if (!aiPattern) throw new Error(t.aiRenderFailed);
    const endpoint = aiEndpoint.trim().replace(/\/+$/, "");
    if (!endpoint) throw new Error(t.aiServerMissing);
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (aiApiKey) headers["X-PatternShift-Key"] = aiApiKey;
    const response = await fetch(`${endpoint}/v1/render`, {
      method: "POST",
      headers,
      body: JSON.stringify({ specification: aiPattern.specification, target_length_cm: targetLengthCm }),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(problem.detail || `HTTP ${response.status}`);
    }
    const rendered = await response.json() as Pick<AiPattern, "patternSvg" | "panelCount" | "stitchCount" | "widthCm" | "heightCm" | "appliedScale">;
    return { ...aiPattern, ...rendered, targetLengthCm };
  }

  async function analyzeAndContinue() {
    const source = images.find((image) => image.role === "front") ?? images[0];
    if (!source) return;
    if (engine === "sewformer" && !aiEndpoint.trim()) {
      setStatus(t.aiServerMissing);
      return;
    }
    setAnalyzing(true);
    setStatus(engine === "sewformer" ? t.aiAnalyzing : t.analyzing);
    try {
      const localPromise = analyzeSilhouette(source.url, source.name);
      const aiPromise = engine === "sewformer" ? requestAiReconstruction(source) : Promise.resolve(null);
      const [localResult, aiResult] = await Promise.allSettled([localPromise, aiPromise]);
      if (localResult.status === "fulfilled") {
        setAnalysis(localResult.value);
        setShapeProfile(localResult.value.ratios);
      } else {
        setAnalysis(null);
        setShapeProfile(DEFAULT_SHAPE);
      }
      if (aiResult.status === "fulfilled") {
        setAiPattern(aiResult.value);
        setStatus(aiResult.value ? t.aiSuccess : localResult.status === "fulfilled" ? "" : t.analysisFailed);
      } else {
        setAiPattern(null);
        setStatus(`${t.aiFailed} ${aiResult.reason instanceof Error ? aiResult.reason.message : ""}`.trim());
      }
      setShapeTouched(false);
    } finally {
      setAnalyzing(false);
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function updateShape(key: keyof ShapeProfile, value: number) {
    setShapeProfile((current) => ({ ...current, [key]: value }));
    setShapeTouched(true);
  }

  function resetShape() {
    setShapeProfile(analysis?.ratios ?? DEFAULT_SHAPE);
    setShapeTouched(false);
  }

  function applyPreset() {
    setMeasurements((current) => ({ ...current, ...SIZE_PRESETS[profile][size] }));
  }

  function setMeasurement(key: keyof Measurements, value: string) {
    const number = Math.max(1, Number(value));
    setMeasurements((current) => ({ ...current, [key]: number }));
  }

  async function generateDraft() {
    setGenerating(true);
    try {
      if (engine === "sewformer" && aiPattern) {
        const rendered = aiPattern.targetLengthCm === measurements.garmentLength
          ? aiPattern
          : await renderAiPattern(measurements.garmentLength);
        setAiPattern(rendered);
        setGeneratedSvg(rendered.patternSvg);
      } else {
        setGeneratedSvg(generatePatternSvg(garment, silhouette, sleeve, neckline, closure, measurements, ease, shapeProfile, seamAllowance, dartMode, t));
      }
      setStatus("");
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatus(`${t.aiRenderFailed} ${error instanceof Error ? error.message : ""}`.trim());
    } finally {
      setGenerating(false);
    }
  }

  function downloadSvg() {
    if (!generatedSvg) return;
    const url = URL.createObjectURL(new Blob([generatedSvg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `PatternShift-${engine === "sewformer" && aiPattern ? "SewFormer" : garment}-${size}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openInResizeStudio() {
    if (!generatedSvg) return;
    window.sessionStorage.setItem("patternshift-generated-pattern", generatedSvg);
    window.sessionStorage.setItem("patternshift-generated-name", `PatternShift-${engine === "sewformer" && aiPattern ? "SewFormer" : garment}-${size}.svg`);
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
            {images.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((image, index) => <figure key={`${image.name}-${index}`} className="relative overflow-hidden rounded-xl border border-[#d7cec3] bg-white"><img src={image.url} alt={image.name} className="aspect-square w-full object-cover" /><figcaption className="truncate px-2 pt-2 text-[10px] text-[#6f6570]">{image.name}</figcaption><div className="p-2"><Select value={image.role} onValueChange={(value) => setImageRole(index, value as ViewRole)}><SelectTrigger aria-label={t.viewRole} className="h-8 w-full bg-white text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="front">{t.frontView}</SelectItem><SelectItem value="back">{t.backView}</SelectItem><SelectItem value="side">{t.sideView}</SelectItem><SelectItem value="detail">{t.detailView}</SelectItem></SelectContent></Select></div><button type="button" aria-label={t.remove} onClick={() => removeImage(index)} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[#2c2430]/80 text-white"><X className="size-3.5" /></button></figure>)}</div>}
            <div className="mt-7 rounded-2xl border border-[#d8cbdc] bg-[#f7f1f8] p-4 sm:p-5">
              <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e7daeb] text-[#62406d]"><BrainCircuit className="size-5" /></span><div><p className="font-serif text-xl font-semibold">{t.engineTitle}</p><p className="mt-1 text-xs leading-5 text-[#6f6570]">{t.engineDesc}</p></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Choice selected={engine === "local"} title={t.localEngine} description={t.localEngineDesc} onClick={() => { setEngine("local"); setAiPattern(null); setStatus(""); }} />
                <Choice selected={engine === "sewformer"} title={t.aiEngine} description={t.aiEngineDesc} onClick={() => { setEngine("sewformer"); setAiPattern(null); setStatus(""); }} />
              </div>
              {engine === "sewformer" && <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label className="mb-1.5 text-xs text-[#6c626d]">{t.aiEndpoint}</Label><Input type="url" value={aiEndpoint} placeholder={t.aiEndpointPlaceholder} onChange={(event) => setAiEndpoint(event.target.value)} /></div><div><Label className="mb-1.5 flex items-center gap-1.5 text-xs text-[#6c626d]"><KeyRound className="size-3.5" />{t.aiApiKey}</Label><Input type="password" value={aiApiKey} autoComplete="off" onChange={(event) => setAiApiKey(event.target.value)} /><p className="mt-1.5 text-[10px] leading-4 text-[#7a6f7b]">{t.aiApiKeyHelp}</p></div></div>}
            </div>
            <div className="mt-7"><Label className="mb-3 text-sm font-semibold">{t.coverageTitle}</Label><div className="grid gap-3 sm:grid-cols-3">{(["front", "frontBack", "multi"] as Coverage[]).map((value) => { const title = value === "front" ? t.coverageFront : value === "frontBack" ? t.coverageBack : t.coverageMulti; const desc = value === "front" ? t.coverageFrontDesc : value === "frontBack" ? t.coverageBackDesc : t.coverageMultiDesc; return <Choice key={value} selected={coverage === value} title={title} description={desc} onClick={() => setCoverage(value)} />; })}</div></div>
            <div className="mt-7 flex justify-end"><Button size="lg" className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" disabled={!images.length || analyzing} onClick={() => void analyzeAndContinue()}>{analyzing ? <ScanLine className="animate-pulse" /> : <Focus />}{analyzing ? (engine === "sewformer" ? t.aiAnalyzing : t.analyzing) : t.nextDesign}<ArrowRight /></Button></div>
          </div>}

          {step === 1 && <div className="p-5 sm:p-7"><StepTitle icon={<Scissors />} title={t.designTitle} description={t.designDesc} />
            {status && <p role="status" className={`mt-4 rounded-xl border p-3 text-sm ${status === t.aiSuccess ? "border-[#c8d8cd] bg-[#f3f8f4] text-[#315d49]" : "border-[#dfcda9] bg-[#fff8e8] text-[#8a3d34]"}`}>{status}</p>}
            {aiPattern && <div className="mt-6 rounded-2xl border border-[#bfcfca] bg-[#f1f8f4] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-serif text-xl font-semibold text-[#315d49]"><BrainCircuit className="size-5" />{t.aiPatternTitle}</p><p className="mt-1 max-w-3xl text-xs leading-5 text-[#5e7167]">{t.aiPatternDesc}</p></div><span className="rounded-full bg-[#d8ecdf] px-3 py-1.5 text-xs font-bold text-[#315d49]">{aiPattern.model} · {aiPattern.modelVersion}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"><figure className="overflow-hidden rounded-xl border border-[#c8d8cd] bg-white p-3"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(aiPattern.patternSvg)}`} alt={t.aiPatternTitle} className="max-h-[460px] w-full object-contain" /></figure><dl className="grid grid-cols-2 gap-3 lg:grid-cols-1"><AiMetric label={t.aiPanels} value={String(aiPattern.panelCount)} /><AiMetric label={t.aiStitches} value={String(aiPattern.stitchCount)} /><AiMetric label={t.aiCanvas} value={`${aiPattern.widthCm} × ${aiPattern.heightCm} cm`} /></dl></div>{aiPattern.warnings.length > 0 && <ul className="mt-4 space-y-1.5 text-[11px] leading-5 text-[#6d5a3d]">{aiPattern.warnings.map((warning) => <li key={warning} className="flex gap-2"><CircleAlert className="mt-0.5 size-3.5 shrink-0" />{warning}</li>)}</ul>}</div>}
            <div className="mt-6 rounded-2xl border border-[#d8cbdc] bg-[#f7f1f8] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-serif text-xl font-semibold"><ScanLine className="size-5 text-[#65436e]" />{t.analysisTitle}</p><p className="mt-1 max-w-3xl text-xs leading-5 text-[#6f6570]">{t.analysisDesc}</p></div>{analysis && <span className="rounded-full bg-[#e1efe4] px-3 py-1.5 text-xs font-bold text-[#386049]">{analysis.score}%</span>}</div>{analysis ? <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]"><figure className="overflow-hidden rounded-xl border border-[#cfc2d2] bg-white"><img src={analysis.previewUrl} alt={t.detectedContour} className="aspect-[3/4] w-full object-contain" /><figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] text-[#6f6570]"><span className="truncate">{analysis.sourceName}</span><span>{t.pixelCoverage}: {Math.round(analysis.foregroundCoverage * 100)}%</span></figcaption></figure><div><p className="font-semibold">{t.correctionTitle}</p><p className="mt-1 text-xs leading-5 text-[#746a75]">{t.correctionDesc}</p><div className="mt-4 space-y-4"><ShapeControl label={t.shoulderShape} value={shapeProfile.shoulder} onChange={(value) => updateShape("shoulder", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.waistShape} value={shapeProfile.waist} onChange={(value) => updateShape("waist", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.hipShape} value={shapeProfile.hip} onChange={(value) => updateShape("hip", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.hemShape} value={shapeProfile.hem} min={65} max={155} onChange={(value) => updateShape("hem", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.lengthShape} value={shapeProfile.length} min={85} max={115} onChange={(value) => updateShape("length", value)} left={t.narrower} middle={t.neutral} right={t.wider} /></div><Button variant="ghost" size="sm" className="mt-3 text-[#65436e]" onClick={resetShape}><RefreshCcw />{t.resetDetection}</Button></div></div> : <div className="mt-4 rounded-xl border border-[#dfcda9] bg-[#fff8e8] p-4 text-sm text-[#6b4e27]"><CircleAlert className="mr-2 inline size-4" />{t.analysisFailed}<div className="mt-4 space-y-4"><ShapeControl label={t.shoulderShape} value={shapeProfile.shoulder} onChange={(value) => updateShape("shoulder", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.waistShape} value={shapeProfile.waist} onChange={(value) => updateShape("waist", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.hipShape} value={shapeProfile.hip} onChange={(value) => updateShape("hip", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.hemShape} value={shapeProfile.hem} min={65} max={155} onChange={(value) => updateShape("hem", value)} left={t.narrower} middle={t.neutral} right={t.wider} /><ShapeControl label={t.lengthShape} value={shapeProfile.length} min={85} max={115} onChange={(value) => updateShape("length", value)} left={t.narrower} middle={t.neutral} right={t.wider} /></div></div>}</div>
            <div className="mt-6"><Label className="mb-3 text-sm font-semibold">{t.garmentType}</Label><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(["dress", "top", "skirt", "trousers"] as Garment[]).map((value) => <Choice key={value} selected={garment === value} title={t[value]} onClick={() => setGarment(value)} />)}</div></div>
            <div className="mt-6"><Label className="mb-3 text-sm font-semibold">{t.silhouette}</Label><div className="grid grid-cols-3 gap-3">{(["fitted", "straight", "aline"] as Silhouette[]).map((value) => <Choice key={value} selected={silhouette === value} title={t[value]} onClick={() => setSilhouette(value)} />)}</div></div>
            {(garment === "dress" || garment === "top") && <div className="mt-6"><Label className="mb-3 text-sm font-semibold">{t.sleeves}</Label><div className="grid grid-cols-3 gap-3">{(["none", "short", "long"] as Sleeve[]).map((value) => <Choice key={value} selected={sleeve === value} title={t[value]} onClick={() => setSleeve(value)} />)}</div></div>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2"><SelectField label={t.neckline} value={neckline} onChange={setNeckline} options={[["round", t.round], ["v", t.vneck], ["square", t.square]]} /><SelectField label={t.closure} value={closure} onChange={setClosure} options={[["none", t.noClosure], ["back", t.backClosure], ["front", t.frontClosure], ["side", t.sideClosure]]} /></div>
            <div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" className="rounded-xl" onClick={() => setStep(0)}><ArrowLeft />{t.stepReference}</Button><Button size="lg" className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" onClick={() => { setStatus(""); setStep(2); }}>{t.nextMeasures}<ArrowRight /></Button></div>
          </div>}

          {step === 2 && <div className="p-5 sm:p-7"><StepTitle icon={<Ruler />} title={t.measuresTitle} description={t.measuresDesc} />
            <div className="mt-6 grid gap-4 rounded-2xl border border-[#ded4c9] bg-[#faf7f1] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><SelectField label={t.profile} value={profile} onChange={(value) => setProfile(value as Profile)} options={[["women", t.women], ["men", t.men]]} /><SelectField label={t.targetSize} value={size} onChange={(value) => setSize(value as Size)} options={(["XS", "S", "M", "L", "XL"] as Size[]).map((value) => [value, value])} /><Button variant="outline" className="rounded-xl border-[#bfaec4] bg-white" onClick={applyPreset}>{t.applyPreset}</Button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(["bust", "waist", "hips", "shoulder", "backLength", "garmentLength"] as (keyof Measurements)[]).map((key) => <div key={key}><div className="mb-1.5 flex items-center justify-between"><Label className="text-xs text-[#6c626d]">{t[key]}</Label><span className="text-[10px] uppercase text-[#958996]">cm</span></div><Input type="number" min={1} step={0.5} value={measurements[key]} onChange={(event) => setMeasurement(key, event.target.value)} /></div>)}</div>
            <div className="mt-5 rounded-2xl border border-[#ded4c9] bg-[#faf7f1] p-4"><div className="flex items-end gap-4"><div className="flex-1"><div className="mb-1.5 flex items-center justify-between"><Label className="text-xs text-[#6c626d]">{t.ease}</Label><span className="text-[10px] uppercase text-[#958996]">cm</span></div><Input type="number" min={-2} max={20} step={1} value={ease} onChange={(event) => setEase(Number(event.target.value))} /></div><p className="max-w-sm pb-2 text-xs leading-5 text-[#776d78]">{t.easeHelp}</p></div></div>
            {engine === "sewformer" && aiPattern ? <div className="mt-5 flex gap-3 rounded-2xl border border-[#dfcda9] bg-[#fff8e8] p-4 text-sm leading-6 text-[#6b4e27]"><CircleAlert className="mt-0.5 size-5 shrink-0" /><div><p className="font-serif text-lg font-semibold">{t.constructionTitle}</p><p className="mt-1">{t.aiAllowanceDetail}</p></div></div> : <div className="mt-5 rounded-2xl border border-[#d8cbdc] bg-[#f7f1f8] p-4"><p className="font-serif text-xl font-semibold">{t.constructionTitle}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><div className="mb-1.5 flex items-center justify-between"><Label className="text-xs text-[#6c626d]">{t.seamAllowanceLabel}</Label><span className="text-[10px] uppercase text-[#958996]">cm</span></div><Input type="number" min={0} max={3} step={0.1} value={seamAllowance} onChange={(event) => setSeamAllowance(clamp(Number(event.target.value), 0, 3))} /></div><SelectField label={t.dartMode} value={dartMode} onChange={(value) => setDartMode(value as DartMode)} options={[["none", t.dartNone], ["waist", t.dartWaist], ["bustWaist", t.dartBustWaist]]} /></div></div>}
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8cbdc] bg-[#f5eff6] p-4 text-sm leading-6 text-[#5f5063]"><Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(Boolean(value))} className="mt-1 border-[#8e7c92] data-[state=checked]:bg-[#5b3b68]" />{t.confirm}</label>
            {status && <p role="status" className="mt-3 text-sm text-[#a23c32]">{status}</p>}
            <div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" className="rounded-xl" onClick={() => setStep(1)}><ArrowLeft />{t.stepDesign}</Button><Button size="lg" className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" disabled={!confirmed || generating} onClick={() => void generateDraft()}>{generating ? <ScanLine className="animate-pulse" /> : <WandSparkles />}{generating ? t.aiRendering : t.generate}</Button></div>
          </div>}

          {step === 3 && <div className="p-5 sm:p-7"><StepTitle icon={<Sparkles />} title={t.resultTitle} description={engine === "sewformer" && aiPattern ? t.aiResultDesc : t.resultDesc} />
            {engine === "sewformer" && aiPattern && <div className="mt-5 grid gap-3 rounded-2xl border border-[#c8d8cd] bg-[#f3f8f4] p-4 sm:grid-cols-3"><AiMetric label={t.aiPanels} value={String(aiPattern.panelCount)} /><AiMetric label={t.aiStitches} value={String(aiPattern.stitchCount)} /><AiMetric label={t.aiCanvas} value={`${aiPattern.widthCm} × ${aiPattern.heightCm} cm`} /></div>}
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#d7cec3] bg-[#f8f6f1] p-4"><img src={previewUrl} alt={t.resultTitle} className="max-h-[720px] w-full object-contain" /></div>
            <div className="mt-5 rounded-2xl border border-[#d8cec3] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-serif text-xl font-semibold">{t.checksTitle}</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-[#736974]">{t.checksDesc}</p></div><span className="rounded-full bg-[#eee6f0] px-3 py-1.5 text-xs font-bold text-[#62406d]">{passedChecks}/{patternChecks.length}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{patternChecks.map((check) => <div key={check.label} className={`rounded-xl border p-3 ${check.passed ? "border-[#c9d8cd] bg-[#f3f8f4]" : "border-[#dfcda9] bg-[#fff8e8]"}`}><div className="flex items-center justify-between gap-3"><strong className="text-sm">{check.label}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${check.passed ? "bg-[#dceade] text-[#356249]" : "bg-[#f3e3bd] text-[#845c22]"}`}>{check.passed ? t.passed : t.review}</span></div><p className="mt-1.5 text-[11px] leading-5 text-[#6c626d]">{check.detail}</p></div>)}</div><Button variant="ghost" size="sm" className="mt-3 text-[#65436e]" onClick={() => setStep(2)}><ArrowLeft />{t.editSettings}</Button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Button size="lg" variant="outline" className="h-12 rounded-xl border-[#bcaac1]" onClick={downloadSvg}><Download />{t.download}</Button><Button size="lg" className="h-12 rounded-xl bg-[#5b3b68] hover:bg-[#493055]" onClick={openInResizeStudio}>{t.openResize}<ArrowRight /></Button></div>
            <Button variant="ghost" className="mt-3 text-[#684c6e]" onClick={() => { setGeneratedSvg(""); setAiPattern(null); setAnalysis(null); setStatus(""); setStep(0); }}>{t.startOver}</Button>
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

function AiMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#c8d8cd] bg-white/85 p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#607068]">{label}</p><p className="mt-1 font-serif text-xl font-semibold text-[#315d49]">{value}</p></div>;
}

function ShapeControl({ label, value, min = 68, max = 138, onChange, left, middle, right }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void; left: string; middle: string; right: string }) {
  return <div><div className="mb-2 flex items-center justify-between gap-3"><Label className="text-xs font-semibold text-[#5f5661]">{label}</Label><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#62406d]">{value}%</span></div><Slider min={min} max={max} step={1} value={[value]} onValueChange={([next]) => onChange(next)} /><div className="mt-1.5 flex justify-between text-[9px] text-[#8b808c]"><span>{left}</span><span>{middle}</span><span>{right}</span></div></div>;
}

function SummaryList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "warning" }) {
  return <div className={`rounded-[1.3rem] border p-5 ${tone === "positive" ? "border-[#c9d8cd] bg-[#f3f8f4]" : "border-[#dfcda9] bg-[#fff8e8]"}`}><h3 className={`font-serif text-lg font-semibold ${tone === "positive" ? "text-[#365d43]" : "text-[#6b4e27]"}`}>{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-[#665d67]"><span className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full ${tone === "positive" ? "bg-[#dceade] text-[#356249]" : "bg-[#f3e3bd] text-[#845c22]"}`}>{tone === "positive" ? <Check className="size-2.5" /> : <CircleAlert className="size-2.5" />}</span>{item}</li>)}</ul></div>;
}
