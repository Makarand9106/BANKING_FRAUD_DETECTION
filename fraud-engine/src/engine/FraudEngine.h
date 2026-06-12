#ifndef FRAUD_ENGINE_H
#define FRAUD_ENGINE_H

#include "../types.h"
#include "../graph/TransactionGraph.h"
#include "../detectors/Detector.h"
#include "../scoring/RiskScorer.h"
#include "../ranking/TopKRanker.h"
#include "../output/AlertGenerator.h"
#include <vector>
#include <memory>
#include <string>

class FraudEngine {
private:
    TransactionGraph graph;
    std::vector<std::unique_ptr<Detector>> detectors;
    RiskScorer scorer;
    TopKRanker ranker;
    AlertGenerator alertGen;

public:
    FraudEngine();

    AnalysisResult process(const Transaction& tx, const std::string& transactionId);
    
    // Getter to expose graph reference to main
    TransactionGraph& getGraph();
    const AlertGenerator& getAlertGen() const;
};

#endif // FRAUD_ENGINE_H
