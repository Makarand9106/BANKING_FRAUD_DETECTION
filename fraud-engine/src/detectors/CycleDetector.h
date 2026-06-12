#ifndef CYCLE_DETECTOR_H
#define CYCLE_DETECTOR_H

#include "Detector.h"
#include <unordered_map>
#include <vector>

/**
 * CycleDetector detects money laundering loops (e.g., A -> B -> C -> A) within a 24-hour sliding window.
 *
 * Data Structure Chosen:
 * 1. std::unordered_map<AccountId, int> colors:
 *    - Used to implement the 3-color (WHITE/GRAY/BLACK) DFS graph traversal state tracking.
 *    - Map lookup is O(1) average, which allows constant-time state checking per visited node.
 * 2. std::vector<AccountId> path:
 *    - Dynamic array to record the recursion stack. Chosen because vector push/pop operations are O(1)
 *      amortized and it facilitates rapid path extraction once a cycle is found.
 */
class CycleDetector : public Detector {
private:
    bool dfs(const AccountId& u, const TransactionGraph& g, Timestamp cutoff,
             std::unordered_map<AccountId, int>& colors, std::vector<AccountId>& path) const;

public:
    CycleDetector() = default;
    std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) override;
    std::string name() const override;
};

#endif // CYCLE_DETECTOR_H
