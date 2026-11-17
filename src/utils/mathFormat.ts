// Converts LaTeX fragments into clean Unicode math while preserving uppercase snake_case course codes
export function cleanMathFormula(text: string): string {
  if (!text) return "";
  let cleaned = text;

  cleaned = cleaned.replace(/\\text\s*\{(.*?)\}/g, "$1");
  cleaned = cleaned.replace(/\\mathrm\s*\{(.*?)\}/g, "$1");

  for (let i = 0; i < 4; i++) {
    cleaned = cleaned.replace(/\\frac\s*\{(.*?)\}\s*\{(.*?)\}/g, "($1) / ($2)");
  }

  for (let i = 0; i < 4; i++) {
    cleaned = cleaned.replace(/\\sqrt\s*\{(.*?)\}/g, "√($1)");
  }
  cleaned = cleaned.replace(/\\sqrt\s*([0-9a-zA-Z]+)/g, "√($1)");
  cleaned = cleaned.replace(/\\frac\s*([0-9a-zA-Z]+)\s*([0-9a-zA-Z]+)/g, "($1) / ($2)");

  cleaned = cleaned.replace(/\\bar\s*\{x\}/gi, "x̅");
  cleaned = cleaned.replace(/\\bar\s*x/gi, "x̅");
  cleaned = cleaned.replace(/\\bar\s*\{(.*?)\}/gi, "$1̅");

  cleaned = cleaned.replace(/\\hat\s*\{p\}/gi, "p̂");
  cleaned = cleaned.replace(/\\hat\s*p/gi, "p̂");
  cleaned = cleaned.replace(/\\hat\s*\{(.*?)\}/gi, "$1̂");

  const supers: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    n: "ⁿ", x: "ˣ", y: "ʸ", i: "ⁱ", "+": "⁺", "-": "⁻",
  };

  cleaned = cleaned.replace(/\^\{([0-9nxy+\-i\s]+)\}/g, (_, p1: string) =>
    p1.split("").map((ch) => supers[ch] || ch).join("")
  );
  cleaned = cleaned.replace(/\^([0-9nxy+\-i])/g, (_, p1: string) => supers[p1] || `^${p1}`);

  const subs: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    a: "ₐ", e: "ₑ", o: "ₒ", x: "ₓ", y: "ᵧ",
    p: "ₚ", i: "ᵢ", "+": "₊", "-": "₋",
  };

  cleaned = cleaned.replace(/_\{([0-9a-zA-Z+\-\s]+)\}/g, (_, p1: string) =>
    p1.split("").map((ch) => subs[ch.toLowerCase()] || ch).join("")
  );

  // Protect uppercase snake_case course codes and identifiers (e.g. MATH_PRECALC, SCI_CHEM_H)
  const protectedTokens: string[] = [];
  cleaned = cleaned.replace(/\b[A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (match) => {
    const idx = protectedTokens.push(match) - 1;
    return `@@CODE${idx}@@`;
  });

  cleaned = cleaned.replace(/_([0-9+\-])(?![A-Z])/g, (_, p1: string) => subs[p1] || `_${p1}`);
  cleaned = cleaned.replace(/(?<![A-Z]{2})_([oaxypi])(?![A-Za-z])/g, (_, p1: string) => subs[p1] || `_${p1}`);

  cleaned = cleaned.replace(/_\{?\\bar\{x\}\}?/gi, "₍x̅₎");
  cleaned = cleaned.replace(/_\{?\\hat\{p\}\}?/gi, "₍p̂₎");

  cleaned = cleaned.replace(/@@CODE(\d+)@@/g, (_, idx) => protectedTokens[Number(idx)] ?? "");

  cleaned = cleaned.replace(/\\pm/gi, "±");
  cleaned = cleaned.replace(/\\times/gi, "×");
  cleaned = cleaned.replace(/\\cdot/gi, "·");
  cleaned = cleaned.replace(/\\mu_0/gi, "μ0");
  cleaned = cleaned.replace(/\\mu/gi, "μ");
  cleaned = cleaned.replace(/\\sigma/gi, "σ");
  cleaned = cleaned.replace(/\\alpha/gi, "α");
  cleaned = cleaned.replace(/\\beta/gi, "β");
  cleaned = cleaned.replace(/\\theta/gi, "θ");
  cleaned = cleaned.replace(/\\Delta/gi, "Δ");
  cleaned = cleaned.replace(/\\lambda/gi, "λ");
  cleaned = cleaned.replace(/\\pi/gi, "π");
  cleaned = cleaned.replace(/\\le\s+/gi, "≤ ");
  cleaned = cleaned.replace(/\\ge\s+/gi, "≥ ");
  cleaned = cleaned.replace(/\\le/gi, "≤");
  cleaned = cleaned.replace(/\\ge/gi, "≥");
  cleaned = cleaned.replace(/\\approx/gi, "≈");
  cleaned = cleaned.replace(/\\neq/gi, "≠");

  cleaned = cleaned.replace(/\\/g, "");
  cleaned = cleaned.replace(/\$\$/g, "");
  cleaned = cleaned.replace(/\$/g, "");

  return cleaned;
}
