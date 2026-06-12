#ifndef SMURFING_DETECTOR_H
#define SMURFING_DETECTOR_H

#include "Detector.h"
#include <unordered_map>
#include <vector>
#include <utility>

/**
 * SmurfingDetector flags structural laundering patterns (splitting sums into micro-transfers).
 *
 * Data Structure Chosen:
 * 1. std::unordered_map<AccountId, std::vector<std::pair<AccountId, std::pair<double, Timestamp>>>> senderWindow:
 *    - Maps sender AccountId to a vector of tuples representing recipients, transfer volumes, and timestamps.
 *    - Chosen because O(1) average lookup maps sender history, and vector allows chronological iteration
 *      to filter out elements older than 60 minutes.
 */
class SmurfingDetector : public Detector {
private:
    // Maps sender -> list of (recipient, (amount, timestamp))
    std::unordered_map<AccountId, std::vector<std::pair<AccountId, std::pair<double, Timestamp>>>> senderWindow;

public:
    SmurfingDetector() = default;
    std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) override;
    std::string name() const override;
};

#endif // SMURFING_DETECTOR_H
