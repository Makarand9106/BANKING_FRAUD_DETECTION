#include "DormantActivityDetector.h"
#include <sstream>

std::vector<Signal> DormantActivityDetector::detect(const Transaction& tx, const TransactionGraph& g) {
    std::vector<Signal> signals;
    // 90 days in milliseconds (90 days * 24h * 60m * 60s * 1000ms = 7776000000LL)
    const Timestamp DORMANT_THRESHOLD_MS = 7776000000LL;

    Timestamp prevActive = g.getPreviousActiveAt(tx.from);

    // If the account has some historical activity and current transaction exceeds dormancy threshold
    if (prevActive > 0) {
        Timestamp inactivityDuration = tx.timestamp - prevActive;
        if (inactivityDuration > DORMANT_THRESHOLD_MS && tx.amount > 20000.0) {
            double inactiveDays = static_cast<double>(inactivityDuration) / (24.0 * 3600.0 * 1000.0);
            
            std::stringstream ss;
            ss << "Dormant account activity: Account inactive for " << inactiveDays
               << " days (threshold = 90 days) initiated transaction of " << tx.amount;

            signals.push_back(Signal{
                "DORMANT",
                15.0,
                ss.str()
            });
        }
    }

    return signals;
}

std::string DormantActivityDetector::name() const {
    return "DormantActivityDetector";
}
