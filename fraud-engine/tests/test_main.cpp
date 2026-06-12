#include <iostream>
#include <vector>
#include <string>
#include <cassert>
#include <cmath>
#include <algorithm>
#include <unordered_map>
#include "types.h"
#include "graph/TransactionGraph.h"
#include "detectors/CycleDetector.h"
#include "detectors/VelocityDetector.h"
#include "detectors/SmurfingDetector.h"
#include "detectors/BalanceDrainDetector.h"
#include "detectors/DormantActivityDetector.h"
#include "detectors/RiskPropagationDetector.h"
#include "scoring/RiskScorer.h"
#include "ranking/TopKRanker.h"
#include "engine/FraudEngine.h"

// Reporting helper for visual feedback during testing.
void report(const std::string& testName, bool success) {
    // std::string is chosen for testName to dynamically format log messages.
    if (success) {
        std::cout << "[PASS] " << testName << std::endl;
    } else {
        std::cerr << "[FAIL] " << testName << std::endl;
    }
}

// Test 1 — CycleDetector: ACC-1 -> ACC-2 -> ACC-3 -> ACC-1 triggers CYCLE signal with score 40.
bool testCycleDetector() {
    // std::vector is chosen here for the signals because it provides a sequential container 
    // with O(1) amortized tail insertions, perfect for iterating over dynamic signals.
    TransactionGraph g;
    g.addTransaction(Transaction{"ACC-1", "ACC-2", 100.0, 1718000000000LL});
    g.addTransaction(Transaction{"ACC-2", "ACC-3", 100.0, 1718000010000LL});
    
    Transaction tx{"ACC-3", "ACC-1", 100.0, 1718000020000LL};
    g.addTransaction(tx);
    
    CycleDetector detector;
    std::vector<Signal> signals = detector.detect(tx, g);
    
    if (signals.empty()) return false;
    
    bool foundCycle = false;
    for (const auto& sig : signals) {
        if (sig.type == "CYCLE" && sig.score == 40.0) {
            foundCycle = true;
        }
    }
    return foundCycle;
}

// Test 2 — VelocityDetector: 11 sequential transfers inside 4 minutes triggers VELOCITY with score 20.
bool testVelocityDetector() {
    // std::vector accumulates sequential signals emitted by the detector; std::string handles account keys.
    VelocityDetector detector;
    TransactionGraph g;
    std::vector<Signal> signals;
    
    for (int i = 0; i < 11; ++i) {
        Transaction tx{"ACC-1", "ACC-2", 100.0, 1718000000000LL + i * 20000LL}; // 20 seconds apart (under 4 minutes total)
        g.addTransaction(tx);
        signals = detector.detect(tx, g);
    }
    
    if (signals.empty()) return false;
    
    bool foundVelocity = false;
    for (const auto& sig : signals) {
        if (sig.type == "VELOCITY" && sig.score == 20.0) {
            foundVelocity = true;
        }
    }
    return foundVelocity;
}

// Test 3 — SmurfingDetector: 1 sender transferring 9500 to 7 distinct accounts within 60 minutes triggers SMURFING with score 25.
bool testSmurfingDetector() {
    // std::vector accumulates signals; std::string is chosen for AccountId to handle alphanumeric IDs.
    SmurfingDetector detector;
    TransactionGraph g;
    std::vector<Signal> signals;
    
    for (int i = 1; i <= 7; ++i) {
        std::string recipient = "ACC-OUT-" + std::to_string(i);
        Transaction tx{"ACC-1", recipient, 9500.0, 1718000000000LL + i * 10000LL}; // 10 seconds apart
        g.addTransaction(tx);
        signals = detector.detect(tx, g);
    }
    
    if (signals.empty()) return false;
    
    bool foundSmurfing = false;
    for (const auto& sig : signals) {
        if (sig.type == "SMURFING" && sig.score == 25.0) {
            foundSmurfing = true;
        }
    }
    return foundSmurfing;
}

// Test 4 — BalanceDrainDetector: Outbound transfers summing to >70% of balance (150k out of 200k) within 30 minutes triggers DRAIN with score 30.
bool testBalanceDrainDetector() {
    // std::vector is used to hold signals from detector; std::string to represent unique account IDs.
    TransactionGraph g;
    g.getAccount("ACC-1") = AccountNode{"ACC-1", 200000.0, 1718000000000LL, 0.0};
    
    BalanceDrainDetector detector;
    Transaction tx{"ACC-1", "ACC-2", 150000.0, 1718000005000LL};
    g.addTransaction(tx);
    
    std::vector<Signal> signals = detector.detect(tx, g);
    if (signals.empty()) return false;
    
    bool foundDrain = false;
    for (const auto& sig : signals) {
        if (sig.type == "DRAIN" && sig.score == 30.0) {
            foundDrain = true;
        }
    }
    return foundDrain;
}

