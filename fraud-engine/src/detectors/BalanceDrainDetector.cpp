#include "BalanceDrainDetector.h"
#include <sstream>

std::vector<Signal> BalanceDrainDetector::detect(const Transaction& tx, const TransactionGraph& g) {
    std::vector<Signal> signals;
    Timestamp cutoff = tx.timestamp - 1800000LL; // 30 minutes in milliseconds (30 * 60 * 1000)

    auto& queue = drainWindow[tx.from];
    queue.push_back({tx.amount, tx.timestamp});

    // Remove transactions older than 30 minutes
    while (!queue.empty() && queue.front().second < cutoff) {
        queue.pop_front();
    }

    double totalOutgoing = 0.0;
    for (const auto& item : queue) {
        totalOutgoing += item.first;
    }

    double balance = 0.0;
    if (g.hasAccount(tx.from)) {
        // Since graph.addTransaction doesn't auto-deduct, this reflects the pre-tx or updated balance synced from DB
        balance = const_cast<TransactionGraph&>(g).getAccount(tx.from).balance;
    }

    double drainRatio = (balance > 0.0) ? (totalOutgoing / balance) : 0.0;

    if (drainRatio > 0.70 && totalOutgoing > 50000.0) {
        std::stringstream ss;
        ss << "Balance drain: Outgoing total " << totalOutgoing << " in last 30 minutes drains "
           << (drainRatio * 100.0) << "% of current account balance (" << balance << ")";

        signals.push_back(Signal{
            "DRAIN",
            30.0,
            ss.str()
        });
    }

    return signals;
}

std::string BalanceDrainDetector::name() const {
    return "BalanceDrainDetector";
}
