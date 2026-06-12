#include "RiskScorer.h"
#include <algorithm>

double RiskScorer::aggregateScore(const std::vector<Signal>& signals) const {
    double total = 0.0;
    for (const auto& sig : signals) {
        total += sig.score;
    }
    // Clamp the overall risk score between 0.0 and 100.0
    return std::clamp(total, 0.0, 100.0);
}

std::string RiskScorer::getSeverity(double score) const {
    if (score < 20.0) return "NONE";
    if (score < 40.0) return "LOW";
    if (score < 60.0) return "MEDIUM";
    if (score < 80.0) return "HIGH";
    return "CRITICAL";
}

std::string RiskScorer::getDecision(double score) const {
    if (score < 40.0) return "APPROVE";
    if (score < 70.0) return "REVIEW";
    return "BLOCK";
}
