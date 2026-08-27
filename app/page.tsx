"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  FileUp,
  Languages,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languageNames, translations, type Language } from "@/app/i18n";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const en = {
  eyebrow: "Two ways to begin",
  title: "Turn an idea or an existing pattern into a draft you can inspect.",
  intro: "Choose the starting point that matches what you have now. Each mode guides you one step at a time and keeps your files in this browser.",
  choose: "Choose your starting point",
  chooseDesc: "You can return here at any time without losing the original file on the current page.",
  resizeBadge: "Available now",
  resizeTitle: "Resize an existing pattern",
  resizeDesc: "Start with a PDF, SVG or clear pattern image. Configure the garment, body profile, fit and fabric, compare the outlines and export tiled A4 pages.",
  resizeAction: "Resize a pattern",
  resizeFeatures: ["Guided PDF page assembly", "EU, international, US and UK sizes", "Overlay preview and A4 PDF export"],
  createBadge: "New guided prototype",
  createTitle: "Create a pattern from images",
  createDesc: "Use photos, a sketch or a drawing as visual references. Add measurements and construction details, then generate a preliminary base pattern for review.",
  createAction: "Create from images",
  createFeatures: ["Front, back and side references", "Clear assumptions and confidence checks", "Preliminary SVG sent to the resize studio"],
  warningTitle: "A useful draft, not an invisible guess",
  warning: "The image mode creates a preliminary measurement-based pattern. Hidden seams, darts and construction details must still be confirmed before fabric is cut.",
  privateTitle: "Private by design",
  privateDesc: "Uploaded pattern files and reference images are processed locally in your browser.",
  footer: "PatternShift Studio · Browser-based pattern tools",
};

type HomeCopy = Omit<typeof en, "resizeFeatures" | "createFeatures"> & {
  resizeFeatures: string[];
  createFeatures: string[];
};

