const { sendTransaction, getErrorDetail } = require(`../utils`)

const { CONTRACT_ACCOUNT } = process.env

async function action() {
    try {
        const transaction = await sendTransaction({
            name: `open`,
            actor: CONTRACT_ACCOUNT,
            data: {
    "owner": "owner",
    "symbol": "symbol",
    "ram_payer": "ram_payer"
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
