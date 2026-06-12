#include "CycleDetector.h"
#include <sstream>

bool CycleDetector::dfs(const AccountId& u, const TransactionGraph& g, Timestamp cutoff,
                         std::unordered_map<AccountId, int>& colors, std::vector<AccountId>& path) const {
    colors[u] = 1; // GRAY: Node is currently in the recursion stack
    path.push_back(u);

    const auto& adjList = g.getAdjList();
    auto it = adjList.find(u);
    if (it != adjList.end()) {
        for (const auto& edge : it->second) {
            // Only consider transaction edges within the 24-hour sliding window
            if (edge.timestamp >= cutoff) {
                const AccountId& v = edge.to;
                if (colors[v] == 1) { // Back-edge identified to a GRAY node (cycle found!)
                    path.push_back(v);
                    return true;
                } else if (colors[v] == 0) { // WHITE: Unvisited node
                    if (dfs(v, g, cutoff, colors, path)) {
                        return true;
                    }
                }
            }
        }
    }

    colors[u] = 2; // BLACK: Node has been fully processed
    path.pop_back();
    return false;
}

std::vector<Signal> CycleDetector::detect(const Transaction& tx, const TransactionGraph& g) {
    std::vector<Signal> signals;
    Timestamp cutoff = tx.timestamp - 86400000LL; // 24 hours in milliseconds

    std::unordered_map<AccountId, int> colors; // WHITE = 0 (default), GRAY = 1, BLACK = 2
    std::vector<AccountId> path;

    // Start DFS path trace from the sender of the current transaction
    if (dfs(tx.from, g, cutoff, colors, path)) {
        // Find loop start segment
        AccountId target = path.back();
        auto startIt = std::find(path.begin(), path.end() - 1, target);
        
        std::stringstream ss;
        ss << "Cycle detected involving ";
        
        if (startIt != path.end() - 1) {
            size_t count = std::distance(startIt, path.end() - 1);
            ss << count << " accounts: ";
            for (auto it = startIt; it != path.end(); ++it) {
                ss << *it;
                if (it + 1 != path.end()) {
                    ss << " -> ";
                }
            }
        } else {
            ss << "multiple accounts";
        }

        signals.push_back(Signal{
            "CYCLE",
            40.0,
            ss.str()
        });
    }

    return signals;
}

std::string CycleDetector::name() const {
    return "CycleDetector";
}
