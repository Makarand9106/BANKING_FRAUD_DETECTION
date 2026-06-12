#ifndef BALANCE_DRAIN_DETECTOR_H
#define BALANCE_DRAIN_DETECTOR_H

#include "Detector.h"
#include <unordered_map>
#include <deque>
#include <utility>

/**
 * BalanceDrainDetector flags rapid ledger depletion events.
 *
 * Data Structure Chosen:
 * 1. std::unordered_map<AccountId, std::deque<std::pair<double, Timestamp>>> drainWindow:
 *    - Maps account ID to a sliding queue of outbound transfer amounts and timestamps.
 *    - Chosen because O(1) average lookup tracks the account history, and std::deque allows
 *      amortized O(1) push_back and pop_front for sliding window management.
 */
class BalanceDrainDetector : public Detector {
private:
    std::unordered_map<AccountId, std::deque<std::pair<double, Timestamp>>> drainWindow;

public:
    BalanceDrainDetector() = default;
    std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) override;
    std::string name() const override;
};

#endif // BALANCE_DRAIN_DETECTOR_H
