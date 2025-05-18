function animateOverflowMonikers(monikerWrapper) {

  const container = monikerWrapper.children[0];
  if (!container) return;
  const monikerText = monikerWrapper.children[0].children[0];

  if (monikerText) {
    const containerWidth = container.offsetWidth;
    const textWidth = monikerText.scrollWidth;
    if (textWidth > containerWidth) {
      const animation = `scrollText ${(textWidth/containerWidth) * 2}s linear infinite alternate`;
      monikerText.style.animation = animation;
      monikerText.style.position = monikerText.style.position = 'relative';
    } else {
      monikerText.style.animation = 'none';
    }
  }
}