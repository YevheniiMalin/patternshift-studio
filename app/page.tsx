"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Download,
  FileUp,
  Info,
  Languages,
  Layers3,
  LoaderCircle,
  Maximize2,
  PlayCircle,
  Scissors,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  languageNames,
  localeByLanguage,
  translations,
  type Language,
  type TranslationKey,
} from "@/app/i18n";

type Size = "XXS" | "XS" | "S" | "M" | "L" | "XL" | "XXL";
type Gender = "women" | "men";
type Garment = "dress" | "top" | "trousers" | "skirt" | "jacket" | "lingerie" | "accessory";
type Stature = "petite" | "regular" | "tall";
type ConfidenceKey = "uniformScale" | "manualAnchors" | "proportionalDraft";

const SIZES: Size[] = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DEMO_PATTERN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60cm" height="80cm" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="#fffdf9"/>
  <g fill="none" stroke="#342b38" stroke-width="4" stroke-linejoin="round">
    <path d="M106 100 L184 58 L248 114 L236 234 Q260 386 292 688 L76 688 Q112 430 108 236 Z"/>
    <path d="M354 114 L418 58 L496 100 L494 236 Q490 430 524 688 L308 688 Q340 386 364 234 Z"/>
    <path d="M92 720 H292 M308 720 H508" stroke-dasharray="12 9"/>
  </g>
  <g stroke="#8b6b94" stroke-width="2" stroke-dasharray="8 7">
    <path d="M182 116 V640"/><path d="M418 116 V640"/>
  </g>
  <g fill="#8b6b94"><path d="M176 130 l6-14 6 14z"/><path d="M412 130 l6-14 6 14z"/></g>
