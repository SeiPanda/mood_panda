const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  await page.goto('http://localhost:4300/diary');
  await page.waitForSelector('text=Tagebuch');

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  const texts = {
    oneWord: 'Kurz.',
    oneLine: 'Das ist eine einzeilige Notiz von heute.',
    twoLinesExact: 'Heute war ein ganz normaler Tag, nichts Besonderes ist passiert, alles war ruhig.',
    threeWords: 'Guter Tag heute',
  };

  await page.evaluate(
    ({ y, m, texts }) => {
      const entries = {};
      let day = 1;
      for (const [key, text] of Object.entries(texts)) {
        const d = `${y}-${m}-${String(day).padStart(2, '0')}`;
        entries[d] = { date: d, title: key, text, updatedAt: Date.now() };
        day++;
      }
      localStorage.setItem('diary-entries', JSON.stringify(entries));
    },
    { y, m, texts },
  );

  await page.reload();
  await page.waitForSelector('.entry-card');
  await page.waitForTimeout(300);

  const results = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.entry-card'));
    return cards.map((card) => {
      const title = card.querySelector('.entry-title')?.textContent?.trim();
      const preview = card.querySelector('.entry-preview');
      const hasBtn = !!card.querySelector('.expand-btn');
      return {
        title,
        scrollHeight: preview?.scrollHeight,
        clientHeight: preview?.clientHeight,
        hasExpandButton: hasBtn,
      };
    });
  });

  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
