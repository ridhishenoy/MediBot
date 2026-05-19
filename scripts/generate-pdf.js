import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const __dirname = path.resolve();
const pdfPath = path.join(__dirname, 'CARDIO_INDEX_ANALYSIS.pdf');

// Create a simple, clean, bulletproof PDF document
const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 54, bottom: 54, left: 54, right: 54 }
});

const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

// Styles
const colors = {
  primary: '#4f46e5', // Brand Indigo
  textDark: '#1e293b', // Slate Dark
  textMuted: '#64748b', // Slate Muted
  lineColor: '#cbd5e1'
};

// Document Title Header
doc.fillColor(colors.primary)
   .font('Helvetica-Bold')
   .fontSize(24)
   .text('MediBot Cardio Index Analysis Guide', { align: 'center' })
   .moveDown(0.2);

doc.fillColor(colors.textMuted)
   .font('Helvetica')
   .fontSize(10)
   .text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
   .moveDown(1.5);

// Add a divider line
doc.moveTo(54, doc.y)
   .lineTo(558, doc.y)
   .strokeColor(colors.lineColor)
   .lineWidth(1)
   .stroke()
   .moveDown(1.5);

// Introduction
doc.fillColor(colors.textDark)
   .font('Helvetica')
   .fontSize(11)
   .text(
     'Our Cardio Index (along with the stability and stress ratings) is analyzed using a hybrid statistical-AI architecture powered by Gemini 2.5 Flash and secure local calculations. Here is the step-by-step breakdown of how your cardiac fitness is calculated behind the scenes:',
     { lineGap: 4 }
   )
   .moveDown(1.5);

// Helper function to write clean sections
const writeSection = (title, paragraph, bullets) => {
  // Title
  doc.fillColor(colors.primary)
     .font('Helvetica-Bold')
     .fontSize(14)
     .text(title)
     .moveDown(0.4);

  // Main explanation text
  doc.fillColor(colors.textDark)
     .font('Helvetica')
     .fontSize(10.5)
     .text(paragraph, { lineGap: 3.5 })
     .moveDown(0.6);

  // Bullets
  bullets.forEach(bullet => {
    const originalX = doc.x;
    const originalY = doc.y;

    // Bullet point character
    doc.fillColor(colors.primary)
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('•  ', originalX + 10, originalY);

    // Bullet text
    doc.fillColor(colors.textDark)
       .font('Helvetica-Bold')
       .text(bullet.label + ': ', originalX + 22, originalY, { continued: true })
       .font('Helvetica')
       .text(bullet.desc, { lineGap: 3 })
       .moveDown(0.4);
  });

  doc.moveDown(1.2);
};

// Section 1
writeSection(
  '1. Statistical Aggregation',
  'When you select an analysis timeframe (e.g., 7 days, 30 days, or a custom range), the system immediately filters all recordings in that period and extracts the raw heart rate values to compute key clinical indices:',
  [
    { label: 'Average Heart Rate (BPM)', desc: 'Calculates your overall cardiac baseline.' },
    { label: 'Heart Rate Range', desc: 'Captures the minimum and peak (maximum) heart rates recorded during the selected period.' },
    { label: 'Recording Types & Context', desc: 'Tracks whether heart rates are measured during activities, manual logs, or resting states.' }
  ]
);

// Section 2
writeSection(
  '2. Clinical Demographics Correlation',
  'Heart rate variance doesn\'t mean the same thing for everyone. The analysis correlates your heart rate metrics with your specific patient profile:',
  [
    { label: 'Age & Sex', desc: 'Used to calibrate expected heart rate zones and cardiovascular limits.' },
    { label: 'Weight & Vitals Variances', desc: 'Establishes custom baselines for overall physical wellness.' }
  ]
);

// Section 3
writeSection(
  '3. Gemini 2.5 Flash Neural Assessment',
  'The compiled mathematical payload (vitals statistics, demographic profile, and raw historical data points) is securely sent to Gemini 2.5 Flash with low-temperature configuration (0.3) for high reliability. The AI analyzes:',
  [
    { label: 'Cardio Index Score (0-100)', desc: 'Formulated by assessing heart rate variability (HRV), resting heart rate trends, and how frequently your peak heart rates exceed demographic safety thresholds. High stability and an optimal average resting heart rate yield a higher score.' },
    { label: 'Cardio Status (Poor, Fair, Good, or Excellent)', desc: 'Categorized based on clinical guidelines for resting heart rates and baseline cardiovascular efficiency.' }
  ]
);

// Section 4
writeSection(
  '4. Interactive Visualization',
  'Once the analysis completes, the resulting JSON schema is mapped directly to the dashboard:',
  [
    { label: 'Visual Display', desc: 'It drives the SVG radial progress wheel and color-coded status pills in real time.' },
    { label: 'MediCoach Integration', desc: 'It feeds the MediCoach Chat Assistant, allowing you to ask follow-up questions which the coach answers using this exact context.' }
  ]
);

doc.end();

writeStream.on('finish', () => {
  console.log('PDF generated successfully at:', pdfPath);
});
