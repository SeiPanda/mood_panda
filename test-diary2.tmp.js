const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:4300/diary');
  await page.waitForSelector('text=Tagebuch');

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
  const shortText = 'Ein kurzer Eintrag ohne viel Text.';

  await page.evaluate(
    ({ y, m, longText, shortText }) => {
      const entries = {
        [`${y}-${m}-01`]: {
          date: `${y}-${m}-01`,
          title: 'Langer Eintrag',
          text: longText,
          updatedAt: Date.now(),
        },
        [`${y}-${m}-02`]: {
          date: `${y}-${m}-02`,
          title: 'Kurzer Eintrag',
          text: shortText,
          updatedAt: Date.now(),
        },
        [`${y}-${m}-03`]: {
          date: `${y}-${m}-03`,
          title: 'Ohne Text',
          text: '',
          updatedAt: Date.now(),
        },
      };
      localStorage.setItem('diary-entries', JSON.stringify(entries));
    },
    { y, m, longText, shortText },
  );

  await page.reload();
  await page.waitForSelector('text=Tagebuch');
  await page.waitForSelector('.entry-card');
  await page.waitForTimeout(300);

  const outDir = 'C:/Users/SeiPanda/AppData/Local/Temp/claude/c--Users-SeiPanda-Documents-projekte-mood-panda/c257cd73-e43c-4c8b-9d09-fef8352fe11a/scratchpad';
  await page.screenshot({ path: `${outDir}/diary-mixed.png` });

  const cards = page.locator('.entry-card');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const title = await card.locator('.entry-title').innerText();
    const hasExpandBtn = await card.locator('.expand-btn').count();
    console.log(title, '-> expand button present:', hasExpandBtn > 0);
  }

  console.log('Console/page errors:', errors);

  await browser.close();
})();