const copy: Record<Language, HomeCopy> = {
  en,
  ru: {
    eyebrow: "Два способа начать",
    title: "Превратите идею или готовую выкройку в эскиз, который можно проверить.",
    intro: "Выберите исходный материал, который у вас уже есть. Каждый режим проведёт вас по шагам, а файлы останутся в браузере.",
    choose: "С чего вы хотите начать?",
    chooseDesc: "На эту страницу можно вернуться в любой момент.",
    resizeBadge: "Уже работает",
    resizeTitle: "Изменить размер готовой выкройки",
    resizeDesc: "Начните с PDF, SVG или чёткого изображения выкройки. Укажите изделие, параметры фигуры, посадку и ткань, сравните контуры и экспортируйте листы A4.",
    resizeAction: "Изменить выкройку",
    resizeFeatures: ["Пошаговая сборка страниц PDF", "Размеры EU, International, US и UK", "Сравнение контуров и экспорт PDF A4"],
    createBadge: "Новый пошаговый прототип",
    createTitle: "Создать выкройку по изображениям",
    createDesc: "Используйте фотографии, эскиз или рисунок как визуальные ориентиры. Добавьте мерки и детали конструкции, чтобы получить предварительную базовую выкройку.",
    createAction: "Создать по изображениям",
    createFeatures: ["Виды спереди, сзади и сбоку", "Понятные предположения и уровень уверенности", "Передача предварительного SVG в редактор размеров"],
    warningTitle: "Полезный эскиз без скрытых догадок",
    warning: "Режим по изображениям создаёт предварительную выкройку на основе мерок. Скрытые швы, вытачки и конструктивные детали нужно подтвердить до раскроя ткани.",
    privateTitle: "Конфиденциальность по умолчанию",
    privateDesc: "Загруженные выкройки и изображения обрабатываются локально в вашем браузере.",
    footer: "PatternShift Studio · Инструменты для выкроек в браузере",
  },
  fi: {
    eyebrow: "Kaksi tapaa aloittaa",
    title: "Muuta idea tai valmis kaava luonnokseksi, jonka voit tarkistaa.",
    intro: "Valitse lähtökohta sen mukaan, mitä sinulla on nyt. Molemmat tilat ohjaavat vaiheittain ja pitävät tiedostot selaimessasi.",
    choose: "Valitse lähtökohta",
    chooseDesc: "Voit palata tälle sivulle milloin tahansa.",
    resizeBadge: "Käytettävissä nyt",
    resizeTitle: "Muuta valmiin kaavan kokoa",
    resizeDesc: "Aloita PDF-, SVG- tai selkeästä kaavakuvasta. Määritä vaate, vartaloprofiili, istuvuus ja kangas, vertaa ääriviivoja ja vie A4-sivuiksi.",
    resizeAction: "Muuta kaavan kokoa",
    resizeFeatures: ["Ohjattu PDF-sivujen kokoaminen", "EU-, kansainväliset, US- ja UK-koot", "Päällekkäisvertailu ja A4-PDF-vienti"],
    createBadge: "Uusi ohjattu prototyyppi",
    createTitle: "Luo kaava kuvista",
    createDesc: "Käytä valokuvia, luonnosta tai piirrosta visuaalisina viitteinä. Lisää mitat ja rakenneyksityiskohdat, niin saat tarkistettavan alustavan peruskaavan.",
    createAction: "Luo kuvista",
    createFeatures: ["Etu-, taka- ja sivunäkymät", "Selkeät oletukset ja luottamustarkistus", "Alustava SVG koonmuutosstudioon"],
    warningTitle: "Hyödyllinen luonnos ilman piilotettuja arvauksia",
    warning: "Kuvatila luo mittoihin perustuvan alustavan kaavan. Piilosaumat, muotolaskokset ja rakenneyksityiskohdat on vahvistettava ennen kankaan leikkaamista.",
    privateTitle: "Yksityisyys oletuksena",
    privateDesc: "Ladatut kaavat ja viitekuvat käsitellään paikallisesti selaimessasi.",
    footer: "PatternShift Studio · Selainpohjaiset kaavatyökalut",
  },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const t = copy[language];

  useEffect(() => {
    const stored = window.localStorage.getItem("patternshift-language") as Language | null;
    if (stored && stored in copy) setLanguage(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("patternshift-language", language);
  }, [language]);

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#251f2b]">
      <header className="atelier-header border-b border-[#d9d0c3]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-[#5b3b68] text-white shadow-sm"><Scissors className="size-5" /></div>
            <div><p className="font-serif text-xl font-semibold leading-none tracking-tight">PatternShift</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#786d79]">{translations[language].digitalStudio}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-[#d6cdc1] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#625865] md:flex"><ShieldCheck className="size-3.5 text-[#5b3b68]" />{translations[language].privacy}</div>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger aria-label={translations[language].language} className="h-9 min-w-32 rounded-full border-[#cfc3d2] bg-white/90 font-semibold text-[#563961]"><Languages className="size-4" /><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(languageNames) as Language[]).map((code) => <SelectItem key={code} value={code}>{languageNames[code]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <section className="border-b border-[#d9d0c3]">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-10 sm:px-7 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-16">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#75507e]"><Sparkles className="size-4" />{t.eyebrow}</p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">{t.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#645b66] sm:text-lg">{t.intro}</p>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#cfc4b9] bg-[#fffdf9] p-3 shadow-[0_24px_70px_rgba(47,34,50,.13)]">
            <img src={`${publicBasePath}/atelier-pattern.png`} alt="Sewing pattern paper and tailoring tools" className="aspect-[16/10] w-full rounded-[1.45rem] object-cover" />
            <div className="absolute inset-x-7 bottom-7 rounded-2xl border border-white/50 bg-[#2f2534]/86 p-4 text-white shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3"><Ruler className="size-5 text-[#e2c9e8]" /><p className="font-serif text-lg font-semibold">PDF → measurements → reviewed draft</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-7 sm:py-14" aria-labelledby="mode-title">
        <div className="mb-7">
          <h2 id="mode-title" className="font-serif text-3xl font-semibold sm:text-4xl">{t.choose}</h2>
          <p className="mt-2 text-sm leading-6 text-[#706671]">{t.chooseDesc}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="group flex min-h-[430px] flex-col overflow-hidden rounded-[1.8rem] border border-[#d4c8bc] bg-[#fffdf9] shadow-[0_14px_44px_rgba(47,34,50,.07)] transition hover:-translate-y-1 hover:shadow-[0_20px_56px_rgba(47,34,50,.12)]">
            <div className="flex items-center justify-between border-b border-[#e1d8cf] bg-[#f8f2e9] px-6 py-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e5efe8] px-3 py-1 text-xs font-bold text-[#356249]"><Check className="size-3.5" />{t.resizeBadge}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#5b3b68] text-white"><FileUp className="size-6" /></span>
            </div>
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <h3 className="font-serif text-3xl font-semibold leading-tight">{t.resizeTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6b626c]">{t.resizeDesc}</p>
              <ul className="mt-6 space-y-3 text-sm text-[#574d59]">{t.resizeFeatures.map((feature) => <li key={feature} className="flex gap-3"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eee6f0] text-[#5b3b68]"><Check className="size-3" /></span>{feature}</li>)}</ul>
              <Button asChild size="lg" className="mt-8 h-12 w-full rounded-xl bg-[#5b3b68] text-base hover:bg-[#493055] sm:w-fit"><Link href="/resize">{t.resizeAction}<ArrowRight /></Link></Button>
            </div>
          </article>

          <article className="group flex min-h-[430px] flex-col overflow-hidden rounded-[1.8rem] border border-[#cbbad1] bg-[#fffdf9] shadow-[0_14px_44px_rgba(47,34,50,.07)] transition hover:-translate-y-1 hover:shadow-[0_20px_56px_rgba(47,34,50,.12)]">
            <div className="flex items-center justify-between border-b border-[#ded1e2] bg-[#f4ebf6] px-6 py-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e9def0] px-3 py-1 text-xs font-bold text-[#62406d]"><Sparkles className="size-3.5" />{t.createBadge}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#8a5b79] text-white"><Camera className="size-6" /></span>
            </div>
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <h3 className="font-serif text-3xl font-semibold leading-tight">{t.createTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6b626c]">{t.createDesc}</p>
              <ul className="mt-6 space-y-3 text-sm text-[#574d59]">{t.createFeatures.map((feature) => <li key={feature} className="flex gap-3"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eee6f0] text-[#5b3b68]"><Check className="size-3" /></span>{feature}</li>)}</ul>
              <Button asChild size="lg" className="mt-8 h-12 w-full rounded-xl bg-[#7b516e] text-base hover:bg-[#68445d] sm:w-fit"><Link href="/create">{t.createAction}<ArrowRight /></Link></Button>
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-[#dbcba9] bg-[#fff8e8] p-5 sm:grid-cols-[1fr_1fr] sm:p-6">
          <div><h3 className="font-serif text-xl font-semibold text-[#594529]">{t.warningTitle}</h3><p className="mt-2 text-sm leading-6 text-[#6b5738]">{t.warning}</p></div>
          <div className="rounded-2xl border border-[#d5c9d8] bg-white/75 p-4"><p className="flex items-center gap-2 font-serif text-lg font-semibold text-[#53385d]"><ShieldCheck className="size-5" />{t.privateTitle}</p><p className="mt-2 text-sm leading-6 text-[#6b626c]">{t.privateDesc}</p></div>
        </div>
      </section>

      <footer className="border-t border-[#d9d0c3] bg-[#eee8df]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 text-xs text-[#776e78] sm:px-7"><span>{t.footer}</span><span>© 2026 Yevhenii Malin</span></div></footer>
    </main>
  );
}
