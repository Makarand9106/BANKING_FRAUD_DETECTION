#include "CycleGenerator.h"
#include <random>

std::vector<Transaction> CycleGenerator::generate(
    const std::vector<AccountId>& accounts, int count, Timestamp startTime) {
    std::vector<Transaction> result;
    if (accounts.size() < 3) return result;

    std::mt19937 rng(54321); // Deterministic seed
    std::uniform_int_distribution<size_t> accDist(0, accounts.size() - 1);
    std::uniform_real_distribution<double> amtDist(10000.0, 50000.0);
    // Interval between hops: e.g. 5-15 mins in milliseconds
    std::uniform_int_distribution<Timestamp> hopDist(300000LL, 900000LL);

    Timestamp current = startTime;
    for (int i = 0; i < count; ++i) {
        // Pick 3 distinct accounts
        size_t aIdx = accDist(rng);
        size_t bIdx = accDist(rng);
        while (bIdx == aIdx) bIdx = accDist(rng);
        size_t cIdx = accDist(rng);
        while (cIdx == aIdx || cIdx == bIdx) cIdx = accDist(rng);

        const AccountId& a = accounts[aIdx];
        const AccountId& b = accounts[bIdx];
        const AccountId& c = accounts[cIdx];

        double baseAmount = amtDist(rng);
        Timestamp t1 = current + hopDist(rng);
        Timestamp t2 = t1 + hopDist(rng);
        Timestamp t3 = t2 + hopDist(rng);

        result.push_back(Transaction{a, b, baseAmount, t1});
        result.push_back(Transaction{b, c, baseAmount * 0.95, t2});
        result.push_back(Transaction{c, a, baseAmount * 0.90, t3});

        current = t3 + 1200000LL; // Space out next cycle by 20 mins
    }

    return result;
}
