export type PassportStyleTheme =
  | "professional"
  | "corporate"
  | "minimal"
  | "modern"
  | "creative"
  | "premium";

export interface ThemeConfig {
  id: PassportStyleTheme;
  name: string;
  description: string;
  containerClass: string;
  headerClass: string;
  badgeClass: string;
  titleClass: string;
  subtitleClass: string;
  sectionHeaderClass: string;
  accentButtonClass: string;
  secondaryButtonClass: string;
}

export const PASSPORT_THEMES: Record<PassportStyleTheme, ThemeConfig> = {
  professional: {
    id: "professional",
    name: "Professional",
    description: "Slate and clean navy blue styling for established corporate trust.",
    containerClass: "bg-white border-slate-200 text-slate-900 shadow-sm",
    headerClass: "bg-slate-900 text-white p-6 rounded-t-xl",
    badgeClass: "bg-blue-500/20 text-blue-200 border border-blue-400/30",
    titleClass: "text-2xl font-bold text-white",
    subtitleClass: "text-slate-300 text-xs",
    sectionHeaderClass: "text-slate-800 font-semibold border-b border-slate-100 pb-2",
    accentButtonClass: "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs",
    secondaryButtonClass: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300",
  },
  corporate: {
    id: "corporate",
    name: "Corporate Executive",
    description: "Deep navy and gold accents for financial and enterprise clients.",
    containerClass: "bg-slate-50 border-amber-200/80 text-slate-900 shadow-md",
    headerClass: "bg-slate-950 text-amber-400 p-6 border-b-2 border-amber-500/50 rounded-t-xl",
    badgeClass: "bg-amber-400/10 text-amber-400 border border-amber-500/40",
    titleClass: "text-2xl font-bold font-serif text-white",
    subtitleClass: "text-amber-300/80 text-xs tracking-wide",
    sectionHeaderClass: "text-slate-900 font-bold border-b-2 border-amber-200 pb-2",
    accentButtonClass: "bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs",
    secondaryButtonClass: "bg-white hover:bg-slate-100 text-slate-900 border border-slate-300",
  },
  minimal: {
    id: "minimal",
    name: "Minimal Monochrome",
    description: "High-contrast stark typography with zero fluff.",
    containerClass: "bg-white border-zinc-300 text-zinc-900 shadow-none",
    headerClass: "bg-white text-zinc-900 p-6 border-b border-zinc-200 rounded-t-xl",
    badgeClass: "bg-zinc-100 text-zinc-800 border border-zinc-300",
    titleClass: "text-2xl font-black text-zinc-900 tracking-tight",
    subtitleClass: "text-zinc-500 text-xs uppercase tracking-wider",
    sectionHeaderClass: "text-zinc-900 font-bold border-b border-zinc-200 pb-2 uppercase tracking-wide text-xs",
    accentButtonClass: "bg-zinc-900 hover:bg-zinc-800 text-white font-medium",
    secondaryButtonClass: "bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-900",
  },
  modern: {
    id: "modern",
    name: "Modern Emerald",
    description: "Vibrant indigo and emerald styling ideal for modern tech SMEs.",
    containerClass: "bg-white border-indigo-100 text-slate-900 shadow-lg shadow-indigo-100/50",
    headerClass: "bg-gradient-to-r from-indigo-900 via-indigo-800 to-emerald-900 text-white p-6 rounded-t-xl",
    badgeClass: "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40",
    titleClass: "text-2xl font-extrabold text-white",
    subtitleClass: "text-indigo-200 text-xs",
    sectionHeaderClass: "text-indigo-950 font-bold border-b border-indigo-100 pb-2",
    accentButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs",
    secondaryButtonClass: "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200",
  },
  creative: {
    id: "creative",
    name: "Creative Purple Gradient",
    description: "Dynamic purple to amber gradient header for creative agencies.",
    containerClass: "bg-white border-purple-100 text-slate-900 shadow-md",
    headerClass: "bg-gradient-to-r from-purple-700 via-violet-800 to-amber-600 text-white p-6 rounded-t-xl",
    badgeClass: "bg-white/20 text-white border border-white/30 backdrop-blur-xs",
    titleClass: "text-2xl font-black text-white",
    subtitleClass: "text-purple-100 text-xs",
    sectionHeaderClass: "text-purple-950 font-bold border-b border-purple-100 pb-2",
    accentButtonClass: "bg-purple-700 hover:bg-purple-800 text-white font-medium shadow-xs",
    secondaryButtonClass: "bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200",
  },
  premium: {
    id: "premium",
    name: "Obsidian Gold Premium",
    description: "Dark luxury obsidian aesthetic with metallic gold highlights.",
    containerClass: "bg-zinc-950 border-amber-500/30 text-zinc-100 shadow-2xl",
    headerClass: "bg-zinc-900 text-amber-300 p-6 border-b border-amber-500/30 rounded-t-xl",
    badgeClass: "bg-amber-400/10 text-amber-300 border border-amber-400/50",
    titleClass: "text-2xl font-bold text-amber-200 font-serif",
    subtitleClass: "text-zinc-400 text-xs tracking-wider",
    sectionHeaderClass: "text-amber-400 font-semibold border-b border-amber-500/20 pb-2",
    accentButtonClass: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold shadow-xs",
    secondaryButtonClass: "bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/40",
  },
};
