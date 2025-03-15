function animateOverflowMonikers(monikerWrapper) {

  document.querySelectorAll('.validator-moniker-text').forEach(each => {
    each.style.animation = "none";
    each.style.position = "inline-block";
  })

  const container = monikerWrapper.children[0];
  const monikerText = monikerWrapper.children[0].children[0];

  if (monikerText) {
    const containerWidth = container.offsetWidth;
    const textWidth = monikerText.scrollWidth;
    if (textWidth > containerWidth) {
      monikerText.style.animation = `scrollText ${(textWidth/containerWidth) * 2}s linear infinite alternate`;
      monikerText.style.position = "relative";
    } else {
      monikerText.style.animation = "none";
    }
  }
  
}