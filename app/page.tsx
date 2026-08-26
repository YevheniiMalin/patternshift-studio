"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  FileUp,
  Info,
  Layers3,
  LoaderCircle,
  Maximize2,
  Scissors,
  ShieldCheck,
  Sparkles,
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Size = "XXS" | "XS" | "S" | "M" | "L" | "XL" | "XXL";
type Gender = "women" | "men";
type Garment =
  | "dress"
  | "top"
  | "trousers"
  | "skirt"
  | "jacket"
  | "lingerie"
  | "accessory";
type Stature = "petite" | "regular" | "tall";

const SIZES: Size[] = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

const SIZE_CHARTS: Record<Gender, Record<Size, { chest: number; waist: number; hips: number }>> = {
  women: {
    XXS: { chest: 76, waist: 58, hips: 84 },
    XS: { chest: 80, waist: 62, hips: 88 },
    S: { chest: 84, waist: 66, hips: 92 },
    M: { chest: 92, waist: 74, hips: 100 },
    L: { chest: 100, waist: 82, hips: 108 },
    XL: { chest: 110, waist: 92, hips: 118 },
    XXL: { chest: 122, waist: 104, hips: 130 },
  },
  men: {
    XXS: { chest: 82, waist: 70, hips: 84 },
    XS: { chest: 88, waist: 76, hips: 90 },
    S: { chest: 94, waist: 82, hips: 96 },
    M: { chest: 100, waist: 88, hips: 102 },
    L: { chest: 106, waist: 94, hips: 108 },
    XL: { chest: 114, waist: 102, hips: 116 },
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

const GARMENTS: { value: Garment; label: string; description: string }[] = [
  { value: "dress", label: "Dress", description: "Chest, waist & hips" },
  { value: "top", label: "Top / shirt", description: "Chest & waist" },
  { value: "trousers", label: "Trousers", description: "Waist & hips" },
  { value: "skirt", label: "Skirt", description: "Waist & hips" },
  { value: "jacket", label: "Jacket", description: "Chest-led with ease" },
  { value: "lingerie", label: "Close-fit garment", description: "Stretch-sensitive" },
  { value: "accessory", label: "Bag / accessory", description: "Uniform scaling" },
];

const STATURE_FACTOR: Record<Stature, number> = { petite: 0.96, regular: 1, tall: 1.04 };
const EASE: Record<string, number> = { close: -2, regular: 4, loose: 10 };
const STRETCH: Record<string, number> = { none: 0, low: 0.02, medium: 0.05, high: 0.09 };

const WEIGHTS: Record<Garment, { chest: number; waist: number; hips: number }> = {
  dress: { chest: 0.42, waist: 0.25, hips: 0.33 },
  top: { chest: 0.7, waist: 0.3, hips: 0 },
  trousers: { chest: 0, waist: 0.35, hips: 0.65 },
  skirt: { chest: 0, waist: 0.42, hips: 0.58 },
  jacket: { chest: 0.78, waist: 0.22, hips: 0 },
  lingerie: { chest: 0.72, waist: 0.18, hips: 0.1 },
  accessory: { chest: 1, waist: 0, hips: 0 },
};

const numberFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function formatCm(value: number) {
  return `${numberFormatter.format(value)} cm`;
}

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
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const calculation = useMemo(() => {
    if (garment === "accessory") {
      const step = SIZES.indexOf(targetSize) - SIZES.indexOf(sourceSize);
      const scale = 1 + step * 0.04;
      return {
        widthScale: scale,
        heightScale: scale,
        targetWidth: sourceWidth * scale,
        targetHeight: sourceHeight * scale,
        sourceBody: SIZE_CHARTS[gender][sourceSize],
        targetBody: SIZE_CHARTS[gender][targetSize],
        confidence: "Uniform scale",
      };
    }

    const sourceBody = SIZE_CHARTS[gender][sourceSize];
    const targetBody = { ...SIZE_CHARTS[gender][targetSize] };
    if (ageGroup === "teen") {
      targetBody.chest *= 0.985;
      targetBody.waist *= 0.97;
      targetBody.hips *= 0.985;
    }
    if (ageGroup === "mature") targetBody.waist *= 1.035;
    if (figure === "pear") targetBody.hips *= 1.025;
    if (figure === "hourglass") {
      targetBody.chest *= 1.012;
      targetBody.hips *= 1.012;
      targetBody.waist *= 0.985;
    }
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
      widthScale,
      heightScale,
      targetWidth: sourceWidth * widthScale,
      targetHeight: sourceHeight * heightScale,
      sourceBody,
      targetBody,
      confidence: widthScale > 1.18 || widthScale < 0.84 ? "Manual anchors advised" : "Proportional draft",
    };
  }, [ageGroup, customEase, figure, fit, garment, gender, sourceHeight, sourceSize, sourceStature, sourceWidth, stretch, targetSize, targetStature]);

  const equivalence = SIZE_EQUIVALENTS[system][gender][targetSize];

  async function useFile(nextFile: File) {
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["svg", "png", "jpg", "jpeg", "webp"].includes(extension)) {
      setMessage("Please upload an SVG, PNG, JPG or WebP pattern. PDF input is coming next.");
      return;
    }
    if (nextFile.size > 25 * 1024 * 1024) {
      setMessage("This file is larger than 25 MB. Please use a lighter pattern file.");
      return;
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const nextUrl = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setFileUrl(nextUrl);
    setMessage("");

    if (extension === "svg") {
      try {
        const svg = new DOMParser().parseFromString(await nextFile.text(), "image/svg+xml").documentElement;
        const detectedWidth = parseSvgLength(svg.getAttribute("width"));
        const detectedHeight = parseSvgLength(svg.getAttribute("height"));
        if (detectedWidth && detectedHeight) {
          setSourceWidth(Number(detectedWidth.toFixed(1)));
          setSourceHeight(Number(detectedHeight.toFixed(1)));
          setMessage("Physical SVG dimensions detected. Check them before exporting.");
        }
      } catch {
        setMessage("Pattern loaded. Please enter its physical width and height.");
      }
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) void useFile(nextFile);
  }

  function removeFile() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl("");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function exportPdf() {
    if (!fileUrl || !file) return;
    setExporting(true);
    setMessage("Preparing tiled A4 pages…");
    try {
      const image = new Image();
      image.src = fileUrl;
      await image.decode();
      const pageWidth = 794;
      const pageHeight = 1123;
      const pxPerMm = pageWidth / 210;
      const marginMm = 8;
      const headerMm = 12;
      const contentWidthMm = 210 - marginMm * 2;
      const contentHeightMm = 297 - marginMm * 2 - headerMm;
      const totalWidthMm = Math.max(1, calculation.targetWidth * 10);
      const totalHeightMm = Math.max(1, calculation.targetHeight * 10);
      const columns = Math.max(1, Math.ceil(totalWidthMm / contentWidthMm));
      const rows = Math.max(1, Math.ceil(totalHeightMm / contentHeightMm));

      if (columns * rows > 80) {
        setMessage("The pattern would require more than 80 A4 pages. Reduce its physical dimensions first.");
        return;
      }

      const pages: Uint8Array[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const canvas = document.createElement("canvas");
          canvas.width = pageWidth;
          canvas.height = pageHeight;
          const context = canvas.getContext("2d")!;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, pageWidth, pageHeight);
          context.fillStyle = "#251f2b";
          context.font = "600 14px Arial";
          context.fillText(`PatternShift · ${sourceSize} → ${targetSize}`, marginMm * pxPerMm, 22);
          context.fillStyle = "#716a75";
          context.font = "11px Arial";
          context.fillText(`A4 tile ${row * columns + column + 1}/${rows * columns} · print at 100%`, marginMm * pxPerMm, 39);

          const tileXmm = column * contentWidthMm;
          const tileYmm = row * contentHeightMm;
          const visibleWidthMm = Math.min(contentWidthMm, totalWidthMm - tileXmm);
          const visibleHeightMm = Math.min(contentHeightMm, totalHeightMm - tileYmm);
          const sx = (tileXmm / totalWidthMm) * image.naturalWidth;
          const sy = (tileYmm / totalHeightMm) * image.naturalHeight;
          const sw = (visibleWidthMm / totalWidthMm) * image.naturalWidth;
          const sh = (visibleHeightMm / totalHeightMm) * image.naturalHeight;
          const dx = marginMm * pxPerMm;
          const dy = (marginMm + headerMm) * pxPerMm;
          context.drawImage(image, sx, sy, sw, sh, dx, dy, visibleWidthMm * pxPerMm, visibleHeightMm * pxPerMm);
          context.strokeStyle = "#9e8aa9";
          context.lineWidth = 1;
          context.strokeRect(dx, dy, visibleWidthMm * pxPerMm, visibleHeightMm * pxPerMm);

          if (row === rows - 1 && column === columns - 1) {
            const square = 10 * pxPerMm;
            context.strokeStyle = "#251f2b";
            context.lineWidth = 2;
            context.strokeRect(pageWidth - marginMm * pxPerMm - square, pageHeight - marginMm * pxPerMm - square, square, square);
            context.font = "10px Arial";
            context.fillStyle = "#251f2b";
            context.fillText("10 mm", pageWidth - marginMm * pxPerMm - square, pageHeight - marginMm * pxPerMm - square - 5);
          }
          pages.push(bytesFromDataUrl(canvas.toDataURL("image/jpeg", 0.94)));
        }
      }

      const url = URL.createObjectURL(createPdf(pages, pageWidth, pageHeight));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.[^.]+$/, "")}-${sourceSize}-to-${targetSize}-A4.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`PDF ready: ${pages.length} A4 page${pages.length === 1 ? "" : "s"}. Print at 100%.`);
    } catch {
      setMessage("The PDF could not be created from this file. Try an SVG, PNG or JPG without password protection.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#251f2b]">
      <header className="atelier-header border-b border-[#d9d0c3]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-[#5b3b68] text-white shadow-sm"><Scissors className="size-5" /></div>
            <div><p className="font-serif text-xl font-semibold leading-none tracking-tight">PatternShift</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#786d79]">Digital grading studio</p></div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#d6cdc1] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#625865] backdrop-blur sm:flex"><ShieldCheck className="size-3.5 text-[#5b3b68]" />Your pattern stays in this browser</div>
        </div>
      </header>

      <section
        className="atelier-hero border-b border-[#d9d0c3]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(250,247,240,.98) 0%, rgba(250,247,240,.9) 58%, rgba(250,247,240,.35) 100%), url('${publicBasePath}/atelier-pattern.png')`,
        }}
      >
        <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-7 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end lg:py-9">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#75507e]"><Sparkles className="size-4" />Browser-based pattern resizing</p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">Resize a sewing pattern with its fit in mind.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#645b66] sm:text-base">Upload a pattern, describe the body, garment and fabric, then create a calibrated proportional draft for your target size.</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div><strong className="block font-serif text-2xl">7</strong><span className="text-[#746b74]">size bands</span></div>
            <div><strong className="block font-serif text-2xl">4</strong><span className="text-[#746b74]">systems</span></div>
            <div><strong className="block font-serif text-2xl">A4</strong><span className="text-[#746b74]">tiled PDF</span></div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-7 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="studio-card overflow-hidden">
            <div className="section-heading"><span>01</span><div><h2>Upload your pattern</h2><p>Vector files produce the cleanest result</p></div></div>
            <div className="p-4">
              {!file ? (
                <button type="button" className={`upload-zone ${dragActive ? "is-active" : ""}`} onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); const dropped = event.dataTransfer.files[0]; if (dropped) void useFile(dropped); }}>
                  <span className="grid size-11 place-items-center rounded-full bg-[#ede5ef] text-[#62406d]"><FileUp className="size-5" /></span><strong>Drop a pattern here</strong><span>or choose SVG, PNG, JPG, WebP · max 25 MB</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-[#d4c7d8] bg-[#f6eff8] p-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#63416e]"><Layers3 className="size-5" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="text-xs text-[#756a76]">{(file.size / 1024 / 1024).toFixed(2)} MB · ready</p></div>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove pattern" onClick={removeFile}><X /></Button>
                </div>
              )}
              <input ref={fileInputRef} className="sr-only" type="file" accept=".svg,.png,.jpg,.jpeg,.webp" onChange={handleFile} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Original width" suffix="cm"><Input value={sourceWidth} min={1} step={0.1} type="number" onChange={(event) => setSourceWidth(Math.max(1, Number(event.target.value)))} /></Field>
                <Field label="Original height" suffix="cm"><Input value={sourceHeight} min={1} step={0.1} type="number" onChange={(event) => setSourceHeight(Math.max(1, Number(event.target.value)))} /></Field>
              </div>
            </div>
          </section>

          <section className="studio-card overflow-hidden">
            <div className="section-heading"><span>02</span><div><h2>Source & target</h2><p>Choose the base chart and conversion</p></div></div>
            <div className="space-y-4 p-4">
              <Tabs value={gender} onValueChange={(value) => setGender(value as Gender)}><TabsList className="grid w-full grid-cols-2 bg-[#ece6dc]"><TabsTrigger value="women">Women</TabsTrigger><TabsTrigger value="men">Men</TabsTrigger></TabsList></Tabs>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Sizing system" value={system} onChange={setSystem} options={[["eu", "European (EU)"], ["international", "International"], ["us", "United States"], ["uk", "United Kingdom"]]} />
                <SelectField label="Age group" value={ageGroup} onChange={setAgeGroup} options={[["adult", "Adult"], ["teen", "Teen 12–17"], ["mature", "Mature adult"]]} />
              </div>
              <div className="conversion-row">
                <SelectField label="Original size" value={sourceSize} onChange={(value) => setSourceSize(value as Size)} options={SIZES.map((size) => [size, size])} />
                <ArrowRight className="mt-6 size-4 shrink-0 text-[#8d7a92]" />
                <SelectField label="Target size" value={targetSize} onChange={(value) => setTargetSize(value as Size)} options={SIZES.map((size) => [size, size])} />
              </div>
              <div className="conversion-row">
                <SelectField label="Original height" value={sourceStature} onChange={(value) => setSourceStature(value as Stature)} options={[["petite", "Petite"], ["regular", "Regular"], ["tall", "Tall"]]} />
                <ArrowRight className="mt-6 size-4 shrink-0 text-[#8d7a92]" />
                <SelectField label="Target height" value={targetStature} onChange={(value) => setTargetStature(value as Stature)} options={[["petite", "Petite"], ["regular", "Regular"], ["tall", "Tall"]]} />
              </div>
            </div>
          </section>

          <section className="studio-card overflow-hidden">
            <div className="section-heading"><span>03</span><div><h2>Construction profile</h2><p>Controls the proportional grading model</p></div></div>
            <div className="space-y-4 p-4">
              <div>
                <Label className="mb-2 text-xs text-[#6c626d]">Garment type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GARMENTS.map((item) => <button key={item.value} type="button" onClick={() => setGarment(item.value)} className={`option-tile ${garment === item.value ? "is-selected" : ""}`}><span className="flex items-center gap-1.5 font-semibold">{garment === item.value && <Check className="size-3.5" />}{item.label}</span><small>{item.description}</small></button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Figure profile" value={figure} onChange={setFigure} options={[["standard", "Standard"], ["hourglass", "Hourglass"], ["pear", "Pear"], ["athletic", "Athletic"], ["rounded", "Rounded"]]} />
                <SelectField label="Fit" value={fit} onChange={setFit} options={[["close", "Close fitting"], ["regular", "Regular"], ["loose", "Loose"]]} />
              </div>
              <SelectField label="Fabric stretch" value={stretch} onChange={setStretch} options={[["none", "Woven / no stretch"], ["low", "Low stretch (≈2%)"], ["medium", "Medium stretch (≈5%)"], ["high", "High stretch (≈9%)"]]} />
              <div className="rounded-xl bg-[#f1ece4] p-3">
                <div className="mb-3 flex items-center justify-between text-xs font-medium"><span>Additional designer ease</span><strong>{customEase > 0 ? "+" : ""}{customEase} cm</strong></div>
                <Slider value={[customEase]} min={-4} max={16} step={1} onValueChange={(value) => setCustomEase(value[0])} className="[&_[data-slot=slider-range]]:bg-[#63416e] [&_[data-slot=slider-thumb]]:border-[#63416e]" />
                <div className="mt-2 flex justify-between text-[10px] text-[#807681]"><span>−4 close</span><span>0 standard</span><span>+16 volume</span></div>
              </div>
              <CheckRow checked={preserveSeam} onChange={setPreserveSeam} label="Keep seam allowance visually consistent" />
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="studio-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded6cb] px-4 py-3 sm:px-5">
              <div><h2 className="font-serif text-xl font-semibold">Grading table</h2><p className="text-xs text-[#756c76]">Body-measurement reference · centimetres</p></div>
              <div className="flex items-center gap-2 text-xs"><span className="rounded-full bg-[#ece3ef] px-3 py-1.5 font-semibold text-[#62406d]">{system.toUpperCase()} {equivalence}</span><span className={`rounded-full px-3 py-1.5 font-semibold ${calculation.confidence === "Manual anchors advised" ? "bg-[#fff0dc] text-[#855410]" : "bg-[#e4efe8] text-[#356249]"}`}>{calculation.confidence}</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="measurement-table">
                <thead><tr><th>Measurement</th><th>{sourceSize} source</th><th>{targetSize} target</th><th>Change</th></tr></thead>
                <tbody>{(["chest", "waist", "hips"] as const).map((key) => { const source = calculation.sourceBody[key]; const target = calculation.targetBody[key]; return <tr key={key}><td className="capitalize">{key}</td><td>{formatCm(source)}</td><td>{formatCm(target)}</td><td className={target >= source ? "positive" : "negative"}>{target >= source ? "+" : ""}{numberFormatter.format(target - source)} cm</td></tr>; })}</tbody>
              </table>
            </div>
          </div>

          <div className="studio-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded6cb] px-4 py-3 sm:px-5"><div><h2 className="font-serif text-xl font-semibold">Pattern preview</h2><p className="text-xs text-[#756c76]">Original and calculated proportional draft</p></div><CheckRow checked={showOriginal} onChange={setShowOriginal} label="Show original overlay" /></div>
            <div className="pattern-workspace">
              <div className="ruler ruler-top" aria-hidden="true" /><div className="ruler ruler-left" aria-hidden="true" />
              {!fileUrl ? (
                <button type="button" className="empty-preview" onClick={() => fileInputRef.current?.click()}><span className="grid size-16 place-items-center rounded-full border border-[#cbbfd0] bg-white text-[#6a4b73] shadow-sm"><Maximize2 className="size-7" /></span><strong>Your resized pattern will appear here</strong><span>Upload a clean, flat pattern image to begin</span><span className="mt-1 rounded-full bg-[#5b3b68] px-4 py-2 text-xs font-semibold text-white">Choose pattern</span></button>
              ) : (
                <div className="preview-stage">{showOriginal && <img src={fileUrl} alt="Original pattern overlay" className="pattern-image original" />}<img src={fileUrl} alt={`Calculated ${targetSize} pattern draft`} className="pattern-image target" style={{ transform: `scale(${calculation.widthScale}, ${calculation.heightScale})` }} /><div className="preview-legend"><span><i className="legend-original" />Original {sourceSize}</span><span><i className="legend-target" />Draft {targetSize}</span></div></div>
              )}
            </div>
            <div className="grid border-t border-[#ded6cb] sm:grid-cols-4">
              <Metric label="Width scale" value={`${(calculation.widthScale * 100).toFixed(1)}%`} detail={`${calculation.widthScale >= 1 ? "+" : ""}${((calculation.widthScale - 1) * 100).toFixed(1)}%`} />
              <Metric label="Height scale" value={`${(calculation.heightScale * 100).toFixed(1)}%`} detail={`${calculation.heightScale >= 1 ? "+" : ""}${((calculation.heightScale - 1) * 100).toFixed(1)}%`} />
              <Metric label="Draft width" value={formatCm(calculation.targetWidth)} detail={`from ${formatCm(sourceWidth)}`} />
              <Metric label="Draft height" value={formatCm(calculation.targetHeight)} detail={`from ${formatCm(sourceHeight)}`} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="flex gap-3 rounded-2xl border border-[#dfcda9] bg-[#fff8e8] p-4 text-sm text-[#624f32]"><Info className="mt-0.5 size-5 shrink-0 text-[#8e652c]" /><p><strong>Fit checkpoint.</strong> This version produces a proportional draft from body tables and your selections. For fitted clothing, verify seam matching, grainline, armhole, sleeve cap and at least one test garment before cutting final fabric.</p></div>
            <Button size="lg" className="h-auto min-h-14 rounded-2xl bg-[#5b3b68] px-6 shadow-md hover:bg-[#493055]" disabled={!file || exporting} onClick={() => void exportPdf()}>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}<span className="text-left"><strong className="block">Download tiled PDF</strong><small className="font-normal text-white/70">A4 · 100% print scale</small></span></Button>
          </div>
          {message && <div role="status" className="rounded-xl border border-[#d6c9d9] bg-white px-4 py-3 text-sm text-[#5d4b63]">{message}</div>}
        </section>
      </div>

      <footer className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 pb-7 pt-2 text-xs text-[#776e78] sm:px-7"><span>PatternShift Studio · privacy-first browser processing</span><span>Measurement references are a starting point, not a substitute for a fitting.</span></footer>
    </main>
  );
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
