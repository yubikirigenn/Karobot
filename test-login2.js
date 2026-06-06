fetch('https://api.karotter.com/api/auth/login', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  body: JSON.stringify({ identifier: 'test', password: 'test', gender: 'other' })
}).then(res => res.text()).then(console.log).catch(console.error);
