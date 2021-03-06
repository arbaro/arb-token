/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#pragma once

#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#define EOS_SYMBOL symbol("EOS", 4)

#include <string>

using std::string;
using namespace eosio;

CONTRACT arbaroToken : public eosio::contract
{
    using contract::contract;

  public:
    ACTION create(name issuer,
                  asset maximum_supply);

    ACTION issue(name to, asset quantity, string memo);

    ACTION retire(asset quantity, string memo);


    ACTION transfer(name from,
                    name to,
                    asset quantity,
                    string memo);

    ACTION open(name owner, const symbol &symbol, name ram_payer);

    ACTION close(name owner, const symbol &symbol);

    ACTION claim(name owner, symbol tokensym);


    void issuediv(name from,
            name to,
            asset quantity,
            string memo);

    static asset get_supply(name token_contract_account, symbol_code sym_code)
    {
        stats statstable(token_contract_account, sym_code.raw());
        const auto &st = statstable.get(sym_code.raw());
        return st.supply;
    }

    static asset get_balance(name token_contract_account, name owner, symbol_code sym_code)
    {
        accounts accountstable(token_contract_account, owner.value);
        const auto &ac = accountstable.get(sym_code.raw());
        return ac.balance;
    }

  private:
    TABLE account
    {
        asset balance;
        asset lastclaim;

        uint64_t primary_key() const { return balance.symbol.code().raw(); }
    };

    TABLE currency_stats
    {
        asset supply;
        asset max_supply;
        name issuer;
        asset totaldividends;

        uint64_t primary_key() const { return supply.symbol.code().raw(); }
    };

    typedef eosio::multi_index<"accounts"_n, account> accounts;
    typedef eosio::multi_index<"stat"_n, currency_stats> stats;

    void sub_balance(name owner, asset value, int64_t supply, asset totaldividends);
    void add_balance(name owner, asset value, name ram_payer, int64_t supply, asset totaldividends);
    void sendreward(name owner, symbol tokensym, int64_t balance, int64_t supply, asset lastclaim, asset totaldividends);


};
