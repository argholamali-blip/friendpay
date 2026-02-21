// controllers/ocrController.js — Gemini 2.0 Flash receipt extraction

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `You are a financial extraction engine specialising in Persian (Farsi) receipts and invoices.
Analyse the provided image. Extract the merchant name, date, all individual line items with exact quantities and base prices.
Identify the subtotal, VAT, service charges, and the grand total.

CRITICAL RULES:
1. Verify your own math: sum of all item total_prices must equal subtotal.
   subtotal + taxes + service = grand_total.
   If a blurred number breaks the math, correct it using the printed total.
2. All currency values must be plain integers representing Tomans (NOT Rials).
   If the receipt shows Rials, divide by 10.
3. fee_multiplier = (grand_total - subtotal) / subtotal  (round to 4 decimal places).
4. Return ONLY a valid JSON object — no markdown fences, no explanation.
5. If the image is illegible, return: {"status":"error","error":"illegible"}

Return this exact structure:
{
  "status": "success",
  "receipt_details": {
    "merchant_name": "string",
    "date": "string (YYYY/MM/DD if readable, else '')",
    "grand_total": number,
    "subtotal": number,
    "total_fees": number,
    "fee_multiplier": number,
    "currency": "Toman"
  },
  "items": [
    {
      "id": "item_001",
      "name": "string",
      "quantity": number,
      "unit_price": number,
      "total_price": number
    }
  ]
}`;

exports.processReceipt = async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // ── FALLBACK: return rich mock data when no API key is set ──
        return res.status(200).json({
            status: 'success',
            receipt_details: {
                merchant_name: 'رستوران شاندیز (نمونه)',
                date: '1404/12/03',
                grand_total: 4500000,
                subtotal: 4054054,
                total_fees: 445946,
                fee_multiplier: 0.11,
                currency: 'Toman'
            },
            items: [
                { id: 'item_001', name: 'شیشلیک با استخوان', quantity: 2, unit_price: 1200000, total_price: 2400000 },
                { id: 'item_002', name: 'جوجه کباب بی‌استخوان', quantity: 1, unit_price: 850000, total_price: 850000 },
                { id: 'item_003', name: 'سالاد فصل', quantity: 2, unit_price: 250000, total_price: 500000 },
                { id: 'item_004', name: 'نوشابه قوطی', quantity: 3, unit_price: 101351, total_price: 304054 }
            ]
        });
    }

    // ── Validate incoming payload ──
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ message: 'imageBase64 is required' });
    }
    const safeMime = (mimeType || 'image/jpeg').replace(/[^a-z/]/g, '');

    try {
        const payload = {
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    {
                        inline_data: {
                            mime_type: safeMime,
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048
            }
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API error:', response.status, errText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const geminiRes = await response.json();

        // Extract raw text from Gemini response
        const rawText = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Strip any accidental markdown fences
        const cleaned = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse Gemini output:', cleaned);
            throw new Error('پاسخ هوش مصنوعی قابل تجزیه نیست. لطفاً دوباره تلاش کنید.');
        }

        if (parsed.status === 'error') {
            return res.status(422).json({ message: 'تصویر رسید خوانده نشد. لطفاً عکس واضح‌تری بگیرید.' });
        }

        return res.status(200).json(parsed);

    } catch (err) {
        console.error('OCR Controller Error:', err);
        return res.status(500).json({ message: err.message || 'خطا در پردازش رسید.' });
    }
};
