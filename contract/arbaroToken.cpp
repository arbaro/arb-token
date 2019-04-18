/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */

#include "arbaroToken.hpp"

void arbaroToken::create(name issuer,
                         asset maximum_supply)
{

    auto sym = maximum_supply.symbol;
    eosio_assert(sym.is_valid(), "invalid symbol name");
    eosio_assert(maximum_supply.is_valid(), "invalid supply");
    eosio_assert(maximum_supply.amount > 0, "max-supply must be positive");

    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    eosio_assert(existing == statstable.end(), "token with symbol already exists");

    statstable.emplace(issuer, [&](auto &s) {
        s.supply.symbol = maximum_supply.symbol;
        s.totaldividends.symbol = EOS_SYMBOL;
        s.max_supply = maximum_supply;
        s.issuer = issuer;
    });
}

void arbaroToken::issue(name to, asset quantity, string memo)
{
    auto sym = quantity.symbol;
    eosio_assert(sym.is_valid(), "invalid symbol name");
    eosio_assert(memo.size() <= 256, "memo has more than 256 bytes");

    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    eosio_assert(existing != statstable.end(), "token with symbol does not exist, create token before issue");
    const auto &st = *existing;

    require_auth(st.issuer);
    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must issue positive quantity");

    eosio_assert(quantity.symbol == st.supply.symbol, "symbol precision mismatch");
    eosio_assert(quantity.amount <= st.max_supply.amount - st.supply.amount, "quantity exceeds available supply");

    statstable.modify(st, same_payer, [&](auto &s) {
        s.supply += quantity;
    });

    add_balance(st.issuer, quantity, st.issuer);

    if (to != st.issuer)
    {
        SEND_INLINE_ACTION(*this, transfer, {{st.issuer, "active"_n}},
                           {st.issuer, to, quantity, memo});
    }
}

void arbaroToken::retire(asset quantity, string memo)
{
    auto sym = quantity.symbol;
    eosio_assert(sym.is_valid(), "invalid symbol name");
    eosio_assert(memo.size() <= 256, "memo has more than 256 bytes");

    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    eosio_assert(existing != statstable.end(), "token with symbol does not exist");
    const auto &st = *existing;

    require_auth(st.issuer);
    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must retire positive quantity");

    eosio_assert(quantity.symbol == st.supply.symbol, "symbol precision mismatch");

    statstable.modify(st, same_payer, [&](auto &s) {
        s.supply -= quantity;
    });

    sub_balance(st.issuer, quantity);
}

void arbaroToken::issuediv(name from,
                       name to,
                       
                       asset quantity,
                       string memo)
{
    print("issuediv happened");
    // string x = string("FOP");
    // auto sym = quantity.symbol;


    // Hitting the issuediv action directly
    // INCREASES the total dividends (Y)
    // Unable to instantiate the DB when hitting it
    // from the transfer action
    // FIX: Instantiate DB when engaging from 'transfer'

    size_t pos = memo.find(":");
    eosio_assert(pos != string::npos, "Invalid memo");
    string symbolname = memo.substr(0, pos);
    string precisionn = memo.substr(pos+1);

    print("classy");
    // print(name{symbolname});
    print(name{precisionn});
    print("checked");
    name x = name{precisionn};
    uint64_t y = stoi(precisionn);
    print(y);

    symbol sym = symbol(symbolname, y);
    print(_self);
    print("was self");
    print(sym.code().raw());
    stats statstable(_self, sym.code().raw());
    print("Table next");
    print(statstable.get_scope());
    auto existing = statstable.find(sym.code().raw());
    eosio_assert(existing != statstable.end(), "token with symbol does not exist");

    // const auto &st = *existing;

    statstable.modify(existing, same_payer, [&](auto &s) {
        s.totaldividends += quantity;
    });

}

