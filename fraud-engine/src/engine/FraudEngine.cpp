#include "FraudEngine.h"
#include "../detectors/CycleDetector.h"
#include "../detectors/VelocityDetector.h"
#include "../detectors/SmurfingDetector.h"
#include "../detectors/BalanceDrainDetector.h"
#include "../detectors/DormantActivityDetector.h"
#include "../detectors/RiskPropagationDetector.h"

FraudEngine::FraudEngine() {
    // Register all 6 detectors in pipeline order
    detectors.push_back(std::make_unique<CycleDetector>());
    detectors.push_back(std::make_unique<VelocityDetector>());
    detectors.push_back(std::make_unique<SmurfingDetector>());
    detectors.push_back(std::make_unique<BalanceDrainDetector>());
    detectors.push_back(std::make_unique<DormantActivityDetector>());
    detectors.push_back(std::make_unique<RiskPropagationDetector>());
}

AnalysisResult FraudEngine::process(const Transaction& tx, const std::string& transactionId) {
    // 1. Add current transaction to graph structures
    graph.addTransaction(tx);

    // 2. Run sequential detector evaluation pass
    std::vector<Signal> signals;
    for (const auto& detector : detectors) {
        auto sigs = detector->detect(tx, graph);
        signals.insert(signals.end(), sigs.begin(), sigs.end());
    }

    // 3. Aggregate individual signal scores
    double totalScore = scorer.aggregateScore(signals);

    // 4. Update the account's active riskScore inside graph indexes
    if (graph.hasAccount(tx.from)) {
        graph.getAccount(tx.from).riskScore = totalScore;
    }

    // Update heap ranking metrics
    ranker.update(tx.from, totalScore);

    // 5. Severity & Decision classifications
    std::string severity = scorer.getSeverity(totalScore);
    std::string decision = scorer.getDecision(totalScore);

    // 6. Heap priority queue query
    auto topK = ranker.getTopK();

    return AnalysisResult{
        transactionId,
        totalScore,
        severity,
        decision,
        signals,
        topK
    };
}

TransactionGraph& FraudEngine::getGraph() {
    return graph;
}

const AlertGenerator& FraudEngine::getAlertGen() const {
    return alertGen;
}
