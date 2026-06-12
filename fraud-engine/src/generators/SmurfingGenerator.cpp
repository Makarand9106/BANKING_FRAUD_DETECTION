#include "SmurfingGenerator.h"
#include <random>
#include <unordered_set>

std::vector<Transaction> SmurfingGenerator::generate(
    const std::vector<AccountId>& accounts, int count, Timestamp startTime) {
    std::vector<Transaction> result;
    if (accounts.size() < 7) return result; // Needs at least 1 sender + 6 receivers

    std::mt19937 rng(98765);
    std::uniform_int_distribution<size_t> accDist(0, accounts.size() - 1);
    std::uniform_int_distribution<int> recCountDist(6, 10);
    std::uniform_real_distribution<double> amtDist(8000.0, 9900.0);
    // Timestamps within 60 minutes (0 to 3600000ms)
    std::uniform_int_distribution<Timestamp> timeOffsetDist(0LL, 3600000LL);

    Timestamp current = startTime;
    for (int i = 0; i < count; ++i) {
        size_t senderIdx = accDist(rng);
        const AccountId& sender = accounts[senderIdx];

        int numReceivers = recCountDist(rng);
        std::unordered_set<size_t> receiverIndices;
        while (static_cast<int>(receiverIndices.size()) < numReceivers) {
            size_t idx = accDist(rng);
            if (idx != senderIdx) {
                receiverIndices.insert(idx);
            }
        }

        std::vector<Transaction> groupTxs;
        for (size_t recIdx : receiverIndices) {
            groupTxs.push_back(Transaction{
                sender,
                accounts[recIdx],
                amtDist(rng),
                current + timeOffsetDist(rng)
            });
        }

        // Sort the group transactions chronologically before merging
        std::sort(groupTxs.begin(), groupTxs.end(), [](const Transaction& a, const Transaction& b) {
            return a.timestamp < b.timestamp;
        });

        result.insert(result.end(), groupTxs.begin(), groupTxs.end());

        current += 7200000LL; // Space out subsequent smurf groups by 2 hours
    }

    return result;
}
