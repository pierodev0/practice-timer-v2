/**
 * devInit — dev-only initialization: state dump + optional data seed.
 * Controlled by VITE_DEBUG env var.
 * Tree-shaken in production builds.
 */
if (import.meta.env.VITE_DEBUG === 'true') {
  (async () => {
    const [{ devDump }, { seedTestData }] = await Promise.all([
      import('./devDump.js'),
      import('./seedData.js'),
    ]);

    window.__devDump = devDump;
    window.__seedTestData = seedTestData;

    await seedTestData();
    const dump = await devDump();
    window.__appState = dump;
    console.log('📦 App state → window.__appState');
  })();
}
