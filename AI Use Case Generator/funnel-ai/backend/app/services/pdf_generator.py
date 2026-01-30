from fpdf import FPDF
import os

class PDFGenerator(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 20)
        self.cell(0, 10, '$Funnel.ai - Proposal', border=False, align='C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def generate_proposal_pdf(proposal_id: int, title: str, content: str, amount: float):
    pdf = PDFGenerator()
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, title, ln=True)
    pdf.ln(10)
    
    # Content (Basic text handling)
    pdf.set_font("helvetica", size=12)
    # FPDF multi_cell handles line breaks
    pdf.multi_cell(0, 10, content)
    pdf.ln(10)
    
    # Pricing
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, f"Total Investment: ${amount:,.2f}", ln=True)
    
    # Ensure directory exists
    os.makedirs("generated_proposals", exist_ok=True)
    filename = f"generated_proposals/proposal_{proposal_id}.pdf"
    
    pdf.output(filename)
    return filename
