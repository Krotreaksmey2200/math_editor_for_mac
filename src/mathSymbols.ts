export interface MathSymbol {
  label: string;      // The label rendered in KaTeX
  snippet: string;    // TeX code to insert
  tooltip: string;    // Tooltip information
}

export interface SymbolCategory {
  name: string;
  symbols: MathSymbol[];
}

export const mathCategories: SymbolCategory[] = [
  {
    name: "Templates",
    symbols: [
      {
        label: "f(x)=\\frac{ax^3..}{x-2}",
        snippet: "f(x) = \\frac{ax^3 + bx^2 + 4}{x - 2}",
        tooltip: "Rational Function Template"
      },
      {
        label: "\\lim_{x\\to 0}\\frac{\\dots}{x}",
        snippet: "\\lim_{x \\to 0} \\frac{1 + ax - \\sqrt{1+x}}{x} = \\frac{1}{8}",
        tooltip: "Limit Equation Template"
      },
      {
        label: "x=\\frac{-b\\pm..}{2a}",
        snippet: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
        tooltip: "Quadratic Formula"
      },
      {
        label: "f'(x)=\\lim..",
        snippet: "f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}",
        tooltip: "Derivative Definition"
      },
      {
        label: "\\sin^2+\\cos^2=1",
        snippet: "\\sin^2(x) + \\cos^2(x) = 1",
        tooltip: "Pythagorean Identity"
      },
      {
        label: "\\int_a^b f(x)dx",
        snippet: "\\int_{a}^{b} f(x) \\,dx",
        tooltip: "Definite Integral"
      }
    ]
  },
  {
    name: "Structures",
    symbols: [
      { label: "\\frac{a}{b}", snippet: "\\frac{a}{b}", tooltip: "Fraction" },
      { label: "x_i", snippet: "x_{i}", tooltip: "Subscript" },
      { label: "x^2", snippet: "x^{2}", tooltip: "Superscript" },
      { label: "x_i^n", snippet: "x_{i}^{n}", tooltip: "Subscript and Superscript" },
      { label: "\\sqrt{x}", snippet: "\\sqrt{x}", tooltip: "Square Root" },
      { label: "\\sqrt[n]{x}", snippet: "\\sqrt[n]{x}", tooltip: "N-th Root" },
      { label: "\\vec{v}", snippet: "\\vec{v}", tooltip: "Vector Arrow" },
      { label: "\\overline{x}", snippet: "\\overline{x}", tooltip: "Overline" },
      { label: "\\hat{x}", snippet: "\\hat{x}", tooltip: "Hat accent" },
      { label: "\\dot{x}", snippet: "\\dot{x}", tooltip: "Dot accent" },
    ]
  },
  {
    name: "Greek",
    symbols: [
      { label: "\\alpha", snippet: "\\alpha", tooltip: "Alpha" },
      { label: "\\beta", snippet: "\\beta", tooltip: "Beta" },
      { label: "\\gamma", snippet: "\\gamma", tooltip: "Gamma" },
      { label: "\\theta", snippet: "\\theta", tooltip: "Theta" },
      { label: "\\pi", snippet: "\\pi", tooltip: "Pi" },
      { label: "\\sigma", snippet: "\\sigma", tooltip: "Sigma" },
      { label: "\\omega", snippet: "\\omega", tooltip: "Omega" },
      { label: "\\Delta", snippet: "\\Delta", tooltip: "Delta (Capital)" },
      { label: "\\Omega", snippet: "\\Omega", tooltip: "Omega (Capital)" },
      { label: "\\lambda", snippet: "\\lambda", tooltip: "Lambda" },
      { label: "\\phi", snippet: "\\phi", tooltip: "Phi" },
      { label: "\\mu", snippet: "\\mu", tooltip: "Mu" },
      { label: "\\varepsilon", snippet: "\\varepsilon", tooltip: "Epsilon" },
      { label: "\\rho", snippet: "\\rho", tooltip: "Rho" },
    ]
  },
  {
    name: "Operators",
    symbols: [
      { label: "\\pm", snippet: "\\pm", tooltip: "Plus-Minus" },
      { label: "\\times", snippet: "\\times", tooltip: "Multiply" },
      { label: "\\div", snippet: "\\div", tooltip: "Divide" },
      { label: "\\neq", snippet: "\\neq", tooltip: "Not Equal" },
      { label: "\\leq", snippet: "\\leq", tooltip: "Less Than or Equal" },
      { label: "\\geq", snippet: "\\geq", tooltip: "Greater Than or Equal" },
      { label: "\\infty", snippet: "\\infty", tooltip: "Infinity" },
      { label: "\\approx", snippet: "\\approx", tooltip: "Approximately Equal" },
      { label: "\\in", snippet: "\\in", tooltip: "In Set" },
      { label: "\\notin", snippet: "\\notin", tooltip: "Not In Set" },
      { label: "\\subset", snippet: "\\subset", tooltip: "Subset" },
      { label: "\\forall", snippet: "\\forall", tooltip: "For All" },
      { label: "\\exists", snippet: "\\exists", tooltip: "There Exists" },
      { label: "\\Rightarrow", snippet: "\\Rightarrow", tooltip: "Implies" },
      { label: "\\Leftrightarrow", snippet: "\\Leftrightarrow", tooltip: "If and only if" },
    ]
  },
  {
    name: "Calculus",
    symbols: [
      { label: "\\int", snippet: "\\int_{a}^{b} x \\,dx", tooltip: "Definite Integral" },
      { label: "\\int x", snippet: "\\int x \\,dx", tooltip: "Indefinite Integral" },
      { label: "\\sum", snippet: "\\sum_{i=1}^{n}", tooltip: "Summation" },
      { label: "\\prod", snippet: "\\prod_{i=1}^{n}", tooltip: "Product" },
      { label: "\\lim", snippet: "\\lim_{n \\to \\infty}", tooltip: "Limit" },
      { label: "\\partial", snippet: "\\frac{\\partial y}{\\partial x}", tooltip: "Partial Derivative" },
      { label: "\\nabla", snippet: "\\nabla", tooltip: "Gradient (Nabla)" },
      { label: "\\to", snippet: "\\to", tooltip: "Approaches (arrow)" },
    ]
  },
  {
    name: "Brackets",
    symbols: [
      { label: "(x)", snippet: "\\left( x \\right)", tooltip: "Parentheses" },
      { label: "[x]", snippet: "\\left[ x \\right]", tooltip: "Square Brackets" },
      { label: "\\{x\\}", snippet: "\\left\\{ x \\right\\}", tooltip: "Curly Braces" },
      { label: "\\langle x \\rangle", snippet: "\\langle x \\rangle", tooltip: "Angle Brackets" },
      { label: "|x|", snippet: "\\left| x \\right|", tooltip: "Absolute Value" },
      { label: "\\|x\\|", snippet: "\\left\\| x \\right\\|", tooltip: "Norm" },
    ]
  },
  {
    name: "Matrices",
    symbols: [
      { 
        label: "2\\times2", 
        snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", 
        tooltip: "2x2 Matrix" 
      },
      { 
        label: "3\\times3", 
        snippet: "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}", 
        tooltip: "3x3 Matrix" 
      },
      { 
        label: "\\det", 
        snippet: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", 
        tooltip: "Determinant" 
      },
    ]
  }
];
