#include "TopKRanker.h"
#include <algorithm>

void TopKRanker::update(const AccountId& id, double newScore) {
    // 1. Update the account's score in the master map
    scoreMap[id] = newScore;

    // 2. Clear the current min-heap
    minHeap = std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>>();

    // 3. Rebuild the min-heap containing only the top K elements
    for (const auto& pair : scoreMap) {
        double score = pair.second;
        const AccountId& accId = pair.first;

        if (static_cast<int>(minHeap.size()) < K) {
            minHeap.push({score, accId});
        } else if (score > minHeap.top().first) {
            minHeap.pop();
            minHeap.push({score, accId});
        }
    }
}

std::vector<std::pair<AccountId, double>> TopKRanker::getTopK() {
    // Make a copy of the min-heap to preserve its state while extracting elements
    auto tempHeap = minHeap;
    std::vector<std::pair<AccountId, double>> result;

    while (!tempHeap.empty()) {
        auto top = tempHeap.top();
        tempHeap.pop();
        result.push_back({top.second, top.first});
    }

    // Since elements were popped from a min-heap, they are in ascending order.
    // We reverse the list to order them descending (highest risk first).
    std::reverse(result.begin(), result.end());
    return result;
}
