function generateGraphVisibilityLegend(params) {

  const { operatorAddress } = params;

  const wrapper = document.createElement('div');
  wrapper.classList.add('graph-visibility-legend-wrapper');

  const legends = [
    { color: 'lightgreen', text: 'Self-stake', id: 'self_stake' },
    { color: 'lightcoral', text: 'Withdraw', id: 'withdraw' },
    { color: 'orange', text: 'Commission', id: 'commission' }
  ];

  legends.forEach(legend => {
    const content = document.createElement('div');
    content.className = 'each-graph-visibility-content';

    content.addEventListener('click', (event) => {

      if (content.classList.contains('each-graph-visibility-content-disabled')) content.classList.remove('each-graph-visibility-content-disabled');
      else content.classList.add('each-graph-visibility-content-disabled');  

      const graphElements = document.querySelectorAll(`.${legend.id}-graph-data-element-${operatorAddress.replace('@', '\@')}`);
      graphElements.forEach(each => {
        if (each.classList.contains('graph-element-semi-visible')) return each.classList.remove('graph-element-semi-visible');
        return each.classList.add('graph-element-semi-visible');
      })
    })

    const indicator = document.createElement('div');
    indicator.className = 'each-graph-visibility-indicator';
    indicator.style.backgroundColor = legend.color;

    const text = document.createElement('div');
    text.className = 'each-graph-visibility-text';
    text.textContent = legend.text;

    content.appendChild(indicator);
    content.appendChild(text);
    wrapper.appendChild(content);

  });
  return wrapper;
}