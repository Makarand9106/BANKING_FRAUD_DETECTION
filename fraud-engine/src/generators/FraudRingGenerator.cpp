#include "FraudRingGenerator.h"
#include <random>
#include <unordered_set>
#include <algorithm>

std::vector<Transaction> FraudRingGenerator::generate(
    const std::vector<AccountId>& accounts, int count, Timestamp startTime) {
    std::vector<Transaction> result;
    if (accounts.size() < 6) return result; // Needs at least 6 accounts to select a ring of size 4-6

    std::mt19937 rng(45678);
    std::uniform_int_distribution<size_t> accDist(0, accounts.size() - 1);
    std::uniform_int_distribution<int> sizeDist(4, 6);
    std::uniform_real_distribution<double> amtDist(5000.0, 15000.0);
    std::uniform_int_distribution<Timestamp> timeOffsetDist(0LL, 14400000LL); // within 4 hours

    Timestamp current = startTime;
    for (int i = 0; i < count; ++i) {
        int ringSize = sizeDist(rng);
        std::unordered_set<size_t> ringIndices;
        while (static_cast<int>(ringIndices.size()) < ringSize) {
            ringIndices.insert(accDist(rng));
        }

        std::vector<AccountId> ringAccounts;
        for (size_t idx : ringIndices) {
            ringAccounts.push_back(accounts[idx]);
        }

        std::vector<Transaction> groupTxs;
        // Generate dense all-pairs transactions
        for (int u = 0; u < ringSize; ++u) {
            for (int v = 0; v < ringSize; ++v) {
                if (u != v) {
                    groupTxs.push_back(Transaction{
                        ringAccounts[u],
                        ringAccounts[v],
                        amtDist(rng),
                        current + timeOffsetDist(rng)
                    });
                }
            }
        }

        // Sort chronologically before merging
        std::sort(groupTxs.begin(), groupTxs.end(), [](const Transaction& a, const Transaction& b) {
            return a.timestamp < b.timestamp;
        });

        result.insert(result.end(), groupTxs.begin(), groupTxs.end());

        current += 28800000LL; // Space out next ring group by 8 hours
    }

    return result;
}
