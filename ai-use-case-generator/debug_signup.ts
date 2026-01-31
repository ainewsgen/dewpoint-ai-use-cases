import fetch from 'node-fetch';

async function registerAdmin() {
    const url = 'https://dewpoint-ai-use-cases.onrender.com/api/auth/signup';
    const body = {
        email: 'admin@dewpoint.ai',
        password: 'admin123',
        name: 'Admin User'
    };

    console.log(`Attempting to register ${body.email}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('SUCCESS: Admin account created.');
        } else {
            console.log('FAILED: Registration error.');
        }

    } catch (error) {
        console.error('Network Error:', error);
    }
}

registerAdmin();
