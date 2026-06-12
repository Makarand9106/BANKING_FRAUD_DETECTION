#include "NormalUserGenerator.h"
#include <random>

std::vector<Transaction> NormalUserGenerator::generate(
    const std::vector<AccountId>& accounts, int count, Timestamp startTime) {
    std::vector<Transaction> result;
    if (accounts.size() < 2) return result;

    std::mt19937 rng(12345); // Deterministic seed
    std::uniform_int_distribution<size_t> accDist(0, accounts.size() - 1);
    std::uniform_real_distribution<double> amtDist(500.0, 5000.0);
    // 1 to 30 minutes in milliseconds (1m = 60000ms, 30m = 1800000ms)
    std::uniform_int_distribution<Timestamp> timeDist(60000LL, 1800000LL);

    Timestamp current = startTime;
    for (int i = 0; i < count; ++i) {
        size_t fromIdx = accDist(rng);
        size_t toIdx = accDist(rng);
        while (fromIdx == toIdx) {
            toIdx = accDist(rng);
        }

        current += timeDist(rng);
        result.push_back(Transaction{
            accounts[fromIdx],
            accounts[toIdx],
            amtDist(rng),
            current
        });
    }

    return result;
}
