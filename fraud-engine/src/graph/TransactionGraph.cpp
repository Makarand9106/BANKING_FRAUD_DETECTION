#include "TransactionGraph.h"
#include <algorithm>

void TransactionGraph::addTransaction(const Transaction& tx) {
    // Preserve pre-transaction last active timestamp
    if (accountIndex.find(tx.from) != accountIndex.end()) {
        prevActiveIndex[tx.from] = accountIndex[tx.from].lastActiveAt;
    } else {
        prevActiveIndex[tx.from] = tx.timestamp;
    }

    if (accountIndex.find(tx.to) != accountIndex.end()) {
        prevActiveIndex[tx.to] = accountIndex[tx.to].lastActiveAt;
    } else {
        prevActiveIndex[tx.to] = tx.timestamp;
    }

    // Ensure accounts are indexed
    if (accountIndex.find(tx.from) == accountIndex.end()) {
        accountIndex[tx.from] = AccountNode{tx.from, 0.0, tx.timestamp, 0.0};
    }
    if (accountIndex.find(tx.to) == accountIndex.end()) {
        accountIndex[tx.to] = AccountNode{tx.to, 0.0, tx.timestamp, 0.0};
    }

    // Update metadata states
    accountIndex[tx.from].lastActiveAt = tx.timestamp;
    accountIndex[tx.to].lastActiveAt = tx.timestamp;

    // Register transaction edge to adjacency list
    adjList[tx.from].push_back(Edge{tx.to, tx.amount, tx.timestamp});

    // Register to sliding chronological window
    recentTxWindow.push_back(tx);

    // Automated sliding window garbage collection
    txCount++;
    if (txCount % 100 == 0) {
        // Cutoff older than 24 hours (24h * 60m * 60s * 1000ms = 86400000ms)
        Timestamp cutoff = tx.timestamp - 86400000LL;
        pruneOldEdges(cutoff);
    }
}

/**
 * Prunes expired transactions and edges from memory.
 * Complexity: O(V * avg_degree) to filter all lists. Amortized O(1) since run every 100 transactions.
 */
void TransactionGraph::pruneOldEdges(Timestamp cutoff) {
    // 1. Prune rolling window deque from front
    while (!recentTxWindow.empty() && recentTxWindow.front().timestamp < cutoff) {
        recentTxWindow.pop_front();
    }

    // 2. Prune edges from all adjacency lists using std::remove_if
    for (auto& pair : adjList) {
        auto& edges = pair.second;
        edges.erase(
            std::remove_if(edges.begin(), edges.end(), [cutoff](const Edge& e) {
                return e.timestamp < cutoff;
            }),
            edges.end()
        );
    }
}

std::vector<Edge>& TransactionGraph::getNeighbours(const AccountId& id) {
    return adjList[id];
}

AccountNode& TransactionGraph::getAccount(const AccountId& id) {
    return accountIndex[id];
}

bool TransactionGraph::hasAccount(const AccountId& id) const {
    return accountIndex.find(id) != accountIndex.end();
}

Timestamp TransactionGraph::getPreviousActiveAt(const AccountId& id) const {
    auto it = prevActiveIndex.find(id);
    if (it != prevActiveIndex.end()) {
        return it->second;
    }
    return 0;
}

size_t TransactionGraph::edgeCount() const {
    size_t count = 0;
    for (const auto& pair : adjList) {
        count += pair.second.size();
    }
    return count;
}

size_t TransactionGraph::nodeCount() const {
    return accountIndex.size();
}

const std::deque<Transaction>& TransactionGraph::getRecentWindow() const {
    return recentTxWindow;
}

const std::unordered_map<AccountId, std::vector<Edge>>& TransactionGraph::getAdjList() const {
    return adjList;
}
