export interface MathTypePalette {
  id: string;
  image: string;
  tooltip: string;
  items: { snippet: string; label?: string }[];
}

export const mathTypeRow1: MathTypePalette[] = [
  { id: "129000", image: "129000.png", tooltip: "Relational symbols", items: [
    { snippet: "\\leq", label: "≤" }, { snippet: "\\geq", label: "≥" }, { snippet: "\\neq", label: "≠" }, { snippet: "\\approx", label: "≈" }
  ]},
  { id: "129001", image: "129001.png", tooltip: "Spaces and ellipses", items: [
    { snippet: "\\quad", label: "ab" }, { snippet: "\\dots", label: "..." }, { snippet: "\\cdots", label: "⋯" }
  ]},
  { id: "129002", image: "129002.png", tooltip: "Embellishments", items: [
    { snippet: "\\hat{x}", label: "x̂" }, { snippet: "\\overline{x}", label: "x̄" }, { snippet: "\\vec{x}", label: "x⃗" }
  ]},
  { id: "129003", image: "129003.png", tooltip: "Operator symbols", items: [
    { snippet: "\\pm", label: "±" }, { snippet: "\\times", label: "×" }, { snippet: "\\div", label: "÷" }, { snippet: "\\ast", label: "∗" }
  ]},
  { id: "129004", image: "129004.png", tooltip: "Arrow symbols", items: [
    { snippet: "\\rightarrow", label: "→" }, { snippet: "\\leftarrow", label: "←" }, { snippet: "\\Rightarrow", label: "⇒" }, { snippet: "\\Leftrightarrow", label: "⇔" }
  ]},
  { id: "129005", image: "129005.png", tooltip: "Logical symbols", items: [
    { snippet: "\\therefore", label: "∴" }, { snippet: "\\because", label: "∵" }, { snippet: "\\exists", label: "∃" }, { snippet: "\\forall", label: "∀" }
  ]},
  { id: "129006", image: "129006.png", tooltip: "Set theory symbols", items: [
    { snippet: "\\in", label: "∈" }, { snippet: "\\notin", label: "∉" }, { snippet: "\\subset", label: "⊂" }, { snippet: "\\cup", label: "∪" }, { snippet: "\\cap", label: "∩" }
  ]},
  { id: "129007", image: "129007.png", tooltip: "Miscellaneous symbols", items: [
    { snippet: "\\infty", label: "∞" }, { snippet: "\\nabla", label: "∇" }, { snippet: "\\partial", label: "∂" }, { snippet: "\\circ", label: "°" }
  ]},
  { id: "129008", image: "129008.png", tooltip: "Greek letters (lowercase)", items: [
    { snippet: "\\alpha", label: "α" }, { snippet: "\\beta", label: "β" }, { snippet: "\\gamma", label: "γ" }, { snippet: "\\delta", label: "δ" },
    { snippet: "\\epsilon", label: "ε" }, { snippet: "\\theta", label: "θ" }, { snippet: "\\lambda", label: "λ" }, { snippet: "\\mu", label: "μ" },
    { snippet: "\\pi", label: "π" }, { snippet: "\\rho", label: "ρ" }, { snippet: "\\sigma", label: "σ" }, { snippet: "\\omega", label: "ω" }
  ]},
  { id: "129009", image: "129009.png", tooltip: "Greek letters (uppercase)", items: [
    { snippet: "\\Gamma", label: "Γ" }, { snippet: "\\Delta", label: "Δ" }, { snippet: "\\Theta", label: "Θ" }, { snippet: "\\Lambda", label: "Λ" },
    { snippet: "\\Pi", label: "Π" }, { snippet: "\\Sigma", label: "Σ" }, { snippet: "\\Phi", label: "Φ" }, { snippet: "\\Omega", label: "Ω" }
  ]},
];

