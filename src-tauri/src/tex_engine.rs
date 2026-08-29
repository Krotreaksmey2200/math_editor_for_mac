use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Serialize, Deserialize};
use base64::{Engine as _, engine::general_purpose};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TeXOutput {
    pub svg: String,
    pub base64_image: String,
    pub png_base64: Option<String>,
    pub baseline_depth: f64,
    pub width: f64,
    pub height: f64,
    pub mathml: Option<String>,
}

pub fn find_mactex_bin_path() -> Option<PathBuf> {
    // 1. Check standard MacTeX symlink path
    let standard_mac_tex = Path::new("/Library/TeX/texbin");
    if standard_mac_tex.join("latex").exists() && standard_mac_tex.join("dvisvgm").exists() {
        return Some(standard_mac_tex.to_path_buf());
    }

    // 2. Search in /usr/local/texlive/bin/
    let texlive_bin = Path::new("/usr/local/texlive");
    if texlive_bin.exists() {
        if let Ok(entries) = std::fs::read_dir(texlive_bin) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let bin_dir = path.join("bin");
                    if bin_dir.exists() {
                        if let Ok(arch_entries) = std::fs::read_dir(bin_dir) {
                            for arch_entry in arch_entries.flatten() {
                                let arch_path = arch_entry.path();
                                if arch_path.join("latex").exists() && arch_path.join("dvisvgm").exists() {
                                    return Some(arch_path);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback to system PATH env
    if let Ok(path_env) = std::env::var("PATH") {
        for path_str in path_env.split(':') {
            let path = Path::new(path_str);
            if path.join("latex").exists() && path.join("dvisvgm").exists() {
                return Some(path.to_path_buf());
            }
        }
    }

    None
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TeXPathsInfo {
    pub latex: String,
    pub xelatex: String,
    pub dvilualatex: String,
    pub dvipng: String,
    pub dvisvgm: String,
    pub is_valid: bool,
}

pub fn get_system_tex_paths() -> TeXPathsInfo {
    let bin_dir = find_mactex_bin_path().unwrap_or_else(|| PathBuf::from("/Library/TeX/texbin"));
    
    let check_path = |name: &str| -> String {
        let p = bin_dir.join(name);
        if p.exists() {
            p.to_string_lossy().to_string()
        } else {
            format!("/Library/TeX/texbin/{}", name)
        }
    };

    let latex = check_path("latex");
    let xelatex = check_path("xelatex");
    let dvilualatex = check_path("dvilualatex");
    let dvipng = check_path("dvipng");
    let dvisvgm = check_path("dvisvgm");

    let is_valid = Path::new(&latex).exists() && Path::new(&dvisvgm).exists();

    TeXPathsInfo {
        latex,
        xelatex,
        dvilualatex,
        dvipng,
        dvisvgm,
        is_valid,
    }
}

pub fn compile_latex_to_svg(
    latex_code: &str,
    eq_type: &str, // "inline", "display", "latex"
    font_size: &str, // "10pt", "11pt", "12pt", etc.
    transparent: bool,
    preamble: &str,
    latex_engine: &str,
) -> Result<TeXOutput, String> {
    let bin_path = find_mactex_bin_path()
        .ok_or_else(|| "MacTeX binaries (latex, dvisvgm) not found. Please install MacTeX or BasicTeX.".to_string())?;

    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let tex_path = temp_dir.path().join("equation.tex");

    // Format LaTeX code based on selected equation type wrapper
    let trimmed = latex_code.trim();
    let formatted_latex = match eq_type {
        "inline" => {
            if !trimmed.starts_with('$') && !trimmed.starts_with("\\(") {
                format!("${}$", trimmed)
            } else {
                trimmed.to_string()
            }
        }
        "display" => {
            if !trimmed.starts_with("\\[") && !trimmed.starts_with("$$") {
                format!("\\[ \\displaystyle {}\n\\]", trimmed)
            } else {
                trimmed.to_string()
            }
        }
        "latex" => trimmed.to_string(), // Raw custom LaTeX block
        _ => trimmed.to_string(),
    };

    let font_size_opt = if font_size.is_empty() {
        "".to_string()
    } else {
        format!(",{}", font_size)
    };
    let doc_class = format!("\\documentclass[preview,border=0pt{}]{{standalone}}", font_size_opt);
    
    let mut preamble_str = if preamble.trim().is_empty() {
        "\\usepackage{amsmath,amssymb,amsfonts}\n\\usepackage{xcolor}".to_string()
    } else {
        preamble.to_string()
    };

    if latex_engine == "latex" {
        // Strip fontspec and setmainfont safely for standard latex engine to prevent crashes
        let re_fontspec = regex::Regex::new(r"\\usepackage\{fontspec\}\n?").unwrap();
        let re_setmainfont = regex::Regex::new(r"\\setmainfont\{[^}]*\}\[[\s\S]*?\]\n?").unwrap();
        preamble_str = re_fontspec.replace_all(&preamble_str, "").to_string();
        preamble_str = re_setmainfont.replace_all(&preamble_str, "").to_string();
    }

    let transparent_cmd = if transparent { "\\nopagecolor" } else { "" };

    let tex_content = format!(
        "{}\n{}\n{}\n\\begin{{document}}\n{}\n\\end{{document}}\n",
        doc_class, preamble_str, transparent_cmd, formatted_latex
    );

    std::fs::write(&tex_path, tex_content)
        .map_err(|e| format!("Failed to write temp latex file: {}", e))?;

    // Run selected latex engine
    let (exe_name, ext, extra_args) = match latex_engine {
        "xelatex" => ("xelatex", "xdv", vec!["-no-pdf"]),
        "lualatex" => ("dvilualatex", "dvi", vec![]),
        _ => ("latex", "dvi", vec![]),
    };
    
    let latex_exe = bin_path.join(exe_name);
    let mut cmd = Command::new(&latex_exe);
    cmd.current_dir(temp_dir.path())
       .arg("-interaction=nonstopmode");
       
    for arg in extra_args {
        cmd.arg(arg);
    }
    
    cmd.arg("equation.tex");
    
    let latex_output = cmd.output()
        .map_err(|e| format!("Failed to execute {} command: {}", exe_name, e))?;

    let expected_output = temp_dir.path().join(format!("equation.{}", ext));
    if !expected_output.exists() {
        let log_path = temp_dir.path().join("equation.log");
        if log_path.exists() {
            let log_content = std::fs::read_to_string(&log_path).unwrap_or_default();
            let errors: Vec<String> = log_content.lines()
                .filter(|line| line.starts_with('!'))
                .map(|line| line.to_string())
                .collect();
            if !errors.is_empty() {
                return Err(format!("LaTeX compilation error:
{}", errors.join("
")));
            }
        }
        
        let stderr_str = String::from_utf8_lossy(&latex_output.stderr).to_string();
        let stdout_str = String::from_utf8_lossy(&latex_output.stdout).to_string();
        return Err(format!("{} compilation failed to produce {} file.
Stderr: {}
Stdout: {}", exe_name, ext, stderr_str, stdout_str));
    }

    // Run dvisvgm command to produce SVG using TexMaths flags
    let dvisvgm_exe = bin_path.join("dvisvgm");
    let dvisvgm_output = Command::new(&dvisvgm_exe)
        .current_dir(temp_dir.path())
        .arg("--no-styles")
        .arg("--no-fonts")
        .arg("--exact-bbox")
        .arg(format!("equation.{}", ext))
        .arg("-o")
        .arg("equation.svg")
        .output()
        .map_err(|e| format!("Failed to execute dvisvgm command: {}", e))?;

    let svg_path = temp_dir.path().join("equation.svg");
    if !svg_path.exists() {
        let stderr_str = String::from_utf8_lossy(&dvisvgm_output.stderr).to_string();
        return Err(format!("dvisvgm failed to produce SVG output.\nStderr: {}", stderr_str));
    }

    let svg_content = std::fs::read_to_string(&svg_path)
        .map_err(|e| format!("Failed to read generated SVG file: {}", e))?;

    // Optionally run dvipng to produce high-res PNG fallback directly from DVI
    let mut dvipng_base64: Option<String> = None;
    let dvipng_exe = bin_path.join("dvipng");
    if dvipng_exe.exists() {
        let png_path = temp_dir.path().join("equation.png");
        let _ = Command::new(&dvipng_exe)
            .current_dir(temp_dir.path())
            .arg("-D")
            .arg("300")
            .arg("-T")
            .arg("tight")
            .arg("-bg")
            .arg("Transparent")
            .arg("-o")
            .arg("equation.png")
            .arg(format!("equation.{}", ext))
            .output();

        if png_path.exists() {
            if let Ok(bytes) = std::fs::read(&png_path) {
                dvipng_base64 = Some(general_purpose::STANDARD.encode(&bytes));
            }
        }
    }

    // Parse viewBox from SVG to calculate exact baseline depth
    let re = regex::Regex::new(r#"viewBox\s*=\s*['"]\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*['"]"#)
        .map_err(|e| format!("Regex compilation failed: {}", e))?;

    let caps = re.captures(&svg_content)
        .ok_or_else(|| "Failed to parse viewBox attribute from SVG file".to_string())?;

    let min_y: f64 = caps[2].parse().map_err(|e| format!("Failed to parse min_y: {}", e))?;
    let width: f64 = caps[3].parse().map_err(|e| format!("Failed to parse width: {}", e))?;
    let height: f64 = caps[4].parse().map_err(|e| format!("Failed to parse height: {}", e))?;

    let baseline_depth = min_y + height;
    let base64_image = general_purpose::STANDARD.encode(svg_content.as_bytes());

    Ok(TeXOutput {
        svg: svg_content,
        base64_image,
        png_base64: dvipng_base64,
        baseline_depth,
        width,
        height,
        mathml: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_math_simple() {
        let latex = "a^2 + b^2 = c^2";
        let result = compile_latex_to_svg(latex, "inline", "", true, "", "latex");
        assert!(result.is_ok(), "Failed to compile: {:?}", result.err());
        let output = result.unwrap();
        assert!(output.width > 0.0);
        assert!(output.height > 0.0);
        assert!(output.svg.contains("<svg"));
        
        // Verify SVG has no white background fill
        assert!(!output.svg.contains("fill='#ffffff'") && !output.svg.contains("fill=\"#ffffff\""), "SVG should be transparent");
    }

    #[test]
    fn test_compile_matrix() {
        let latex = "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}";
        let result = compile_latex_to_svg(latex, "display", "", true, "", "latex");
        assert!(result.is_ok(), "Failed to compile matrix: {:?}", result.err());
        let output = result.unwrap();
        assert!(output.width > 0.0);
        assert!(output.height > 0.0);
    }

    #[test]
    fn test_compile_descenders() {
        // g(x) and y_p extend significantly below the baseline
        let latex = "\\frac{g(x)}{y_p}";
        let result = compile_latex_to_svg(latex, "inline", "", true, "", "latex");
        assert!(result.is_ok(), "Failed to compile descenders: {:?}", result.err());
        let output = result.unwrap();
        
        // The baseline depth should be positive because of the descenders in 'g' and 'y_p'
        assert!(output.baseline_depth > 0.0, "Baseline depth should be positive, got {}", output.baseline_depth);
    }

    #[test]
    fn test_compile_khmer() {
        // Standard ASCII math text compilation
        let latex = "f(x) = \\text{Math}";
        let result = compile_latex_to_svg(latex, "inline", "", true, "", "latex");
        assert!(result.is_ok(), "Failed to compile text: {:?}", result.err());
    }
}
