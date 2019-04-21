

const { getBalance, getTable, getErrorDetail } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

const main = async () => {
//   const d = await getBalance("arbtoken", "test1", "FOP");
//   console.log(d);


  const x = await getTable("stat", "........c55p4")
//   const y = await getTable("accounts", "test1")
//   const p = await getBalance("eosio.token", "test1")

  console.log(x)
};

main();
