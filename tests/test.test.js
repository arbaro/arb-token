const { sendTransaction, getBalance, parseTokenString, getTable } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

const fetchAccount = async (account, symbol) => {
  const table = await getTable("accounts", account)
  const accountObjList = table.rows.filter(x => x.balance.split(" ")[1] == symbol)
  if (accountObjList.length == 0) return
  return {
    balance: parseTokenString(accountObjList[0].balance).amount,
    lastclaim: parseTokenString(accountObjList[0].lastclaim).amount
  }
}

const fetchSymbol = async (symbolName) => {
  const table = await getTable("stat", symbolName);
  const symbolObjList = table.rows.filter(x => x.supply.split(" ")[1] == symbolName)
  if (symbolObjList.length == 0) return
  const obj = symbolObjList[0]
  return {
    ...obj,
    totaldividends: parseTokenString(obj.totaldividends).amount,
    max_supply: parseTokenString(obj.max_supply).amount,
    supply: parseTokenString(obj.supply).amount,
  }
}


const calcExpectedReward = (balance, lastclaim, supply, totaldividends) => {

  expect(balance).toBeDefined()
  expect(lastclaim).toBeDefined()
  expect(supply).toBeDefined()
  expect(totaldividends).toBeDefined()
  const percent = balance / supply;
  const portion = totaldividends - lastclaim;
  return portion * percent;
}

const sendShares = async ({
  senderAccount,
  receivingAccount,
  amount,
  sym,
  senderEosReward,
  receivingEosReward
}) => {

  const contractLoss = senderEosReward + receivingEosReward;
  const contractBeforeBalance = await getBalance(CONTRACT_ACCOUNT);

  const senderBeforeShareBalance = await getBalance(senderAccount, CONTRACT_ACCOUNT, sym);
  const receiverBeforeShareBalance = await getBalance(receivingAccount, CONTRACT_ACCOUNT, sym);
  const senderBeforeEosBalance = await getBalance(senderAccount);
  const receiverBeforeEosBalance = await getBalance(receivingAccount);

  const senderAccountData = await fetchAccount(senderAccount, sym);
  const receiverAccountData = await fetchAccount(receivingAccount, sym);
  const { totaldividends, supply } = await fetchSymbol(sym);

  if (senderAccountData && receiverAccountData) {
    const expectedSenderReward = calcExpectedReward(senderAccountData.balance, senderAccountData.lastclaim, supply, totaldividends);
    const expectedReceiverReward = calcExpectedReward(receiverAccountData.balance, receiverAccountData.lastclaim, supply, totaldividends);
    expect(expectedSenderReward).toBeCloseTo(senderEosReward, 4)
    expect(expectedReceiverReward).toBeCloseTo(receivingEosReward, 4)
  }

  await sendTransaction({
    name: 'transfer',
    actor: senderAccount,
    data: {
      from: senderAccount,
      to: receivingAccount,
      quantity: `${amount} ${sym}`,
      memo: 'whatever'
    }
  })

  const senderAfterAccountData = await fetchAccount(senderAccount, sym);
  const senderAfterEosBalance = await getBalance(senderAccount);
  const receiverAfterAccountData = await fetchAccount(receivingAccount, sym);
  const receiverAfterEosBalance = await getBalance(receivingAccount);
  const contractAfterBalance = await getBalance(CONTRACT_ACCOUNT);

  expect(senderAfterAccountData.balance).toBeCloseTo(senderBeforeShareBalance - Number(amount), 4);
  expect(receiverAfterAccountData.balance).toBeCloseTo(receiverBeforeShareBalance + Number(amount), 4);

  expect(receiverAfterEosBalance).toBeCloseTo(receiverBeforeEosBalance + receivingEosReward, 4);
  expect(senderAfterEosBalance).toBeCloseTo(senderBeforeEosBalance + senderEosReward, 4);
  expect(contractAfterBalance).toBeCloseTo(contractBeforeBalance - contractLoss, 4);
  expect(senderAfterAccountData.lastclaim).toBe(totaldividends);
  expect(receiverAfterAccountData.lastclaim).toBe(totaldividends);

}

const fetchState = async (account, symbol) => {
  const symbolData = await fetchSymbol(symbol);
  const accountData = await fetchAccount(account, symbol);
  const accountBalance = await getBalance(account);
  const contractBalance = await getBalance(CONTRACT_ACCOUNT);

  return {
    contractBalance,
    accountBalance,
    account: accountData,
    symbol: symbolData
  }
}

