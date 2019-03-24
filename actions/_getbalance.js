const { getBalance, getErrorDetail } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

const main = async () => {
  const x = await getBalance("arbtoken", "alice", "CONT");
  console.log(x);
};

main();
