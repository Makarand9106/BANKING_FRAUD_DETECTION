#include "SmurfingDetector.h"
#include <unordered_set>
#include <algorithm>
#include <sstream>

std::vector<Signal> SmurfingDetector::detect(const Transaction& tx, const TransactionGraph& g) {
    std::vector<Signal> signals;
    Timestamp cutoff = tx.timestamp - 3600000LL; // 60 minutes in milliseconds (60 * 60 * 1000)

    auto& list = senderWindow[tx.from];
    // Record current transaction
    list.push_back({tx.to, {tx.amount, tx.timestamp}});

    // Prune entries older than 60 minutes
    list.erase(
        std::remove_if(list.begin(), list.end(), [cutoff](const auto& item) {
            return item.second.second < cutoff;
        }),
        list.end()
    );

    // Evaluate structuring constraints
    std::unordered_set<AccountId> uniqueRecipients;
    double totalAmount = 0.0;
    bool allBelowThreshold = true;

    for (const auto& item : list) {
        uniqueRecipients.insert(item.first);
        totalAmount += item.second.first;
        if (item.second.first >= 10000.0) {
            allBelowThreshold = false;
        }
    }

    if (uniqueRecipients.size() > 5 && list.size() > 5 && totalAmount > 40000.0 && allBelowThreshold) {
        std::stringstream ss;
        ss << "Smurfing pattern: " << list.size() << " structured transfers to "
           << uniqueRecipients.size() << " unique recipients totaling " << totalAmount
           << " in 60 minutes (each transfer < 10k)";

        signals.push_back(Signal{
            "SMURFING",
            25.0,
            ss.str()
        });
    }

    return signals;
}

std::string SmurfingDetector::name() const {
    return "SmurfingDetector";
}
