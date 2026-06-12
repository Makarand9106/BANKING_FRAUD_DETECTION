#ifndef VELOCITY_DETECTOR_H
#define VELOCITY_DETECTOR_H

#include "Detector.h"
#include <unordered_map>
#include <deque>

/**
 * VelocityDetector flags accounts initiating excessive transfer volumes in short intervals.
 *
 * Data Structure Chosen:
 * 1. std::unordered_map<AccountId, std::deque<Timestamp>> accountHistory:
 *    - Chosen because an unordered_map maps accounts to their individual deques in O(1) average time.
 *    - A deque is chosen for each account to maintain a sliding queue of recent timestamps. We can
 *      add new entries at the back in O(1) and drop expired entries at the front in O(1), keeping
 *      the sliding window operations fast.
 */
class VelocityDetector : public Detector {
private:
    std::unordered_map<AccountId, std::deque<Timestamp>> accountHistory;

public:
    VelocityDetector() = default;
    std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) override;
    std::string name() const override;
};

#endif // VELOCITY_DETECTOR_H
