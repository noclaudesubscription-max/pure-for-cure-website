const lt = require('localtunnel');
(async () => {
  const tunnel = await lt({ port: 3000, subdomain: 'pureforcure' });
  console.log('URL: ' + tunnel.url);
  tunnel.on('error', err => { console.error(err); });
})();
