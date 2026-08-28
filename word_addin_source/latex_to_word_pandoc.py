import os
import pypandoc

# =============================================================================
# Dependencies Setup:
# pip install pypandoc
# Note: Pandoc must be installed on your system (e.g., `brew install pandoc` on Mac)
# =============================================================================

def convert_latex_to_word(input_text, output_docx_path):
    """
    Converts Markdown/Text with LaTeX equations directly to a Word .docx
    using Pandoc, which natively converts LaTeX to Word OMML equations.
    """
    # Write input text to a temporary markdown file
    temp_md = "temp_input.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(input_text)
    
    try:
        # Convert using pypandoc
        # Pandoc automatically handles $...$ and $$...$$ conversion to OMML
        pypandoc.convert_file(
            temp_md, 
            'docx', 
            outputfile=output_docx_path,
            extra_args=['--mathml'] # Ensures math is processed correctly
        )
        print(f"Successfully saved Word document with native math: {output_docx_path}")
    except Exception as e:
        print(f"Error during conversion: {e}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_md):
            os.remove(temp_md)

if __name__ == "__main__":
    sample_text = """
Here is an example of an inline equation: $E=mc^2$.
    
And here is a display equation (quadratic formula):
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
    
Pandoc will render these perfectly inline with the text!
    """
    
    output_file = "Pandoc_Math_Output.docx"
    convert_latex_to_word(sample_text, output_file)
