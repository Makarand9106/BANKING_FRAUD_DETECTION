#ifndef NORMAL_USER_GENERATOR_H
#define NORMAL_USER_GENERATOR_H

#include "GeneratorBase.h"

class NormalUserGenerator : public GeneratorBase {
public:
    NormalUserGenerator() = default;
    std::vector<Transaction> generate(
        const std::vector<AccountId>& accounts, int count, Timestamp startTime) override;
};

#endif // NORMAL_USER_GENERATOR_H
