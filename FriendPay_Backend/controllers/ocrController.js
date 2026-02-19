// controllers/ocrController.js

exports.processReceipt = async (req, res) => {
    // In a real app, req.body.rawText would be sent to DeepSeek/OpenAI/Google for analysis.
    // We are simulating a successful AI response for quick front-end testing.
    
    // Total amount in the receipt (Simulated AI extraction)
    const mockTotalAmount = 1_500_000; 
    
    // Structured data ready for the 'Itemized Split' screen
    const structuredItems = [
        { name: 'Pizza Pepperoni', price: 650_000 },
        { name: 'Soda (x3)', price: 150_000 },
        { name: 'Salad', price: 300_000 },
        { name: 'Tip/Tax', price: 100_000 },
        // Note: Total is 1,200,000. Front-end logic handles the remainder/tax allocation.
    ];

    res.status(200).json({
        totalAmountFound: mockTotalAmount,
        merchantName: "Restaurant Name (AI Mock)",
        structuredItems: structuredItems,
        message: "OCR processing successful. Review and assign items."
    });
};