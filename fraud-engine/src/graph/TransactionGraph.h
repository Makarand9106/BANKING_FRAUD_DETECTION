#ifndef TRANSACTION_GRAPH_H
#define TRANSACTION_GRAPH_H

#include "../types.h"
#include <unordered_map>
#include <vector>
#include <deque>
#include <string>

/**
 * TransactionGraph maps accounts and their transfers.
 *
 * Data Structures Chosen:
 * 1. std::unordered_map<AccountId, std::vector<Edge>> adjList:
 *    - Chosen because it provides O(1) average complexity to find an account's adjacency list.
 *    - std::vector is chosen for neighbors because it stores elements contiguously, maximizing L1/L2
 *      cache efficiency during iterations (e.g. cycle searching and BFS risk propagation).
 *
 * 2. std::unordered_map<AccountId, AccountNode> accountIndex:
 *    - Chosen to access account metrics (riskScore, balance) in O(1) average time.
 *
 * 3. std::deque<Transaction> recentTxWindow:
 *    - Chosen because a deque allows O(1) insertion at the back (new transactions) and O(1) deletion
 *      from the front (expired transactions out of the 24-hour sliding window), keeping rolling state clean.
 */
class TransactionGraph {
private:
    std::unordered_map<AccountId, std::vector<Edge>> adjList;
    std::unordered_map<AccountId, AccountNode> accountIndex;
    std::deque<Transaction> recentTxWindow;
    int txCount = 0;
    std::unordered_map<AccountId, Timestamp> prevActiveIndex;

public:
    TransactionGraph() = default;

    void addTransaction(const Transaction& tx);
    void pruneOldEdges(Timestamp cutoff);

    std::vector<Edge>& getNeighbours(const AccountId& id);
    AccountNode& getAccount(const AccountId& id);
    bool hasAccount(const AccountId& id) const;
    Timestamp getPreviousActiveAt(const AccountId& id) const;

    size_t edgeCount() const;
    size_t nodeCount() const;

    const std::deque<Transaction>& getRecentWindow() const;
    const std::unordered_map<AccountId, std::vector<Edge>>& getAdjList() const;
};

#endif // TRANSACTION_GRAPH_H
