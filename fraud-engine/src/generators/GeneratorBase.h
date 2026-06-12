#ifndef GENERATOR_BASE_H
#define GENERATOR_BASE_H

#include "../types.h"
#include <vector>

class GeneratorBase {
public:
    virtual std::vector<Transaction> generate(
        const std::vector<AccountId>& accounts, int count, Timestamp startTime) = 0;
    virtual ~GeneratorBase() = default;
};

#endif // GENERATOR_BASE_H
