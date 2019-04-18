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

  test(`test2 can issue a dividend`, async() => {

    const beforeBalance = await getBalance(CONTRACT_ACCOUNT);
    expect(beforeBalance.amount).toBeGreaterThanOrEqual(1000);
    

    await sendTransaction({
      account: 'eosio.token',
      name: 'transfer',
      actor: 'test2',
      data: {
        from: 'test2',
        to: "arbtoken",
        quantity: "2.0000 EOS",
        memo: `${sym}:4`
      }
    })

    const afterBalance = await getBalance(CONTRACT_ACCOUNT);
    expect(afterBalance.amount).toBe(beforeBalance.amount + 2);
    
    const table = await getTable("stat", sym);
    expect(table.rows).toContainEqual({
      supply: `1000.0000 ${sym}`,
      max_supply: `10000000.0000 ${sym}`,
      issuer: 'contoso',
      totaldividends: `2.0000 EOS`
    })
    
  })

  test(`test3 can issue a dividend`, async() => {

    expect(await lastClaimOf('test1', sym)).toBe(0);

    await sendTransaction({
      account: 'eosio.token',
      name: 'transfer',
      actor: 'test3',
      data: {
        from: 'test3',
        to: "arbtoken",
        quantity: "2.5000 EOS",
        memo: `${sym}:4`
      }
    })
    
    const table = await getTable("stat", sym);
    expect(table.rows).toContainEqual({
      supply: `1000.0000 ${sym}`,
      max_supply: `10000000.0000 ${sym}`,
      issuer: 'contoso',
      totaldividends: `4.5000 EOS`
    })
    
  })

  test(`test1 can claim his dividend of 4.5 EOS`, async() => {

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

  test(`test1 can claim again but not receive anything`, async() => {

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

  test(`test 1 can send 200 shares to test2`, async() => {

    const beforeShareBalance = await getBalance('test2', CONTRACT_ACCOUNT, sym);
    expect(beforeShareBalance).toBeFalsy()

    await sendTransaction({
      name: 'transfer',
      actor: 'test1',
      data: {
        from : 'test1',
        to: "test2",
        quantity: `200.0000 ${sym}`,
        memo: "Thanks!"
      }
    })

    const afterShareBalance = await getBalance('test2', CONTRACT_ACCOUNT, sym);
    expect(afterShareBalance.amount).toBe(200);
    expect(await lastClaimOf('test2', sym)).toBe(4.5);

  })


  test(`test 3 can issue another dividend`, async() => {
    
    await sendTransaction({
      account: 'eosio.token',
      name: 'transfer',
      actor: 'test3',
      data: {
        from: 'test3',
        to: "arbtoken",
        quantity: "1.5000 EOS",
        memo: `${sym}:4`
      }
    })

    const table = await getTable("stat", sym);
    expect(table.rows).toContainEqual({
      supply: `1000.0000 ${sym}`,
      max_supply: `10000000.0000 ${sym}`,
      issuer: 'contoso',
      totaldividends: `6.0000 EOS`
    })

  })


  test(`test2 can claim his dividend`, async() => {

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
    console.log({ beforeBalance, afterBalance })
    expect(afterBalance.amount).toBeGreaterThan(beforeBalance.amount)
    expect(await lastClaimOf('test2', sym)).toBe(6);
    expect(afterBalance.amount).toBe(beforeBalance.amount + 0.3);

  })

});
