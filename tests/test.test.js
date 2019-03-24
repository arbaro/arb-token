const { sendTransaction, getBalance } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

describe(`contract`, () => {
  //   beforeEach(async () => {
  // const result = await sendTransaction({ name: `testreset` });
  // console.dir(result);
  //   });

  const sym = "CONT";

  test(`contract can create new token for contoso`, async () => {
    await sendTransaction({
      name: "create",
      data: {
        issuer: "contoso",
        maximum_supply: `10000000.0000 ${sym}`
      }
    });
  });

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
