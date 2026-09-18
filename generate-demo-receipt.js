// One-off script to generate a sample donation receipt PDF, mirroring the
// generateReceiptPdf() logic in donate.html, using sample donor data.
// Run with: node generate-demo-receipt.js
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateReceiptPdf(donor, meta) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.04, 0.15, 0.45);
  const black = rgb(0.1, 0.1, 0.1);
  let y = 740;

  try {
    const logoBytes = fs.readFileSync(path.join(__dirname, 'images', 'pur-for-cure-logo-clean.jpg'));
    const logoImg = await pdfDoc.embedJpg(logoBytes);
    const dims = logoImg.scaleToFit(110, 44);
    page.drawImage(logoImg, { x: 50, y: y - 30, width: dims.width, height: dims.height });
  } catch (e) {}

  page.drawText('PURE FOR CURE', { x: 350, y: y + 10, size: 18, font: bold, color: navy });
  page.drawText('(Serving the mission of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada)', { x: 200, y: y - 6, size: 7, font, color: black });
  y -= 55;
  page.drawText('Ref. No.: ' + meta.refNo, { x: 50, y, size: 10, font: bold, color: black });
  page.drawText('Date: ' + meta.dateStr, { x: 420, y, size: 10, font: bold, color: black });
  y -= 45;
  page.drawText('DONATION RECEIPT', { x: 170, y, size: 26, font: bold, color: navy });
  y -= 35;
  page.drawText('This is to acknowledge that PURE FOR CURE, GUWAHATI has received a contribution of', { x: 50, y, size: 10, font, color: black });
  y -= 55;
  page.drawRectangle({ x: 180, y: y - 10, width: 250, height: 45, borderColor: navy, borderWidth: 1.5 });
  page.drawText('Rs. ' + Number(donor.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), { x: 220, y: y + 5, size: 22, font: bold, color: navy });
  y -= 60;

  const col = (label, value, x) => {
    page.drawText(label, { x, y, size: 9, font: bold, color: black });
    page.drawText(String(value || ''), { x, y: y - 13, size: 9, font, color: black });
  };
  const wrapText = (text, f, size, maxWidth) => {
    const words = String(text || '').split(' ');
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  };

  col('Donor Name', donor.name, 50);
  col('WhatsApp No.', donor.phone, 230);
  col('Towards', 'Pure for Cure-Satvik Food Distribution', 380);
  y -= 35;
  page.drawText('Address', { x: 50, y, size: 9, font: bold, color: black });
  const addressLines = wrapText(donor.address, font, 9, 290).slice(0, 2);
  addressLines.forEach((line, i) => {
    page.drawText(line, { x: 50, y: y - 13 - i * 12, size: 9, font, color: black });
  });
  y -= 13 + (addressLines.length - 1) * 12 + 22;
  col('Email ID', donor.email, 50);
  col('PAN', donor.pan, 230);
  y -= 45;
  page.drawText('Payment Mode', { x: 380, y, size: 9, font: bold, color: black });
  page.drawText('Razorpay (Card/UPI/NetBanking)', { x: 380, y: y - 13, size: 9, font, color: black });
  page.drawText('Txn ID: ' + meta.txnId, { x: 380, y: y - 26, size: 8, font, color: black });
  y -= 60;
  page.drawText('Thank you for your generous support', { x: 190, y, size: 11, font, color: black });
  y -= 45;
  page.drawText('Donations to this institution are exempted u/s 80G Vide', { x: 50, y, size: 8, font, color: black });
  page.drawText('14/80G/CIT/GHY-II/2011-12/4701-05 DTD:29/02/2012', { x: 50, y: y - 11, size: 8, font, color: black });
  page.drawText('PAN: AAATH8807J', { x: 50, y: y - 22, size: 8, font, color: black });
  try {
    const sigBytes = fs.readFileSync(path.join(__dirname, 'images', 'signature-janardan-dasa.png'));
    const sigImg = await pdfDoc.embedPng(sigBytes);
    const sigDims = sigImg.scaleToFit(80, 35);
    page.drawImage(sigImg, { x: 440, y: y + 2, width: sigDims.width, height: sigDims.height });
  } catch (e) {}
  page.drawText('Janardan Dasa', { x: 440, y: y - 22, size: 10, font: bold, color: black });
  page.drawText('President', { x: 440, y: y - 34, size: 9, font, color: black });

  y = 90;
  page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 562, y: y + 10 }, thickness: 0.5, color: black });
  col('Contact', '+917099039770', 50);
  col('Email', 'info@hkmguwahati.org', 220);
  col('Address', 'Hare Krishna Mandir Road, Ghorajan, Guwahati 781031, Assam', 380);

  return pdfDoc.save();
}

(async () => {
  const sampleDonor = {
    name: 'RAMESH KUMAR SHARMA',
    phone: '+919876543210',
    address: '12, MG Road, Near City Mall, Guwahati 781001, Assam, India',
    email: 'ramesh.sharma@example.com',
    pan: 'ABCDE1234F',
    amount: 2000
  };
  const sampleMeta = {
    refNo: 'PFC-DR-202606-SAMPLE',
    dateStr: '21 June 2026',
    txnId: 'pay_SampleDemo12345'
  };

  const bytes = await generateReceiptPdf(sampleDonor, sampleMeta);
  const outDir = path.join(__dirname, 'demo PDF');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'Sample-Donation-Receipt.pdf');
  fs.writeFileSync(outPath, bytes);
  console.log('Saved to', outPath);
})();
