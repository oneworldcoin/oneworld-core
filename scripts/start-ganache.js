const ganache = require('ganache');

async function start() {
  const server = ganache.server({
    wallet: {mnemonic: 'test test test test test test test test test test test junk'},
    logging: {quiet: true},
    chain: {chainId: 1337}
  });

  const port = 8545;
  server.listen(port, (err) => {
    if (err) {
      console.error('Ganache failed to start:', err);
      process.exit(1);
    }
    console.log('Ganache started on http://127.0.0.1:' + port);
  });

  // keep running
}

start();
