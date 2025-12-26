// UI module for health bars and win/lose popup

export function createHealthBars(scene) {
  const healthBars = [scene.add.graphics(), scene.add.graphics()];
  const healthTexts = [
    scene.add.text(20, 20, 'HP: 100', { fontSize: '16px', fill: '#fff' }),
    scene.add.text(550, 20, 'HP: 100', { fontSize: '16px', fill: '#fff' })
  ];
  return { healthBars, healthTexts };
}

export function updateHealthBars(healthBars, healthTexts, boxes) {
  for (let i = 0; i < 2; i++) {
    const health = boxes[i]?.health !== undefined ? boxes[i].health : 100;
    healthBars[i].clear();
    healthBars[i].fillStyle(0xff0000, 1);
    healthBars[i].fillRect(i === 0 ? 20 : 550, 20, 200, 20);
    if (health > 0) {
      healthBars[i].fillStyle(0x00aa00, 1);
      const barWidth = Math.max(0, Math.min(200, (health / 500) * 200));
      healthBars[i].fillRect(i === 0 ? 20 : 550, 20, barWidth, 20);
    }
    healthTexts[i].setText('HP: ' + Math.round(health));
  }
}

export function showWinPopup(isYouWinner, onClose) {
  let popup = document.createElement('div');
  popup.style.position = 'absolute';
  popup.style.background = 'rgba(34,34,34,0.6)'; // semi-transparent
  popup.style.color = '#fff';
  popup.style.padding = '40px 60px';
  popup.style.fontSize = '2em';
  popup.style.borderRadius = '20px';
  popup.style.zIndex = '9999';
  popup.style.width = '320px';
  popup.style.textAlign = 'center';
  popup.style.border = 'none';
  popup.innerText = isYouWinner ? 'You win!' : 'You lose!';
  let gameCanvas = document.querySelector('canvas');
  let parent = gameCanvas && gameCanvas.parentElement ? gameCanvas.parentElement : document.body;
  parent.style.position = 'relative';
  let canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { width: 800, height: 600, left: 0, top: 0 };
  let parentRect = parent.getBoundingClientRect();
  let canvasLeftInParent = canvasRect.left - parentRect.left;
  let canvasTopInParent = canvasRect.top - parentRect.top;
  let canvasCenterX = canvasLeftInParent + canvasRect.width / 2;
  let canvasCenterY = canvasTopInParent + canvasRect.height / 2;
  popup.style.left = (canvasCenterX - 220) + 'px';
  popup.style.top = (canvasCenterY - 60) + 'px';
  parent.appendChild(popup);
  setTimeout(() => {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
    if (onClose) onClose();
  }, 5000);
}
