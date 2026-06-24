// slider.js - featured gallery indicator rotation
export function initSlider() {
  const indicators = document.querySelectorAll('.gallery-indicators span');
  if (!indicators.length) return;

  let index = 0;
  const rotate = () => {
    indicators.forEach((dot, idx) => dot.classList.toggle('active', idx === index));
    index = (index + 1) % indicators.length;
  };

  rotate();
  setInterval(rotate, 3200);
}
