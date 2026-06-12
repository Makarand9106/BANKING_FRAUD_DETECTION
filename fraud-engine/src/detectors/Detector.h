#ifndef DETECTOR_H
#define DETECTOR_H

#include "../types.h"
#include "../graph/TransactionGraph.h"
#include <vector>
#include <string>

class Detector {
public:
    virtual std::vector<Signal> detect(const Transaction& tx, const TransactionGraph& g) = 0;
    virtual std::string name() const = 0;
    virtual ~Detector() = default;
};

#endif // DETECTOR_H
