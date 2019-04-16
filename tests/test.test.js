const { sendTransaction, getBalance, getTable } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

describe(`contract`, () => {
  //   beforeEach(async () => {
  // const result = await sendTransaction({ name: `testreset` });
  // console.dir(result);
  //   });

  const sym = "FOM";

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
      totaldividends: `0.0000 ${sym}`
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

    const tableBalance = await getTable("accounts", "test1")
    const obj = tableBalance.rows.filter(x => x.balance.split(" ")[1] === sym)[0]

    expect(obj.lastclaim).toBe(`0.0000 ${sym}`)


  })

  //   test(`arbaro has balance`, async () => {
  //     // await sendTransaction({
  //     //   name: "issue",
  //     //   data: {
  //     //     to: "arbaro",
  //     //     quantity: `1000.0000 ${sym}`,
  //     //     memo: ""
  //     //   },
  //     //   actor: "test1"
  //     // });

  //     const { amount } = await getBalance("arbtoken", "arbaro", sym);
  //     expect(amount).toBeGreaterThan(5000);
  //   });

  //   test("charlie received money", async () => {
  //     const { amount } = await getBalance("arbtoken", "charlie", sym);
  //     console.log(amount);
  //     expect(amount).toBeGreaterThan(4999);
  //   });
});
