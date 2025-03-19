function displaySkeleton () {
  document.querySelectorAll('.validator-image').forEach(each => each.classList.toggle('skeleton-image'));
  document.querySelectorAll('.validator-moniker').forEach(each => each.classList.toggle('skeleton-text'));
  document.querySelectorAll('.validator-moniker-text-content').forEach(each => each.classList.toggle('skeleton-text'));
  document.querySelectorAll('.validator-each-numeric-info').forEach(each => each.classList.toggle('skeleton-text'));
  document.querySelectorAll('.validator-operator-address').forEach(each => each.remove());
  document.querySelectorAll('.validator-inactivity-display').forEach(each => each.remove());
}