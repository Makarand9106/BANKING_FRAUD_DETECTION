#ifndef RISK_PROPAGATION_DETECTOR_H
#define RISK_PROPAGATION_DETECTOR_H

#include "Detector.h"
#include <unordered_set>
#include <queue>
#include <utility>

/**
 * RiskPropagationDetector flags accounts connected to known high-risk nodes (up to 3 hops away).
 *
 * Data Structures Chosen:
 * 1. std::queue<std::pair<AccountId, int>> q:
 *    - Standard FIFO queue chosen to execute BFS (Breadth-First Search) level-order traversal.
 * 2. std::unordered_set<AccountId> visited:
 *    - Chosen to prevent cycles and ensure O(1) average membership tests during traversal.
 */
class RiskPropagationDetector : public Detector {
public:
    RiskPropagationDetector() = default;
    std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) override;
    std::string name() const override;
};

#endif // RISK_PROPAGATION_DETECTOR_H
