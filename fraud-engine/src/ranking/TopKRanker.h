#ifndef TOP_K_RANKER_H
#define TOP_K_RANKER_H

#include "../types.h"
#include <unordered_map>
#include <queue>
#include <vector>
#include <string>
#include <utility>

/**
 * TopKRanker maintains the top-10 accounts with the highest risk scores.
 *
 * Data Structures Chosen:
 * 1. std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> minHeap:
 *    - A min-heap (represented by priority_queue with greater comparison) is chosen because it allows
 *      efficient tracking of the top K elements.
 *    - To keep the top K, when inserting a new element, we compare it against the min element at the top.
 *      If it is larger, we pop the top and push the new one. This maintains the heap size at K, with O(log K)
 *      eviction of the lowest score in the top K.
 *
 * 2. std::unordered_map<AccountId, double> scoreMap:
 *    - Chosen to store the most up-to-date risk score of every account in O(1) average time.
 */
class TopKRanker {
private:
    using Entry = std::pair<double, AccountId>; // (riskScore, accountId)
    std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> minHeap;
    std::unordered_map<AccountId, double> scoreMap;
    int K = 10;

public:
    TopKRanker() = default;

    void update(const AccountId& id, double newScore);
    std::vector<std::pair<AccountId, double>> getTopK();
};

#endif // TOP_K_RANKER_H