export const mathTypeRow2: MathTypePalette[] = [
  { id: "129100", image: "129100.png", tooltip: "Fences", items: [
    { snippet: "\\left( #0 \\right)", label: "( )" }, { snippet: "\\left[ #0 \\right]", label: "[ ]" }, { snippet: "\\left\\{ #0 \\right\\}", label: "{ }" }
  ]},
  { id: "129101", image: "129101.png", tooltip: "Fractions and radicals", items: [
    { snippet: "\\frac{#0}{#0}", label: "a/b" }, { snippet: "\\sqrt{#0}", label: "√x" }, { snippet: "\\sqrt[#0]{#0}", label: "ⁿ√x" }
  ]},
  { id: "129102", image: "129102.png", tooltip: "Subscripts and superscripts", items: [
    { snippet: "^{#0}", label: "x²" }, { snippet: "_{#0}", label: "x₂" }, { snippet: "_{#0}^{#0}", label: "x₂²" }
  ]},
  { id: "129103", image: "129103.png", tooltip: "Summations", items: [
    { snippet: "\\sum", label: "∑" }, { snippet: "\\sum_{#0}^{#0}", label: "∑_" }
  ]},
  { id: "129104", image: "129104.png", tooltip: "Integrals", items: [
    { snippet: "\\int", label: "∫" }, { snippet: "\\int_{#0}^{#0}", label: "∫_" }, { snippet: "\\iint", label: "∬" }, { snippet: "\\oint", label: "∮" }
  ]},
  { id: "129105", image: "129105.png", tooltip: "Underbar and overbar", items: [
    { snippet: "\\overline{#0}", label: "x̄" }, { snippet: "\\underline{#0}", label: "x_" }
  ]},
  { id: "129106", image: "129106.png", tooltip: "Labeled arrows", items: [
    { snippet: "\\xrightarrow{#0}", label: "→" }
  ]},
  { id: "129107", image: "129107.png", tooltip: "Products and set theory", items: [
    { snippet: "\\prod", label: "∏" }, { snippet: "\\prod_{#0}^{#0}", label: "∏_" }
  ]},
  { id: "129108", image: "129108.png", tooltip: "Matrices", items: [
    { snippet: "\\begin{pmatrix} #0 & #0 \\\\ #0 & #0 \\end{pmatrix}", label: "[2x2]" },
    { snippet: "\\begin{pmatrix} #0 & #0 & #0 \\\\ #0 & #0 & #0 \\\\ #0 & #0 & #0 \\end{pmatrix}", label: "[3x3]" }
  ]},
  { id: "129109", image: "129109.png", tooltip: "Boxes", items: [] },
];

export const mathTypeTabs = ["Algebra", "Derivs", "Statistics", "Matrices", "Sets", "Trig", "Geometry"];

export const mathTypeTabItems: Record<string, { image: string, snippet: string }[]> = {
  "Algebra": [
    { image: "129200.png", snippet: "\sqrt{x^2 + y^2}" }, 
    { image: "129201.png", snippet: "\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" }, 
    { image: "129207.png", snippet: "\log_b(x) = \frac{\log_a(x)}{\log_a(b)}" }, 
  ],
  "Derivs": [
    { image: "129202.png", snippet: "\lim_{x \to \infty} f(x)" }, 
    { image: "129204.png", snippet: "\frac{d}{dx} f(x)" },
  ],
  "Statistics": [
    { image: "129205.png", snippet: "\sum_{i=1}^{n} x_i" }, 
    { image: "129206.png", snippet: "\prod_{i=1}^{n} x_i" }, 
  ],
  "Matrices": [
  ],
  "Sets": [
  ],
  "Trig": [
    { image: "129208.png", snippet: "e^{i\pi} + 1 = 0" }, 
    { image: "129209.png", snippet: "\cos^2(x) + \sin^2(x) = 1" },
  ],
  "Geometry": [
    { image: "129203.png", snippet: "\int_{-\infty}^{\infty} e^{-x^2} dx" }, 
  ]
};
