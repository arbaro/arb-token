const { sendTransaction, getErrorDetail } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

async function action() {
  try {
    const transaction = await sendTransaction({
      account: `eosio`,
      name: `updateauth`,
      data: {
        account: "contoso",
        permission: `active`,
        auth: {
          threshold: 1,
          keys: [
            {
              key: `EOS7rkVPRV3FD434Ux9K7GpNZpwQyQjNNsLLrS3FMQeLyX88MXj1P`,
              weight: 1
            }
          ],
          accounts: [
            {
              permission: { actor: `arbaro`, permission: `active` },
              weight: 1
            }
          ],
          waits: []
        },
        parent: `owner`
      },
      actor: "contoso"
    });
    console.log(`SUCCESS`);
    console.log(
      transaction.processed.action_traces
        .map(
          trace =>
            `${trace.console}${trace.inline_traces.map(
              t => `\n\t${t.console}`
            )}`
        )
        .join(`\n`)
    );
  } catch (error) {
    console.error(`${getErrorDetail(error)}`);
  }
}

action();
