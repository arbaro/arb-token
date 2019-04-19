const { sendTransaction, getBalance, parseTokenString, getTable } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


const lastClaimOf = async (account, symbol) => {
  const tableBalance = await getTable("accounts", account)
  const obj = tableBalance.rows.filter(x => x.balance.split(" ")[1] === symbol)[0]
  return parseTokenString(obj.lastclaim).amount
}

const fetchTotalDividends = async (symbol) => {
  const table = await getTable("stat", symbol);
  const sym = table.rows.filter(x => x.supply.split(" ")[1] == symbol)[0]
  return parseTokenString(sym.totaldividends)
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

  const x = await fetchTotalDividends(sym)
  const totalDividends = x.amount

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

  const senderAfterShareBalance = await getBalance(senderAccount, CONTRACT_ACCOUNT, sym);
  const senderAfterEosBalance = await getBalance(senderAccount);
  const receiverAfterShareBalance = await getBalance(receivingAccount, CONTRACT_ACCOUNT, sym);
  const receiverAfterEosBalance = await getBalance(receivingAccount);
  const contractAfterBalance = await getBalance(CONTRACT_ACCOUNT);

  expect(senderAfterShareBalance.amount).toBeCloseTo(senderBeforeShareBalance.amount - Number(amount), 4);
  expect(receiverAfterShareBalance.amount).toBeCloseTo(receiverBeforeShareBalance.amount + Number(amount), 4);
  expect(receiverAfterEosBalance.amount).toBeCloseTo(receiverBeforeEosBalance.amount + receivingEosReward, 4);
  expect(senderAfterEosBalance.amount).toBeCloseTo(senderBeforeEosBalance.amount + senderEosReward, 4);
  expect(contractAfterBalance.amount).toBeCloseTo(contractBeforeBalance.amount - contractLoss, 4);
  expect(await lastClaimOf(senderAccount, sym)).toBe(totalDividends);
  expect(await lastClaimOf(receivingAccount, sym)).toBe(totalDividends);
}

const issueDividend = async (actor, amount, sym) => {

  const contractBeforeBalance = await getBalance(CONTRACT_ACCOUNT);
  const before = await fetchTotalDividends(sym);

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
  const after = await fetchTotalDividends(sym);

  expect(after.amount).toBeCloseTo(before.amount + Number(amount), 4)
  expect(contractAfterBalance.amount).toBeCloseTo(contractBeforeBalance.amount + Number(amount), 4)
}

describe(`contract`, () => {
  //   beforeEach(async () => {
  // const result = await sendTransaction({ name: `testreset` });
  // console.dir(result);
  //   });

  const sym = makeid(3);

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

    expect(await lastClaimOf('test1', sym)).toBe(0)
  })

  test(`test2 can issue a dividend`, async () => {
    await issueDividend('test2', '2.0000', sym)
  })

  test(`test3 can issue a dividend`, async () => {
    expect(await lastClaimOf('test1', sym)).toBe(0);
    await issueDividend('test3', '2.5000', sym)
  })

  test(`test1 can claim his dividend of 4.5 EOS`, async () => {

    const beforeBalance = await getBalance('test1');
    expect(await lastClaimOf('test1', sym)).toBe(0);

    await sendTransaction({
      name: 'claim',
      actor: 'test1',
      data: {
        owner: 'test1',
        tokensym: `4,${sym}`
      }
    })

    const afterBalance = await getBalance('test1');
    expect(afterBalance.amount).toBeGreaterThan(beforeBalance.amount)
    expect(afterBalance.amount).toBe(beforeBalance.amount + 4.5);
    expect(await lastClaimOf('test1', sym)).toBe(4.5);

  })

  test(`test1 can claim again but not receive anything`, async () => {

    const beforeBalance = await getBalance('test1');
    expect(await lastClaimOf('test1', sym)).toBe(4.5);


    await sendTransaction({
      name: 'claim',
      actor: 'test1',
      data: {
        owner: 'test1',
        tokensym: `4,${sym}`
      }
    })

    const afterBalance = await getBalance('test1');
    expect(afterBalance.amount).toBe(beforeBalance.amount);
    expect(await lastClaimOf('test1', sym)).toBe(4.5);

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

    const beforeBalance = await getBalance('test2');
    expect(await lastClaimOf('test2', sym)).toBe(4.5);

    await sendTransaction({
      name: 'claim',
      actor: 'test2',
      data: {
        owner: 'test2',
        tokensym: `4,${sym}`
      }
    })

    const afterBalance = await getBalance('test2');
    expect(afterBalance.amount).toBeGreaterThan(beforeBalance.amount)
    expect(await lastClaimOf('test2', sym)).toBe(6);
    expect(afterBalance.amount).toBe(Number((beforeBalance.amount + 0.3).toFixed(4)));





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

    const test1ShareBalance = await getBalance('test1', CONTRACT_ACCOUNT, sym);
    const test1EosBalance = await getBalance('test1');

    await sendTransaction({
      name: 'claim',
      actor: 'test1',
      data: {
        owner: 'test1',
        tokensym: `4,${sym}`
      }
    })

    const senderAfterShareBalance = await getBalance('test1', CONTRACT_ACCOUNT, sym);
    const senderAfterEosBalance = await getBalance('test1');

    expect(senderAfterEosBalance.amount).toBe(test1EosBalance.amount);
    expect(senderAfterShareBalance.amount).toBe(test1ShareBalance.amount);

  })

  test(`test 3 can issue yet another dividend`, async () => {
    await issueDividend('test3', '2.5000', sym)
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
