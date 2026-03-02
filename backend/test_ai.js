const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function test() {
    try {
        console.log('Listing available NVIDIA models...');
        const list = await openai.models.list();
        const llamaModels = list.data.map(m => m.id).filter(id => id.toLowerCase().includes('llama'));
        llamaModels.forEach(m => console.log('Found:', m));

        if (llamaModels.length === 0) {
            console.log('No Llama models found.');
            return;
        }

        const model = 'abacusai/dracarys-llama-3.1-70b-instruct';
        console.log('\nTesting with model:', model);

        const response = await openai.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: "Say hello" }],
            temperature: 0.2,
            max_tokens: 50,
        });
        console.log('Success:', response.choices[0].message.content);
    } catch (error) {
        console.error('Failure:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

test();
