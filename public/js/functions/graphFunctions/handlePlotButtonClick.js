
function calculateMaxAndMinValue (graphDataMapping) {
  const values = Object.values(graphDataMapping);

  const minSelfStake = Math.min(...values.map(item => item.self_stake));
  const maxSelfStake = Math.max(...values.map(item => item.self_stake));
  const minWithdraw = Math.min(...values.map(item => item.withdraw));
  const maxWithdraw = Math.max(...values.map(item => item.withdraw));
  const minCommission = Math.min(...values.map(item => item.commission));
  const maxCommission = Math.max(...values.map(item => item.commission));

  const minValue = Math.min(minSelfStake, minWithdraw, minCommission);
  const maxValue = Math.max(maxSelfStake, maxWithdraw, maxCommission);
  return { minValue, maxValue }
}

const validatorGraphEventListenersMapping = {};
const validatorListenerVariablesMapping = {}

function handlePlotButtonClick () {

  document.body.addEventListener('click', async (event) => {
    
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-validator-wrapper')) target = target.parentNode;
    if (!target.classList.contains('each-validator-wrapper')) return;

    if (target.nextSibling.classList.contains('each-validator-details-content-wrapper-visible')) 
      return target.nextSibling.classList.remove('each-validator-details-content-wrapper-visible');
    target.nextSibling.classList.add('each-validator-details-content-wrapper-visible');

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    const operatorAddress = target.id;
    const pubkey = target.getAttribute('pubkey');
    const chainIdentifier = target.getAttribute('chain_identifier');
    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());   
    
    validatorListenerVariablesMapping[operatorAddress] = {
      isSelectingRange: false,
      rangeInitialColumn: '',
      rangeFinalColumn: '',
      isSelectionDirectionToLeft: false
    }
    
    const graphDataMapping = {};

    const currency = document.getElementById('currency-toggle').getAttribute('value') == 'native' ? document.getElementById('network-switch-header').getAttribute('current_chain_symbol') : 'usd';
    const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
    const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
    const symbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
      
    const requestData = {
      chain_identifier: chainIdentifier,
      operator_address: operatorAddress,
      pubkey: pubkey,
      bottom_timestamp: bottomTimestamp,
      top_timestamp: topTimestamp,
      decimals: document.getElementById('network-switch-header').getAttribute('current_chain_decimals')
    };

    const graphWrapper = plotValidatorGraph({ operatorAddress: operatorAddress.replace('@', '\\@'), graphDataMapping, currency, decimals, usd_exchange_rate, symbol, validatorGraphEventListenersMapping });
    const graphWidth = window.getComputedStyle(graphWrapper, null).getPropertyValue("width").replace('px', '');

    const queryString = new URLSearchParams(requestData).toString();
    const eventSource = new EventSource(`/validator/get_graph_data?${queryString}`)
    
    eventSource.onmessage = (event) => {
      const response = JSON.parse(event.data);
    
      if (!response.success || response.err) {
        eventSource.close();
        return;
      }

      if (response.isInactivityIntervals) return addInactivityDetails(operatorAddress, response);
    
      const data = response.data;
      graphDataMapping[data.index] = data;
    
      let { minValue, maxValue } = calculateMaxAndMinValue(graphDataMapping);
    
      document.documentElement.style.setProperty(`--min-value-${operatorAddress}`, minValue);
      document.documentElement.style.setProperty(`--max-value-${operatorAddress}`, maxValue);
    
      if (maxValue == minValue) minValue = maxValue / 2;
    
      const insertedColumn = addColumnToExistingGraph({
        operatorAddress: operatorAddress.replace('@', '\\@'),
        data: data,
        timestamp: data.timestamp,
        index: data.index,
        currency: currency,
        decimals: decimals,
        usd_exchange_rate: usd_exchange_rate,
        symbol: symbol,
        graphDataMapping,
        minValue,
        maxValue,
        graphWidth
      });
    
      if (
        insertedColumn.previousSibling &&
        insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')
      ) {
        adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, operatorAddress.replace('@', '\\@'));
      } else {
        document.documentElement.style.setProperty('--column-height', insertedColumn.offsetHeight);
        addColumnEventListener(operatorAddress.replace('@', '\\@'));
      }
    };
    

    eventSource.addEventListener('end', () => {
      eventSource.close();
    });

    eventSource.onerror = (err) => eventSource.close();
  });
      

  let isResizing = false;
  window.onresize = () => {
    if (isResizing) return;
    isResizing = true;

    const graphWrappersArray = document.querySelectorAll('.validator-graph-wrapper');
    setTimeout(() => {
  
      for (let i = 0; i < graphWrappersArray.length; i++) {
        const eachGraphWrapper = graphWrappersArray[i];
        const operatorAddress = eachGraphWrapper.getAttribute('operator_address');
        const columnWrapper = eachGraphWrapper.querySelector('.each-graph-column-wrapper');
        if (!columnWrapper) return;
        
        document.documentElement.style.setProperty(
          `--graph-column-width-${operatorAddress}`, 
          columnWrapper.getBoundingClientRect().width
        );
      }
      isResizing = false;
    }, 10);
  }
}
