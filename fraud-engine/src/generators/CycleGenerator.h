#ifndef CYCLE_GENERATOR_H
#define CYCLE_GENERATOR_H

#include "GeneratorBase.h"

class CycleGenerator : public GeneratorBase {
public:
    CycleGenerator() = default;
    std::vector<Transaction> generate(
        const std::vector<AccountId>& accounts, int count, Timestamp startTime) override;
};

#endif // CYCLE_GENERATOR_H