</svg>`;

const SIZE_CHARTS: Record<Gender, Record<Size, { chest: number; waist: number; hips: number }>> = {
  women: {
    XXS: { chest: 76, waist: 58, hips: 84 }, XS: { chest: 80, waist: 62, hips: 88 },
    S: { chest: 84, waist: 66, hips: 92 }, M: { chest: 92, waist: 74, hips: 100 },
    L: { chest: 100, waist: 82, hips: 108 }, XL: { chest: 110, waist: 92, hips: 118 },
    XXL: { chest: 122, waist: 104, hips: 130 },
  },
  men: {
    XXS: { chest: 82, waist: 70, hips: 84 }, XS: { chest: 88, waist: 76, hips: 90 },
    S: { chest: 94, waist: 82, hips: 96 }, M: { chest: 100, waist: 88, hips: 102 },
    L: { chest: 106, waist: 94, hips: 108 }, XL: { chest: 114, waist: 102, hips: 116 },
    XXL: { chest: 122, waist: 110, hips: 124 },
  },
};

const SIZE_EQUIVALENTS: Record<string, Record<Gender, Record<Size, string>>> = {
  international: {
    women: Object.fromEntries(SIZES.map((size) => [size, size])) as Record<Size, string>,
    men: Object.fromEntries(SIZES.map((size) => [size, size])) as Record<Size, string>,
  },
  eu: {
    women: { XXS: "32", XS: "34", S: "36", M: "38–40", L: "42", XL: "44", XXL: "46–48" },
    men: { XXS: "42", XS: "44", S: "46", M: "48–50", L: "52", XL: "54", XXL: "56–58" },
  },
  us: {
    women: { XXS: "0", XS: "2", S: "4–6", M: "8–10", L: "12", XL: "14", XXL: "16–18" },
    men: { XXS: "32", XS: "34", S: "36", M: "38–40", L: "42", XL: "44", XXL: "46–48" },
  },
  uk: {
    women: { XXS: "4", XS: "6", S: "8–10", M: "12–14", L: "16", XL: "18", XXL: "20–22" },
    men: { XXS: "32", XS: "34", S: "36", M: "38–40", L: "42", XL: "44", XXL: "46–48" },
  },
};

const GARMENT_ITEMS: { value: Garment; label: TranslationKey; description: TranslationKey }[] = [
  { value: "dress", label: "dress", description: "dressDesc" },
  { value: "top", label: "top", description: "topDesc" },
  { value: "trousers", label: "trousers", description: "trousersDesc" },
  { value: "skirt", label: "skirt", description: "skirtDesc" },
  { value: "jacket", label: "jacket", description: "jacketDesc" },
  { value: "lingerie", label: "lingerie", description: "lingerieDesc" },
  { value: "accessory", label: "accessory", description: "accessoryDesc" },
];

const STATURE_FACTOR: Record<Stature, number> = { petite: 0.96, regular: 1, tall: 1.04 };
const EASE: Record<string, number> = { close: -2, regular: 4, loose: 10 };
const STRETCH: Record<string, number> = { none: 0, low: 0.02, medium: 0.05, high: 0.09 };
const WEIGHTS: Record<Garment, { chest: number; waist: number; hips: number }> = {
  dress: { chest: 0.42, waist: 0.25, hips: 0.33 }, top: { chest: 0.7, waist: 0.3, hips: 0 },
  trousers: { chest: 0, waist: 0.35, hips: 0.65 }, skirt: { chest: 0, waist: 0.42, hips: 0.58 },
  jacket: { chest: 0.78, waist: 0.22, hips: 0 }, lingerie: { chest: 0.72, waist: 0.18, hips: 0.1 },
  accessory: { chest: 1, waist: 0, hips: 0 },
};

function parseSvgLength(value: string | null): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*(mm|cm|in|px)?$/i);
  if (!match) return null;
  const number = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  if (unit === "mm") return number / 10;
  if (unit === "cm") return number;
  if (unit === "in") return number * 2.54;
  return (number * 2.54) / 96;
}

function bytesFromDataUrl(dataUrl: string) {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function createPdf(jpegs: Uint8Array[], imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const objects = new Map<number, Uint8Array>();
  const pageIds = jpegs.map((_, index) => 3 + index * 3);
  objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, encoder.encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${jpegs.length} >>`));
  jpegs.forEach((jpeg, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    objects.set(pageId, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    const imageHeader = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    const imageFooter = encoder.encode("\nendstream");
    const imageObject = new Uint8Array(imageHeader.length + jpeg.length + imageFooter.length);
    imageObject.set(imageHeader, 0);
    imageObject.set(jpeg, imageHeader.length);
    imageObject.set(imageFooter, imageHeader.length + jpeg.length);
    objects.set(imageId, imageObject);
    const stream = "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ";
    objects.set(contentId, encoder.encode(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
  });
  const chunks: Uint8Array[] = [new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])];
  const offsets = [0];
  let length = chunks[0].length;
  const maxId = Math.max(...objects.keys());
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = length;
    const prefix = encoder.encode(`${id} 0 obj\n`);
    const body = objects.get(id)!;
    const suffix = encoder.encode("\nendobj\n");
    chunks.push(prefix, body, suffix);
    length += prefix.length + body.length + suffix.length;
  }
  const xrefOffset = length;
  const xref = ["xref", `0 ${maxId + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= maxId; id += 1) xref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  xref.push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  chunks.push(encoder.encode(`${xref.join("\n")}\n`));
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [gender, setGender] = useState<Gender>("women");
  const [system, setSystem] = useState("eu");
  const [sourceSize, setSourceSize] = useState<Size>("S");
  const [targetSize, setTargetSize] = useState<Size>("M");
  const [sourceStature, setSourceStature] = useState<Stature>("regular");
  const [targetStature, setTargetStature] = useState<Stature>("regular");
  const [garment, setGarment] = useState<Garment>("dress");
  const [ageGroup, setAgeGroup] = useState("adult");
  const [figure, setFigure] = useState("standard");
  const [fit, setFit] = useState("regular");
  const [stretch, setStretch] = useState("none");
  const [customEase, setCustomEase] = useState(0);
  const [sourceWidth, setSourceWidth] = useState(60);
  const [sourceHeight, setSourceHeight] = useState(80);
  const [showOriginal, setShowOriginal] = useState(true);
  const [preserveSeam, setPreserveSeam] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [exported, setExported] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLElement>(null);
  const settingsSectionRef = useRef<HTMLElement>(null);
  const previewSectionRef = useRef<HTMLElement>(null);
  const t = translations[language];
  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeByLanguage[language], { maximumFractionDigits: 1 }), [language]);
  const formatCm = (value: number) => `${numberFormatter.format(value)} cm`;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!window.sessionStorage.getItem("patternshift-guide-seen")) setGuideOpen(true);
  }, []);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const calculation = useMemo(() => {
    if (garment === "accessory") {
      const step = SIZES.indexOf(targetSize) - SIZES.indexOf(sourceSize);
      const scale = 1 + step * 0.04;
      return {
        widthScale: scale, heightScale: scale, targetWidth: sourceWidth * scale, targetHeight: sourceHeight * scale,
        sourceBody: SIZE_CHARTS[gender][sourceSize], targetBody: SIZE_CHARTS[gender][targetSize],
        confidenceKey: "uniformScale" as ConfidenceKey,
      };
    }
    const sourceBody = SIZE_CHARTS[gender][sourceSize];
    const targetBody = { ...SIZE_CHARTS[gender][targetSize] };
    if (ageGroup === "teen") { targetBody.chest *= 0.985; targetBody.waist *= 0.97; targetBody.hips *= 0.985; }
    if (ageGroup === "mature") targetBody.waist *= 1.035;
    if (figure === "pear") targetBody.hips *= 1.025;
    if (figure === "hourglass") { targetBody.chest *= 1.012; targetBody.hips *= 1.012; targetBody.waist *= 0.985; }
    if (figure === "athletic") targetBody.chest *= 1.02;
    if (figure === "rounded") targetBody.waist *= 1.04;
    const weights = WEIGHTS[garment];
    const targetEase = EASE[fit] + customEase;
    let widthScale =
      weights.chest * ((targetBody.chest + targetEase) / (sourceBody.chest + EASE.regular)) +
      weights.waist * ((targetBody.waist + targetEase) / (sourceBody.waist + EASE.regular)) +
      weights.hips * ((targetBody.hips + targetEase) / (sourceBody.hips + EASE.regular));
    widthScale *= 1 - STRETCH[stretch];
    const heightScale = STATURE_FACTOR[targetStature] / STATURE_FACTOR[sourceStature];
    return {
      widthScale, heightScale, targetWidth: sourceWidth * widthScale, targetHeight: sourceHeight * heightScale,
      sourceBody, targetBody,
      confidenceKey: (widthScale > 1.18 || widthScale < 0.84 ? "manualAnchors" : "proportionalDraft") as ConfidenceKey,
    };
  }, [ageGroup, customEase, figure, fit, garment, gender, sourceHeight, sourceSize, sourceStature, sourceWidth, stretch, targetSize, targetStature]);

  useEffect(() => {
    setExported(false);
  }, [calculation]);

  const equivalence = SIZE_EQUIVALENTS[system][gender][targetSize];
  const confidenceIsWarning = calculation.confidenceKey === "manualAnchors";

  async function useFile(nextFile: File) {
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["svg", "png", "jpg", "jpeg", "webp"].includes(extension)) { setMessage(t.invalidFile); return; }
    if (nextFile.size > 25 * 1024 * 1024) { setMessage(t.fileTooLarge); return; }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const nextUrl = URL.createObjectURL(nextFile);
    setFile(nextFile); setFileUrl(nextUrl); setMessage(""); setProfileConfirmed(false); setExported(false);
    if (extension === "svg") {
      try {
        const svg = new DOMParser().parseFromString(await nextFile.text(), "image/svg+xml").documentElement;
        const detectedWidth = parseSvgLength(svg.getAttribute("width"));
        const detectedHeight = parseSvgLength(svg.getAttribute("height"));
        if (detectedWidth && detectedHeight) {
          setSourceWidth(Number(detectedWidth.toFixed(1))); setSourceHeight(Number(detectedHeight.toFixed(1)));
          setMessage(t.dimensionsDetected);
        }
      } catch { setMessage(t.enterDimensions); }
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) void useFile(nextFile);
  }

  function removeFile() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null); setFileUrl(""); setMessage(""); setProfileConfirmed(false); setExported(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function useDemoPattern() {
    const demoFile = new File([DEMO_PATTERN_SVG], "PatternShift-demo-dress.svg", { type: "image/svg+xml" });
    await useFile(demoFile);
    window.sessionStorage.setItem("patternshift-guide-seen", "true");
    setGuideOpen(false);
    window.setTimeout(() => settingsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

  function changeGuideOpen(open: boolean) {
    setGuideOpen(open);
    if (!open) window.sessionStorage.setItem("patternshift-guide-seen", "true");
  }

  function goToStep(step: number) {
    const target = step === 0 ? uploadSectionRef.current : step === 1 ? settingsSectionRef.current : previewSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function confirmProfile() {
    setProfileConfirmed(true);
    window.setTimeout(() => previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function exportPdf() {
    if (!fileUrl || !file) return;
    setExporting(true); setMessage(t.preparingPdf);
    try {
      const image = new Image(); image.src = fileUrl; await image.decode();
      const pageWidth = 794; const pageHeight = 1123; const pxPerMm = pageWidth / 210;
      const marginMm = 8; const headerMm = 12; const contentWidthMm = 210 - marginMm * 2;
      const contentHeightMm = 297 - marginMm * 2 - headerMm;
      const totalWidthMm = Math.max(1, calculation.targetWidth * 10);
      const totalHeightMm = Math.max(1, calculation.targetHeight * 10);
      const columns = Math.max(1, Math.ceil(totalWidthMm / contentWidthMm));
      const rows = Math.max(1, Math.ceil(totalHeightMm / contentHeightMm));
      if (columns * rows > 80) { setMessage(t.tooManyPages); return; }

      const pages: Uint8Array[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const canvas = document.createElement("canvas"); canvas.width = pageWidth; canvas.height = pageHeight;
          const context = canvas.getContext("2d")!;
          context.fillStyle = "#ffffff"; context.fillRect(0, 0, pageWidth, pageHeight);
          context.fillStyle = "#251f2b"; context.font = "600 14px Arial";
          context.fillText(`PatternShift · ${sourceSize} → ${targetSize}`, marginMm * pxPerMm, 22);
          context.fillStyle = "#716a75"; context.font = "11px Arial";
          context.fillText(`${t.pdfTile} ${row * columns + column + 1}/${rows * columns} · ${t.printAt100}`, marginMm * pxPerMm, 39);
          const tileXmm = column * contentWidthMm; const tileYmm = row * contentHeightMm;
          const visibleWidthMm = Math.min(contentWidthMm, totalWidthMm - tileXmm);
          const visibleHeightMm = Math.min(contentHeightMm, totalHeightMm - tileYmm);
          const sx = (tileXmm / totalWidthMm) * image.naturalWidth; const sy = (tileYmm / totalHeightMm) * image.naturalHeight;
          const sw = (visibleWidthMm / totalWidthMm) * image.naturalWidth; const sh = (visibleHeightMm / totalHeightMm) * image.naturalHeight;
          const dx = marginMm * pxPerMm; const dy = (marginMm + headerMm) * pxPerMm;
          context.drawImage(image, sx, sy, sw, sh, dx, dy, visibleWidthMm * pxPerMm, visibleHeightMm * pxPerMm);
          context.strokeStyle = "#9e8aa9"; context.lineWidth = 1;
          context.strokeRect(dx, dy, visibleWidthMm * pxPerMm, visibleHeightMm * pxPerMm);
          if (row === rows - 1 && column === columns - 1) {
            const square = 10 * pxPerMm; context.strokeStyle = "#251f2b"; context.lineWidth = 2;
            context.strokeRect(pageWidth - marginMm * pxPerMm - square, pageHeight - marginMm * pxPerMm - square, square, square);
            context.font = "10px Arial"; context.fillStyle = "#251f2b";
            context.fillText("10 mm", pageWidth - marginMm * pxPerMm - square, pageHeight - marginMm * pxPerMm - square - 5);
          }
          pages.push(bytesFromDataUrl(canvas.toDataURL("image/jpeg", 0.94)));
        }
      }
      const url = URL.createObjectURL(createPdf(pages, pageWidth, pageHeight));
      const anchor = document.createElement("a"); anchor.href = url;
      anchor.download = `${file.name.replace(/\.[^.]+$/, "")}-${sourceSize}-to-${targetSize}-A4.pdf`;
      anchor.click(); URL.revokeObjectURL(url);
      setExported(true);
      setMessage(pages.length === 1 ? t.pdfReadyOne : t.pdfReadyMany.replace("{count}", String(pages.length)));
    } catch { setMessage(t.pdfError); }
    finally { setExporting(false); }
  }

  const sizingOptions = [["eu", t.european], ["international", t.international], ["us", t.unitedStates], ["uk", t.unitedKingdom]];
  const ageOptions = [["adult", t.adult], ["teen", t.teen], ["mature", t.mature]];
  const statureOptions = [["petite", t.petite], ["regular", t.regular], ["tall", t.tall]];
  const figureOptions = [["standard", t.standard], ["hourglass", t.hourglass], ["pear", t.pear], ["athletic", t.athletic], ["rounded", t.rounded]];
  const fitOptions = [["close", t.closeFitting], ["regular", t.regularFit], ["loose", t.loose]];
  const stretchOptions = [["none", t.noStretch], ["low", t.lowStretch], ["medium", t.mediumStretch], ["high", t.highStretch]];
  const currentStep = exported ? 3 : !file ? 0 : !profileConfirmed ? 1 : 2;
  const guideSteps = [
    { title: t.guideStepOneTitle, description: t.guideStepOneDesc, complete: Boolean(file) },
    { title: t.guideStepTwoTitle, description: t.guideStepTwoDesc, complete: profileConfirmed },
    { title: t.guideStepThreeTitle, description: t.guideStepThreeDesc, complete: exported },
  ];
  const nextAction = currentStep === 0
    ? { title: t.nextUploadTitle, description: t.nextUploadDesc, label: t.goToUpload }
    : currentStep === 1
      ? { title: t.nextProfileTitle, description: t.nextProfileDesc, label: t.goToSettings }
      : currentStep === 2
        ? { title: t.nextPreviewTitle, description: t.nextPreviewDesc, label: t.goToPreview }
        : { title: t.journeyDoneTitle, description: t.journeyDoneDesc, label: "" };

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#251f2b]">
      <header className="atelier-header border-b border-[#d9d0c3]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-[#5b3b68] text-white shadow-sm"><Scissors className="size-5" /></div>
            <div><p className="font-serif text-xl font-semibold leading-none tracking-tight">PatternShift</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#786d79]">{t.digitalStudio}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-[#d6cdc1] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#625865] backdrop-blur md:flex"><ShieldCheck className="size-3.5 text-[#5b3b68]" />{t.privacy}</div>
            <Button variant="outline" size="sm" className="rounded-full border-[#cfc3d2] bg-white/90 text-[#563961]" onClick={() => setGuideOpen(true)}><CircleHelp />{t.helpButton}</Button>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger aria-label={t.language} className="h-9 min-w-32 rounded-full border-[#cfc3d2] bg-white/90 font-semibold text-[#563961]"><Languages className="size-4" /><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(languageNames) as Language[]).map((code) => <SelectItem key={code} value={code}>{languageNames[code]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <Dialog open={guideOpen} onOpenChange={changeGuideOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-y-auto rounded-3xl border-[#d5c7d9] bg-[#fffdf9] p-0 shadow-2xl">
          <DialogHeader className="guide-dialog-header px-6 py-7 text-left sm:px-8">
            <span className="mb-1 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white"><Sparkles className="size-3.5" />{t.guideBadge}</span>
            <DialogTitle className="max-w-xl font-serif text-3xl leading-tight text-white sm:text-4xl">{t.guideTitle}</DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-white/75">{t.guideIntro}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 px-6 py-6 sm:grid-cols-3 sm:px-8">
            {guideSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-[#e1d8cf] bg-[#faf7f1] p-4">
                <span className="mb-3 grid size-8 place-items-center rounded-full bg-[#5b3b68] font-serif text-sm font-bold text-white">{index + 1}</span>
                <h3 className="font-serif text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#716873]">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-[#e2d9cf] bg-[#f7f2ea] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <Button variant="outline" className="rounded-xl border-[#bfaec4]" onClick={() => { changeGuideOpen(false); window.setTimeout(() => goToStep(0), 80); }}><FileUp />{t.useMyPattern}</Button>
            <Button className="rounded-xl bg-[#5b3b68] hover:bg-[#493055]" onClick={() => void useDemoPattern()}><PlayCircle />{t.tryDemo}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="atelier-hero border-b border-[#d9d0c3]" style={{ backgroundImage: `linear-gradient(90deg, rgba(250,247,240,.98) 0%, rgba(250,247,240,.9) 58%, rgba(250,247,240,.35) 100%), url('${publicBasePath}/atelier-pattern.png')` }}>
        <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-7 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end lg:py-9">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#75507e]"><Sparkles className="size-4" />{t.eyebrow}</p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">{t.heroTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#645b66] sm:text-base">{t.heroDesc}</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div><strong className="block font-serif text-2xl">7</strong><span className="text-[#746b74]">{t.sizeBands}</span></div>
            <div><strong className="block font-serif text-2xl">4</strong><span className="text-[#746b74]">{t.systems}</span></div>
            <div><strong className="block font-serif text-2xl">A4</strong><span className="text-[#746b74]">{t.tiledPdf}</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-7" aria-labelledby="guided-setup-title">
        <div className="guide-shell">
          <div className="guide-intro">
            <div>
              <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#76517e]"><ClipboardCheck className="size-4" />{t.guideBadge}</p>
              <h2 id="guided-setup-title" className="font-serif text-2xl font-semibold">{t.journeyTitle}</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#706671]">{t.journeyDesc}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[#61406b]" onClick={() => setGuideOpen(true)}><CircleHelp />{t.helpButton}</Button>
          </div>
          <div className="guide-steps">
            {guideSteps.map((step, index) => {
              const isCurrent = currentStep === index;
              return (
                <button key={step.title} type="button" className={`guide-step ${step.complete ? "is-complete" : ""} ${isCurrent ? "is-current" : ""}`} onClick={() => goToStep(index)} aria-current={isCurrent ? "step" : undefined}>
                  <span className="guide-step-number">{step.complete ? <Check className="size-4" /> : index + 1}</span>
                  <span><strong>{step.title}</strong><small>{step.complete ? t.stepComplete : isCurrent ? t.stepCurrent : step.description}</small></span>
                </button>
              );
            })}
          </div>
          <div className={`next-action ${currentStep === 3 ? "is-done" : ""}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#5b3b68] shadow-sm">{currentStep === 3 ? <CheckCircle2 className="size-5" /> : <ArrowRight className="size-5" />}</span>
            <div className="min-w-0 flex-1"><strong className="block font-serif text-lg">{nextAction.title}</strong><p className="mt-0.5 text-xs leading-5 text-[#6e6370]">{nextAction.description}</p></div>
            {currentStep < 3 && <Button size="sm" className="shrink-0 rounded-xl bg-[#5b3b68] hover:bg-[#493055]" onClick={() => currentStep === 0 ? fileInputRef.current?.click() : goToStep(currentStep)}>{nextAction.label}<ArrowRight /></Button>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 pb-5 pt-4 sm:px-7 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section ref={uploadSectionRef} className={`studio-card scroll-mt-4 overflow-hidden ${currentStep === 0 ? "guide-focus" : ""}`}>
            <SectionHeading number="01" title={t.uploadTitle} subtitle={t.uploadSubtitle} />
            <div className="p-4">
              <InlineHint text={`${t.uploadWhy} ${t.uploadWhat}`} />
              {!file ? (
                <button type="button" className={`upload-zone mt-3 ${dragActive ? "is-active" : ""}`} onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); const dropped = event.dataTransfer.files[0]; if (dropped) void useFile(dropped); }}>
                  <span className="grid size-11 place-items-center rounded-full bg-[#ede5ef] text-[#62406d]"><FileUp className="size-5" /></span><strong>{t.dropPattern}</strong><span>{t.chooseFormats}</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-[#d4c7d8] bg-[#f6eff8] p-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#63416e]"><Layers3 className="size-5" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="text-xs text-[#756a76]">{(file.size / 1024 / 1024).toFixed(2)} MB · {t.ready}</p></div>
                  <Button variant="ghost" size="icon-sm" aria-label={t.removePattern} onClick={removeFile}><X /></Button>
                </div>
              )}
              <input ref={fileInputRef} className="sr-only" type="file" accept=".svg,.png,.jpg,.jpeg,.webp" onChange={handleFile} />
              {!file && <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#dfd4c9] bg-[#faf7f1] p-3"><PlayCircle className="size-5 shrink-0 text-[#6a4774]" /><p className="min-w-0 flex-1 text-[11px] leading-4 text-[#716873]">{t.demoHint}</p><Button variant="outline" size="sm" className="shrink-0 rounded-lg border-[#c7b7ca] bg-white" onClick={() => void useDemoPattern()}>{t.useDemo}</Button></div>}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label={t.originalWidth} suffix="cm"><Input value={sourceWidth} min={1} step={0.1} type="number" onChange={(event) => setSourceWidth(Math.max(1, Number(event.target.value)))} /></Field>
                <Field label={t.originalHeight} suffix="cm"><Input value={sourceHeight} min={1} step={0.1} type="number" onChange={(event) => setSourceHeight(Math.max(1, Number(event.target.value)))} /></Field>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#827783]">{t.dimensionsHelp}</p>
            </div>
          </section>

          <section ref={settingsSectionRef} className={`studio-card scroll-mt-4 overflow-hidden ${currentStep === 1 ? "guide-focus" : ""}`}>
            <SectionHeading number="02" title={t.sourceTargetTitle} subtitle={t.sourceTargetSubtitle} />
            <div className="space-y-4 p-4">
              <InlineHint text={t.sourceTargetWhy} />
              <Tabs value={gender} onValueChange={(value) => setGender(value as Gender)}><TabsList className="grid w-full grid-cols-2 bg-[#ece6dc]"><TabsTrigger value="women">{t.women}</TabsTrigger><TabsTrigger value="men">{t.men}</TabsTrigger></TabsList></Tabs>
              <div className="grid grid-cols-2 gap-3"><SelectField label={t.sizingSystem} value={system} onChange={setSystem} options={sizingOptions} /><SelectField label={t.ageGroup} value={ageGroup} onChange={setAgeGroup} options={ageOptions} /></div>
              <div className="conversion-row"><SelectField label={t.originalSize} value={sourceSize} onChange={(value) => setSourceSize(value as Size)} options={SIZES.map((size) => [size, size])} /><ArrowRight className="mt-6 size-4 shrink-0 text-[#8d7a92]" /><SelectField label={t.targetSize} value={targetSize} onChange={(value) => setTargetSize(value as Size)} options={SIZES.map((size) => [size, size])} /></div>
              <div className="conversion-row"><SelectField label={t.sourceStature} value={sourceStature} onChange={(value) => setSourceStature(value as Stature)} options={statureOptions} /><ArrowRight className="mt-6 size-4 shrink-0 text-[#8d7a92]" /><SelectField label={t.targetStature} value={targetStature} onChange={(value) => setTargetStature(value as Stature)} options={statureOptions} /></div>
            </div>
          </section>

          <section className={`studio-card overflow-hidden ${currentStep === 1 ? "guide-focus-secondary" : ""}`}>
            <SectionHeading number="03" title={t.constructionTitle} subtitle={t.constructionSubtitle} />
            <div className="space-y-4 p-4">
              <InlineHint text={t.constructionWhy} />
              <div><Label className="mb-2 text-xs text-[#6c626d]">{t.garmentType}</Label><div className="grid grid-cols-2 gap-2">{GARMENT_ITEMS.map((item) => <button key={item.value} type="button" onClick={() => setGarment(item.value)} className={`option-tile ${garment === item.value ? "is-selected" : ""}`}><span className="flex items-center gap-1.5 font-semibold">{garment === item.value && <Check className="size-3.5" />}{t[item.label]}</span><small>{t[item.description]}</small></button>)}</div></div>
              <div className="grid grid-cols-2 gap-3"><SelectField label={t.figureProfile} value={figure} onChange={setFigure} options={figureOptions} /><SelectField label={t.fit} value={fit} onChange={setFit} options={fitOptions} /></div>
              <SelectField label={t.fabricStretch} value={stretch} onChange={setStretch} options={stretchOptions} />
              <div className="rounded-xl bg-[#f1ece4] p-3"><div className="mb-3 flex items-center justify-between text-xs font-medium"><span>{t.designerEase}</span><strong>{customEase > 0 ? "+" : ""}{customEase} cm</strong></div><Slider value={[customEase]} min={-4} max={16} step={1} onValueChange={(value) => setCustomEase(value[0])} className="[&_[data-slot=slider-range]]:bg-[#63416e] [&_[data-slot=slider-thumb]]:border-[#63416e]" /><div className="mt-2 flex justify-between text-[10px] text-[#807681]"><span>−4 {t.close}</span><span>0 {t.standard.toLowerCase()}</span><span>+16 {t.volume}</span></div></div>
              <CheckRow checked={preserveSeam} onChange={setPreserveSeam} label={t.preserveSeam} />
              <Button className="w-full rounded-xl bg-[#5b3b68] hover:bg-[#493055]" disabled={!file} onClick={confirmProfile}>{t.continueToPreview}<ArrowRight /></Button>
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="studio-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded6cb] px-4 py-3 sm:px-5"><div><h2 className="font-serif text-xl font-semibold">{t.gradingTable}</h2><p className="text-xs text-[#756c76]">{t.bodyReference}</p></div><div className="flex items-center gap-2 text-xs"><span className="rounded-full bg-[#ece3ef] px-3 py-1.5 font-semibold text-[#62406d]">{system.toUpperCase()} {equivalence}</span><span className={`rounded-full px-3 py-1.5 font-semibold ${confidenceIsWarning ? "bg-[#fff0dc] text-[#855410]" : "bg-[#e4efe8] text-[#356249]"}`}>{t[calculation.confidenceKey]}</span></div></div>
            <div className="overflow-x-auto"><table className="measurement-table"><thead><tr><th>{t.measurement}</th><th>{sourceSize} {t.source}</th><th>{targetSize} {t.target}</th><th>{t.change}</th></tr></thead><tbody>{(["chest", "waist", "hips"] as const).map((key) => { const source = calculation.sourceBody[key]; const target = calculation.targetBody[key]; return <tr key={key}><td>{t[key]}</td><td>{formatCm(source)}</td><td>{formatCm(target)}</td><td className={target >= source ? "positive" : "negative"}>{target >= source ? "+" : ""}{numberFormatter.format(target - source)} cm</td></tr>; })}</tbody></table></div>
          </div>

          <div ref={previewSectionRef} className={`studio-card scroll-mt-4 overflow-hidden ${currentStep === 2 ? "guide-focus" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded6cb] px-4 py-3 sm:px-5"><div><h2 className="font-serif text-xl font-semibold">{t.patternPreview}</h2><p className="text-xs text-[#756c76]">{t.previewSubtitle}</p></div><CheckRow checked={showOriginal} onChange={setShowOriginal} label={t.showOriginal} /></div>
            <div className="border-b border-[#e3dbd1] px-4 py-3 sm:px-5"><InlineHint text={t.previewHelp} /></div>
            <div className="pattern-workspace"><div className="ruler ruler-top" aria-hidden="true" /><div className="ruler ruler-left" aria-hidden="true" />{!fileUrl ? <button type="button" className="empty-preview" onClick={() => fileInputRef.current?.click()}><span className="grid size-16 place-items-center rounded-full border border-[#cbbfd0] bg-white text-[#6a4b73] shadow-sm"><Maximize2 className="size-7" /></span><strong>{t.emptyTitle}</strong><span>{t.emptyDesc}</span><span className="mt-1 rounded-full bg-[#5b3b68] px-4 py-2 text-xs font-semibold text-white">{t.choosePattern}</span></button> : <div className="preview-stage">{showOriginal && <img src={fileUrl} alt={t.originalAlt} className="pattern-image original" />}<img src={fileUrl} alt={`${t.targetAlt} ${targetSize}`} className="pattern-image target" style={{ transform: `scale(${calculation.widthScale}, ${calculation.heightScale})` }} /><div className="preview-legend"><span><i className="legend-original" />{t.original} {sourceSize}</span><span><i className="legend-target" />{t.draft} {targetSize}</span></div></div>}</div>
            <div className="grid border-t border-[#ded6cb] sm:grid-cols-4"><Metric label={t.widthScale} value={`${numberFormatter.format(calculation.widthScale * 100)}%`} detail={`${calculation.widthScale >= 1 ? "+" : ""}${numberFormatter.format((calculation.widthScale - 1) * 100)}%`} /><Metric label={t.heightScale} value={`${numberFormatter.format(calculation.heightScale * 100)}%`} detail={`${calculation.heightScale >= 1 ? "+" : ""}${numberFormatter.format((calculation.heightScale - 1) * 100)}%`} /><Metric label={t.draftWidth} value={formatCm(calculation.targetWidth)} detail={`${t.from} ${formatCm(sourceWidth)}`} /><Metric label={t.draftHeight} value={formatCm(calculation.targetHeight)} detail={`${t.from} ${formatCm(sourceHeight)}`} /></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]"><div className="flex gap-3 rounded-2xl border border-[#dfcda9] bg-[#fff8e8] p-4 text-sm text-[#624f32]"><Info className="mt-0.5 size-5 shrink-0 text-[#8e652c]" /><p><strong>{t.fitCheckpoint}</strong> {t.fitNotice}</p></div><Button size="lg" className="h-auto min-h-14 rounded-2xl bg-[#5b3b68] px-6 shadow-md hover:bg-[#493055]" disabled={!file || !profileConfirmed || exporting} onClick={() => void exportPdf()}>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}<span className="text-left"><strong className="block">{t.downloadPdf}</strong><small className="font-normal text-white/70">{t.printScale}</small></span></Button></div>
          {message && <div role="status" className="rounded-xl border border-[#d6c9d9] bg-white px-4 py-3 text-sm text-[#5d4b63]">{message}</div>}
        </section>
      </div>

      <footer className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 pb-7 pt-2 text-xs text-[#776e78] sm:px-7"><span>{t.footerPrivate}</span><span>{t.footerNotice}</span></footer>
    </main>
  );
}

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="section-heading"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function InlineHint({ text }: { text: string }) {
  return <div className="inline-hint"><CircleHelp className="mt-0.5 size-4 shrink-0" /><p>{text}</p></div>;
}

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return <div><div className="mb-1.5 flex items-center justify-between"><Label className="text-xs text-[#6c626d]">{label}</Label>{suffix && <span className="text-[10px] uppercase text-[#958996]">{suffix}</span>}</div>{children}</div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="min-w-0"><Label className="mb-1.5 text-xs text-[#6c626d]">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full border-[#d7cec3] bg-white"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent></Select></div>;
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#665b67]"><Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} className="border-[#8e7c92] data-[state=checked]:border-[#5b3b68] data-[state=checked]:bg-[#5b3b68]" />{label}</label>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-b border-[#ded6cb] px-5 py-4 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#817782]">{label}</span><strong className="mt-1 block font-serif text-2xl">{value}</strong><small className="text-[#857b85]">{detail}</small></div>;
}