// Test 5 — DormantActivityDetector: Reactivation transfer of 25k on a node dormant for 100 days triggers DORMANT with score 15.
bool testDormantActivityDetector() {
    // std::vector is chosen to store detected signals; std::string chosen to dynamically represent account IDs.
    TransactionGraph g;
    Timestamp t0 = 1718000000000LL;
    g.getAccount("ACC-1") = AccountNode{"ACC-1", 100000.0, t0, 0.0};
    
    DormantActivityDetector detector;
    // Inactivity duration: 100 days = 100 * 24 * 3600 * 1000 ms
    Timestamp t1 = t0 + 100LL * 24LL * 3600LL * 1000LL;
    Transaction tx{"ACC-1", "ACC-2", 25000.0, t1};
    
    g.addTransaction(tx);
    std::vector<Signal> signals = detector.detect(tx, g);
    
    if (signals.empty()) return false;
    
    bool foundDormant = false;
    for (const auto& sig : signals) {
        if (sig.type == "DORMANT" && sig.score == 15.0) {
            foundDormant = true;
        }
    }
    return foundDormant;
}

// Test 6 — RiskScorer: Checks score combinations aggregation, clumping, threat levels, and decisions.
bool testRiskScorer() {
    // std::vector stores input signal configurations; std::string checks string outputs of severity/decision labels.
    RiskScorer scorer;
    
    std::vector<Signal> sigs = {
        Signal{"CYCLE", 40.0, ""},
        Signal{"VELOCITY", 20.0, ""},
        Signal{"SMURFING", 25.0, ""}
    };
    double agg = scorer.aggregateScore(sigs);
    if (std::abs(agg - 85.0) > 1e-5) return false;
    
    std::vector<Signal> highSigs = {
        Signal{"CYCLE", 60.0, ""},
        Signal{"DRAIN", 50.0, ""}
    };
    double clampedAgg = scorer.aggregateScore(highSigs);
    if (std::abs(clampedAgg - 100.0) > 1e-5) return false;
    
    if (scorer.getSeverity(15.0) != "NONE") return false;
    if (scorer.getSeverity(30.0) != "LOW") return false;
    if (scorer.getSeverity(50.0) != "MEDIUM") return false;
    if (scorer.getSeverity(75.0) != "HIGH") return false;
    if (scorer.getSeverity(90.0) != "CRITICAL") return false;
    
    if (scorer.getDecision(15.0) != "APPROVE") return false;
    if (scorer.getDecision(30.0) != "APPROVE") return false;
    if (scorer.getDecision(50.0) != "REVIEW") return false;
    if (scorer.getDecision(65.0) != "REVIEW") return false;
    if (scorer.getDecision(75.0) != "BLOCK") return false;
    
    return true;
}

// Test 7 — TopKRanker: Verifies the top-10 heap returns sorted elements.
bool testTopKRanker() {
    // std::vector stores top-K elements returned from ranker; std::pair represents (AccountId, score) records.
    TopKRanker ranker;
    for (int i = 1; i <= 15; ++i) {
        ranker.update("ACC-" + std::to_string(i), static_cast<double>(i * 5));
    }
    
    auto topK = ranker.getTopK();
    if (topK.size() != 10) return false;
    
    for (size_t i = 0; i < topK.size(); ++i) {
        int expectedIndex = 15 - i;
        double expectedScore = expectedIndex * 5.0;
        std::string expectedId = "ACC-" + std::to_string(expectedIndex);
        
        if (topK[i].first != expectedId || std::abs(topK[i].second - expectedScore) > 1e-5) {
            return false;
        }
    }
    
    return true;
}

