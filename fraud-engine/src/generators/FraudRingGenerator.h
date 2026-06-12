#ifndef FRAUD_RING_GENERATOR_H
#define FRAUD_RING_GENERATOR_H

#include "GeneratorBase.h"

class FraudRingGenerator : public GeneratorBase {
public:
    FraudRingGenerator() = default;
    std::vector<Transaction> generate(
        const std::vector<AccountId>& accounts, int count, Timestamp startTime) override;
};

#endif // FRAUD_RING_GENERATOR_H
