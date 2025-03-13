function animateOverflowMonikers() {
  const monikerContainers = document.querySelectorAll(".validator-moniker-text-content");

  monikerContainers.forEach(container => {
    const monikerText = container.querySelector(".validator-moniker-text");

    if (monikerText) {
      const containerWidth = container.offsetWidth;
      const textWidth = monikerText.scrollWidth;

      if (textWidth > containerWidth) {
        monikerText.style.animation = "scrollText 4s linear infinite alternate";
        monikerText.style.position = "relative";
      } else {
        monikerText.style.animation = "none";
      }
    }
  });
}