void arbaroToken::transfer(name from,
                           name to,
                           asset quantity,
                           string memo)
{

    eosio_assert(from != to, "cannot transfer to self");
    require_auth(from);
    eosio_assert(is_account(to), "to account does not exist");
    auto sym = quantity.symbol.code();
    stats statstable(_self, sym.raw());
    const auto &st = statstable.get(sym.raw());


    require_recipient(from);
    require_recipient(to);

    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must transfer positive quantity");
    eosio_assert(quantity.symbol == st.supply.symbol, "symbol precision mismatch");
    eosio_assert(memo.size() <= 256, "memo has more than 256 bytes");

    auto payer = has_auth(to) ? to : from;

    sub_balance(from, quantity);
    add_balance(to, quantity, payer);
}


void arbaroToken::claim(name owner, symbol tokensym)
{

    accounts to_acnts(_self, owner.value);
    auto to = to_acnts.find(tokensym.code().raw());
    eosio_assert(to != to_acnts.end(), "failed to find account with token");

    uint64_t amount = 1;

    action(
        permission_level{_self, "active"_n},
        "eosio.token"_n,
        "transfer"_n,
        std::make_tuple(_self, owner, asset(amount, EOS_SYMBOL), string("Dividend Reward")))
        .send();


    // to_acnts.modify(to, same_payer, [&](auto &a) {
    //     a.lastclaim = value;
    // });


}

void arbaroToken::sub_balance(name owner, asset value)
{
    accounts from_acnts(_self, owner.value);

    const auto &from = from_acnts.get(value.symbol.code().raw(), "no balance object found");
    eosio_assert(from.balance.amount >= value.amount, "overdrawn balance");

    from_acnts.modify(from, owner, [&](auto &a) {
        a.balance -= value;
    });
}

void arbaroToken::add_balance(name owner, asset value, name ram_payer)
{
    accounts to_acnts(_self, owner.value);
    auto to = to_acnts.find(value.symbol.code().raw());

    auto sym = value.symbol;
    stats statstable(_self, sym.code().raw());
    auto itr = statstable.find(sym.code().raw());

    if (to == to_acnts.end())
    {
        to_acnts.emplace(ram_payer, [&](auto &a) {
            a.balance = value;
            a.lastclaim = itr->totaldividends;
        });
    }
    else
    {
        claim(owner, sym);
        to_acnts.modify(to, same_payer, [&](auto &a) {
            a.balance += value;
        });
    }
}

void arbaroToken::open(name owner, const symbol &symbol, name ram_payer)
{
    require_auth(ram_payer);

    auto sym_code_raw = symbol.code().raw();

    stats statstable(_self, sym_code_raw);
    const auto &st = statstable.get(sym_code_raw, "symbol does not exist");
    eosio_assert(st.supply.symbol == symbol, "symbol precision mismatch");

    accounts acnts(_self, owner.value);
    auto it = acnts.find(sym_code_raw);
    if (it == acnts.end())
    {
        acnts.emplace(ram_payer, [&](auto &a) {
            a.balance = asset{0, symbol};
        });
    }
}

void arbaroToken::close(name owner, const symbol &symbol)
{
    require_auth(owner);
    accounts acnts(_self, owner.value);
    auto it = acnts.find(symbol.code().raw());
    eosio_assert(it != acnts.end(), "Balance row already deleted or never existed. Action won't have any effect.");
    eosio_assert(it->balance.amount == 0, "Cannot close because the balance is not zero.");
    acnts.erase(it);
}

extern "C" void apply(uint64_t receiver, uint64_t code, uint64_t action)
{
    if (code == "eosio.token"_n.value && action == "transfer"_n.value)
    {
        eosio::execute_action(eosio::name(receiver), eosio::name(code), &arbaroToken::issuediv);
    }
    else if (code == receiver)
    {
        switch (action)
        {
            EOSIO_DISPATCH_HELPER(arbaroToken, (create)(issue)(retire)(transfer)(open)(close)(issuediv))
        }
    }
}
