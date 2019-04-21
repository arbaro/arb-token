const { getBalance, getTable, getTableByScope, getErrorDetail } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

const main = async () => {
//   const d = await getBalance("arbtoken", "test1", "FOP");
//   console.log(d);




  // const x = await getTableByScope('accounts');
  // console.log(x)

  const x = await getTable("stat", "EUF")
  const y = await getTableByScope('stat')
  const scopes = y.rows.map(x => x.scope);
  console.log(scopes)

  const symbols = []
  for (var i = 0; i < scopes.length; i++) {
    const table = await getTable("stat", scopes[i])
    symbols.push(table.rows[0])
  }

  console.log(symbols)

  
};

main();