// Test 8 — Full Pipeline: Ingests normal, cycle, velocity, smurfing, and drain data to assert final process scores.
bool testFullPipeline() {
    // std::vector tracks accumulated engine metrics and results; std::string matches pipeline identity fields.
    FraudEngine engine;
    
    // Normal Transaction
    engine.getGraph().getAccount("ACC-A") = AccountNode{"ACC-A", 100000.0, 1718000000000LL, 0.0};
    engine.getGraph().getAccount("ACC-B") = AccountNode{"ACC-B", 100000.0, 1718000000000LL, 0.0};
    
    Transaction txNormal{"ACC-A", "ACC-B", 1000.0, 1718000000000LL};
    AnalysisResult resNormal = engine.process(txNormal, "TX-NORMAL");
    if (resNormal.totalScore != 0.0 || resNormal.severity != "NONE" || resNormal.decision != "APPROVE") {
        return false;
    }
    
    // Cycle Transaction (ACC-A -> ACC-B -> ACC-C -> ACC-A)
    engine.getGraph().getAccount("ACC-C") = AccountNode{"ACC-C", 100000.0, 1718000000000LL, 0.0};
    Transaction txCycle1{"ACC-B", "ACC-C", 1000.0, 1718000001000LL};
    engine.process(txCycle1, "TX-CYCLE-1");
    
    Transaction txCycle2{"ACC-C", "ACC-A", 1000.0, 1718000002000LL};
    AnalysisResult resCycle = engine.process(txCycle2, "TX-CYCLE-2");
    
    bool hasCycleSig = false;
    for (const auto& sig : resCycle.signals) {
        if (sig.type == "CYCLE" && sig.score == 40.0) {
            hasCycleSig = true;
        }
    }
    if (!hasCycleSig) return false;
    
    // Velocity Transaction
    engine.getGraph().getAccount("ACC-V") = AccountNode{"ACC-V", 100000.0, 1718000000000LL, 0.0};
    engine.getGraph().getAccount("ACC-W") = AccountNode{"ACC-W", 100000.0, 1718000000000LL, 0.0};
    AnalysisResult resVelocity;
    for (int i = 0; i < 11; ++i) {
        Transaction tx{"ACC-V", "ACC-W", 100.0, 1718000000000LL + i * 10000LL};
        resVelocity = engine.process(tx, "TX-VEL-" + std::to_string(i));
    }
    bool hasVelocitySig = false;
    for (const auto& sig : resVelocity.signals) {
        if (sig.type == "VELOCITY" && sig.score == 20.0) {
            hasVelocitySig = true;
        }
    }
    if (!hasVelocitySig) return false;
    
    // Balance Drain Transaction
    engine.getGraph().getAccount("ACC-D") = AccountNode{"ACC-D", 200000.0, 1718000000000LL, 0.0};
    Transaction txDrain{"ACC-D", "ACC-E", 150000.0, 1718000005000LL};
    AnalysisResult resDrain = engine.process(txDrain, "TX-DRAIN");
    bool hasDrainSig = false;
    for (const auto& sig : resDrain.signals) {
        if (sig.type == "DRAIN" && sig.score == 30.0) {
            hasDrainSig = true;
        }
    }
    if (!hasDrainSig) return false;
    
    // Smurfing Transaction
    engine.getGraph().getAccount("ACC-S") = AccountNode{"ACC-S", 100000.0, 1718000000000LL, 0.0};
    AnalysisResult resSmurfing;
    for (int i = 1; i <= 7; ++i) {
        Transaction tx{"ACC-S", "ACC-R" + std::to_string(i), 9500.0, 1718000000000LL + i * 10000LL};
        resSmurfing = engine.process(tx, "TX-SMURF-" + std::to_string(i));
    }
    bool hasSmurfingSig = false;
    for (const auto& sig : resSmurfing.signals) {
        if (sig.type == "SMURFING" && sig.score == 25.0) {
            hasSmurfingSig = true;
        }
    }
    if (!hasSmurfingSig) return false;
    
    return true;
}

int main() {
    // std::unordered_map tracks test function pointers mapped to their names for structured execution.
    // Hash map is chosen to index test cases by string description for O(1) invocation lookups.
    std::vector<std::pair<std::string, bool (*)()>> tests = {
        {"Cycle Detector Test", testCycleDetector},
        {"Velocity Detector Test", testVelocityDetector},
        {"Smurfing Detector Test", testSmurfingDetector},
        {"Balance Drain Detector Test", testBalanceDrainDetector},
        {"Dormant Activity Detector Test", testDormantActivityDetector},
        {"Risk Scorer Test", testRiskScorer},
        {"TopK Ranker Test", testTopKRanker},
        {"Full Pipeline Test", testFullPipeline}
    };
    
    bool allPassed = true;
    for (const auto& test : tests) {
        bool res = test.second();
        report(test.first, res);
        if (!res) {
            allPassed = false;
        }
    }
    
    if (allPassed) {
        std::cout << "\nAll 8 standalone tests PASSED successfully." << std::endl;
        return 0;
    } else {
        std::cerr << "\nOne or more standalone tests FAILED." << std::endl;
        return 1;
    }
}
