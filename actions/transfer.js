const { sendTransaction, getErrorDetail } = require(`../utils`)

const { CONTRACT_ACCOUNT } = process.env

async function action() {
    try {
        await sendTransaction({
            account: `eosio.token`,
            name: `transfer`,
            actor: `test1`,
            data: {
                from: `test1`,
                to: CONTRACT_ACCOUNT,
                quantity: `3.0000 EOS`,
                memo: 'FOP:4',
            },
        })
        console.log(`SUCCESS`)
    } catch (error) {
        console.error(`${getErrorDetail(error)}`)
    }
}

action()
