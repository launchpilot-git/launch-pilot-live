const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Desktop screenshot
  const desktopPage = await context.newPage();
  await desktopPage.setViewportSize({ width: 1200, height: 800 });
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Wait for content to load
  await desktopPage.waitForTimeout(2000);
  
  // Take full page screenshot
  await desktopPage.screenshot({ 
    path: 'homepage-desktop.png', 
    fullPage: true 
  });
  
  // Mobile screenshot
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 375, height: 667 });
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Wait for content to load
  await mobilePage.waitForTimeout(2000);
  
  // Take full page screenshot
  await mobilePage.screenshot({ 
    path: 'homepage-mobile.png', 
    fullPage: true 
  });
  
  await browser.close();
  console.log('Screenshots captured successfully!');
})();