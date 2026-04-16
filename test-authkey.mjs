import https from 'https';

const authkey = '44028bbda76f9989';
const mobile = process.argv[2]; // get from CLI args
const country_code = '91';
const sender = 'AUTHKY'; 
const otp = Math.floor(100000 + Math.random() * 900000);
const msg = encodeURIComponent(`Hello, your OTP is ${otp}`);

const url = `https://api.authkey.io/request?authkey=${authkey}&mobile=${mobile}&country_code=${country_code}&sms=${msg}&sender=${sender}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('Response:', data); });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
