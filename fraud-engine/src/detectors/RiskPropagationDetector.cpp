#include "RiskPropagationDetector.h"
#include <cmath>
#include <sstream>
#include <algorithm>

std::vector<Signal> RiskPropagationDetector::detect(const Transaction& tx, const TransactionGraph& g) {
    std::vector<Signal> signals;

    std::queue<std::pair<AccountId, int>> q;
    std::unordered_set<AccountId> visited;

    q.push({tx.from, 0});
    visited.insert(tx.from);

    double totalPropagatedScore = 0.0;
    std::vector<std::string> contributingAccounts;

    const auto& adjList = g.getAdjList();

    while (!q.empty()) {
        auto [u, hop] = q.front();
        q.pop();

        if (hop > 3) continue;

        // Skip root node evaluation
        if (u != tx.from && g.hasAccount(u)) {
            // Retrieve riskScore of node u
            // Since getAccount is non-const but g is const, we cast const away safely
            double risk = const_cast<TransactionGraph&>(g).getAccount(u).riskScore;
            
            // Decayed score propagation formula: riskScore * (0.5 ^ hop)
            double propagated = risk * std::pow(0.5, hop);
            if (propagated > 10.0) {
                totalPropagatedScore += propagated;
                contributingAccounts.push_back(u);
            }
        }

        // Add neighbors to BFS queue
        auto it = adjList.find(u);
        if (it != adjList.end()) {
            for (const auto& edge : it->second) {
                if (visited.find(edge.to) == visited.end()) {
                    visited.insert(edge.to);
                    q.push({edge.to, hop + 1});
                }
            }
        }
    }

    // Cap the propagation score at 20.0
    if (totalPropagatedScore > 20.0) {
        totalPropagatedScore = 20.0;
    }

    if (totalPropagatedScore > 10.0) {
        std::stringstream ss;
        ss << "Risk propagation alert: Risk score propagated from neighbors (score = "
           << totalPropagatedScore << "). Risk source nodes: ";
        for (size_t i = 0; i < contributingAccounts.size(); ++i) {
            ss << contributingAccounts[i];
            if (i + 1 < contributingAccounts.size()) {
                ss << ", ";
            }
        }

        signals.push_back(Signal{
            "PROPAGATION",
            totalPropagatedScore,
            ss.str()
        });
    }

    return signals;
}

std::string RiskPropagationDetector::name() const {
    return "RiskPropagationDetector";
}
