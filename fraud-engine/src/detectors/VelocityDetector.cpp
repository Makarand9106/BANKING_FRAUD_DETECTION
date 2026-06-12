#include "VelocityDetector.h"
#include <sstream>

std::vector<Signal> VelocityDetector::detect(const Transaction& tx, const TransactionGraph& g) {
    std::vector<Signal> signals;
    Timestamp cutoff = tx.timestamp - 300000LL; // 5 minutes in milliseconds (5 * 60 * 1000)

    auto& history = accountHistory[tx.from];
    history.push_back(tx.timestamp);

    // Evict timestamps older than 5 minutes
    while (!history.empty() && history.front() < cutoff) {
        history.pop_front();
    }

    if (history.size() > 10) {
        std::stringstream ss;
        ss << "Velocity alert: " << history.size()
           << " transactions initiated by account in last 5 minutes (threshold = 10)";
        
        signals.push_back(Signal{
            "VELOCITY",
            20.0,
            ss.str()
        });
    }

    return signals;
}

std::string VelocityDetector::name() const {
    return "VelocityDetector";
}
