#ifndef RISK_SCORER_H
#define RISK_SCORER_H

#include "../types.h"
#include <vector>
#include <string>

class RiskScorer {
public:
    RiskScorer() = default;

    double aggregateScore(const std::vector<Signal>& signals) const;
    std::string getSeverity(double score) const;
    std::string getDecision(double score) const;
};

#endif // RISK_SCORER_H
