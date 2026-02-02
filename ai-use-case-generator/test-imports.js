
try {
    console.log('Testing cheerio...');
    const cheerio = require('cheerio');
    console.log('Cheerio loaded:', !!cheerio);
} catch (e) {
    console.error('Cheerio failed:', e.message);
}

try {
    console.log('Testing OpenAI...');
    const OpenAI = require('openai');
    console.log('OpenAI loaded:', !!OpenAI);
} catch (e) {
    console.error('OpenAI failed:', e.message);
}

try {
    console.log('Testing Google Generative AI...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    console.log('Google Generative AI loaded:', !!GoogleGenerativeAI);
} catch (e) {
    console.error('Google Generative AI failed:', e.message);
}
