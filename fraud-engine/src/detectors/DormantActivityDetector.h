#ifndef DORMANT_ACTIVITY_DETECTOR_H
#define DORMANT_ACTIVITY_DETECTOR_H

#include "Detector.h"

/**
 * DormantActivityDetector flags accounts that have been inactive for >90 days and suddenly
 * execute a high-value transaction.
 *
 * Data Structure Chosen:
 * 1. Direct Hash Map Lookup:
 *    - Relies on the TransactionGraph's internal account index hash map, enabling O(1) average lookup
 *      to get the account's historical lastActiveAt metadata.
 */
class DormantActivityDetector : public Detector {
public:
    DormantActivityDetector() = default;
    std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) override;
    std::string name() const override;
};

#endif // DORMANT_ACTIVITY_DETECTOR_H
