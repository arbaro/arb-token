const { sendTransaction, getErrorDetail } = require(`../utils`)

const { CONTRACT_ACCOUNT } = process.env

async function action() {
    try {
        const transaction = await sendTransaction({
            account: `eosio`,
            name: `updateauth`,
            data: {
                account: CONTRACT_ACCOUNT,
                permission: `active`,
                auth: {
                    threshold: 1,
                    keys: [
                        {
                            key: `EOS5LQEBeEKgqCdNNEWVBuqcjiUh8wgsUGS42pmGjS2SSN4u2oXqc`,
                            weight: 1,
                        },
                    ],
                    accounts: [
                        { permission: { actor: `arbaro`, permission: `active` }, weight: 1 },
                    ],
                    waits: [],
                },
                parent: `owner`,
            },
        })
        console.log(`SUCCESS`)
        console.log(
            transaction.processed.action_traces
                .map(trace => `${trace.console}${trace.inline_traces.map(t => `\n\t${t.console}`)}`)
                .join(`\n`),
        )
    } catch (error) {
        console.error(`${getErrorDetail(error)}`)
    }
}

action()