const engageClaim = async (actor, owner, symbol, expectedReward) => {

  const beforeState = await fetchState(owner, symbol);
  const reward = calcExpectedReward(beforeState.account.balance, beforeState.account.lastclaim, beforeState.symbol.supply, beforeState.symbol.totaldividends);
  if (expectedReward) {
    expect(reward).toBeCloseTo(expectedReward, 4)
  }

  await sendTransaction({
    name: 'claim',
    actor,
    data: {
      owner,
      tokensym: `4,${symbol}`
    }
  })

  const afterState = await fetchState(owner, symbol);
  expect(reward).toBeCloseTo(afterState.accountBalance - beforeState.accountBalance, 4);
  expect(afterState.account.lastclaim).toBeCloseTo(afterState.symbol.totaldividends, 4);

  if (beforeState.account.lastclaim == beforeState.symbol.totaldividends) {
    expect(afterState.accountBalance).toBe(beforeState.accountBalance);
    expect(afterState.contractBalance).toBe(beforeState.contractBalance)
  }

  expect(afterState.contractBalance).toBe(beforeState.contractBalance - reward);

}

const issueDividend = async (actor, amount, sym) => {

  const contractBeforeBalance = await getBalance(CONTRACT_ACCOUNT);
  const beforeSymbol = await fetchSymbol(sym);

  await sendTransaction({
    account: 'eosio.token',
    name: 'transfer',
    actor,
    data: {
      from: actor,
      to: "arbtoken",
      quantity: `${amount} EOS`,
      memo: `${sym}:4`
    }
  })

  const contractAfterBalance = await getBalance(CONTRACT_ACCOUNT);
  const afterSymbol = await fetchSymbol(sym);

  expect(afterSymbol.totaldividends).toBeCloseTo(beforeSymbol.totaldividends + Number(amount), 4)
  expect(contractAfterBalance).toBeCloseTo(contractBeforeBalance + Number(amount), 4)
}

describe(`contract`, () => {
  //   beforeEach(async () => {
  //      const result = await sendTransaction({ name: `testreset` });
  //      console.dir(result);
  //   });

  const sym = makeid(3);

  test(`new symbol does not exist`, async () => {
    const x = await fetchSymbol(sym);
    expect(x).toBeFalsy();
  })

  test(`contract can create new token for contoso`, async () => {

    await sendTransaction({
      name: "create",
      actor: 'contoso',
      data: {
        issuer: "contoso",
        maximum_supply: `10000000.0000 ${sym}`
      }
    });

    const table = await getTable("stat", sym);
    expect(table.rows).toContainEqual({
      supply: `0.0000 ${sym}`,
      max_supply: `10000000.0000 ${sym}`,
      issuer: 'contoso',
      totaldividends: `0.0000 EOS`
    })

  });


  test(`contoso can issue to test1, test1 has correct lastdividend`, async () => {

    await sendTransaction({
      name: "issue",
      actor: 'contoso',
      data: {
        to: `test1`,
        quantity: `1000.0000 ${sym}`,
        memo: ""
      }
    })

    const account = await fetchAccount('test1', sym)
    expect(account.lastclaim).toBe(0)
  })

  test(`test2 can issue a dividend`, async () => {
    await issueDividend('test2', '2.0000', sym)
  })

  test(`test3 can issue a dividend`, async () => {
    const account = await fetchAccount('test1', sym);
    expect(account.lastclaim).toBe(0)
    await issueDividend('test3', '2.5000', sym)
  })

  test(`test1 can claim his dividend of 4.5 EOS`, async () => {
    await engageClaim('test1', 'test1', sym, 4.5)
  })

  test(`test1 can claim again but not receive anything`, async () => {
    await engageClaim('test1', 'test1', sym, 0)
  })

  test(`test 1 can send 200 shares to test2`, async () => {
    await sendShares({
      senderAccount: 'test1',
      receivingAccount: 'test2',
      amount: '200.0000',
      sym,
      senderEosReward: 0,
      receivingEosReward: 0
    });
  })


  test(`test 3 can issue another dividend`, async () => {
    await issueDividend('test3', '1.5000', sym)
  })

  test(`test2 can claim his dividend`, async () => {
    await engageClaim('test2', 'test2', sym, 0.3)
  })

  test(`test2 can send 50 shares back to test1, triggering test1s claim`, async () => {
    await sendShares({
      senderAccount: 'test2',
      receivingAccount: 'test1',
      amount: '50.0000',
      sym,
      senderEosReward: 0,
      receivingEosReward: 1.2
    });
  })

  test(`test1 cannot claim after test2 triggering it for him`, async () => {
    await engageClaim('test1', 'test1', sym, 0);
  })

  test(`test 3 can issue yet another dividend`, async () => {
    await issueDividend('test3', '2.5000', sym);
  })

  test(`test1 sends 600 shares to test2 but does not miss out on his own dividend`, async () => {
    await sendShares({
      senderAccount: 'test1',
      receivingAccount: 'test2',
      amount: '600.0000',
      sym,
      senderEosReward: 2.125,
      receivingEosReward: 0.375
    });
  })

});
