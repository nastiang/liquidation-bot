const fetch = require('node-fetch');
const url = process.env.COMPOUND_ENDPOINT;

exports.fetchCTokenUnderlyingPrices_Eth = async() => {
  // Set HTTP request parameters
  let params = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  // Await JSON
  const res = await fetch(url + '/ctoken', params);
  const json = await res.json();

  let cTokenUnderlyingPrices_Eth = {};
  const cTokens = json['cToken'];
  cTokens.forEach((cToken) => {
    cTokenUnderlyingPrices_Eth[cToken.symbol] = cToken.underlying_price.value;
  });

  return cTokenUnderlyingPrices_Eth;
};

exports.fetchAccounts = async (maxHealth) => {
  // Set HTTP request parameters
  let params = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  // Initialize variables involved in the HTTP response
  let accounts = [];
  let closeFactor = 0;
  let liquidationIncentive = 0;
  let page = 1;
  let totalPages = 0;
  // Get at least 1 page of results. Append more pages until all accounts < maxHealth have been fetched
  do {
    params['body'] = JSON.stringify({ 'page_number': page, 'page_size': 100 });
    // Await JSON
    const res = await fetch(url + '/account', params).then(response => response.json().then((result) =>
        console.log(result)))
    //const json = await res.json()

    async function safeParseJSON(response) {
      const body = await response.text();
      try {
        return JSON.parse(body);
      } catch (err) {
        console.error("Error:", err);
        console.error("Response body:", body);
        // throw err;
        return response
      }
    }

    const json = await fetch(url + '/account', params).then(safeParseJSON)  //TODO not working
    // Save data from JSON to local variables
    if (json['accounts'] !== undefined) accounts = [...accounts, ...json['accounts']];
    if (json['close_factor'] !== undefined) closeFactor = json['close_factor'];
    if (json['liquidation_incentive'] !== undefined) liquidationIncentive = json['liquidation_incentive'];
    // Assumes that account results are ordered from least to most healthy
    if (accounts.some(acct => acct.health && acct.health.value > maxHealth)) break;
    // Figure out how many pages there are, in case we need to go through all of them
    const pagination = json['pagination_summary'];
    if (pagination && pagination.total_pages) totalPages = pagination.total_pages;
    page++;
  } while (page < totalPages);

  return accounts.filter(acct => acct.health && acct.health.value <= maxHealth);
};
