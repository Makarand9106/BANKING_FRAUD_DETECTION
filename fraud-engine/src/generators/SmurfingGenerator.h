#ifndef SMURFING_GENERATOR_H
#define SMURFING_GENERATOR_H

#include "GeneratorBase.h"

class SmurfingGenerator : public GeneratorBase {
public:
    SmurfingGenerator() = default;
    std::vector<Transaction> generate(
        const std::vector<AccountId>& accounts, int count, Timestamp startTime) override;
};

#endif // SMURFING_GENERATOR_H
