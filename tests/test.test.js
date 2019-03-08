const { sendTransaction, getBalance } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

describe(`contract`, () => {
  //   beforeEach(async () => {
  // const result = await sendTransaction({ name: `testreset` });
  // console.dir(result);
  //   });

  const sym = "JACFK";

  test(`contract can create new token`, async () => {
    await sendTransaction({
      name: "create",
      data: {
        issuer: "test1",
        maximum_supply: `1000000.0000 ${sym}`
      }
    });
  });

  test(`test1 can issue the new token`, async () => {
    await sendTransaction({
      name: "issue",
      data: {
        to: "test2",
        quantity: `100.0000 ${sym}`,
        memo: ""
      },
      actor: "test1"
    });

    const { amount } = await getBalance("arbtoken", "test2", sym);
    expect(amount).toBe("100.0000");
  });
});
