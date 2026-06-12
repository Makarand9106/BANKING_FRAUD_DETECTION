#include "AlertGenerator.h"

nlohmann::json AlertGenerator::buildOutput(const AnalysisResult& result) const {
    nlohmann::json out;
    out["transactionId"] = result.transactionId;
    out["totalScore"] = result.totalScore;
    out["severity"] = result.severity;
    out["decision"] = result.decision;

    nlohmann::json signalsArr = nlohmann::json::array();
    for (const auto& sig : result.signals) {
        nlohmann::json s;
        s["type"] = sig.type;
        s["score"] = sig.score;
        s["detail"] = sig.detail;
        signalsArr.push_back(s);
    }
    out["signals"] = signalsArr;

    nlohmann::json topKArr = nlohmann::json::array();
    for (const auto& entry : result.topK) {
        nlohmann::json e;
        e["id"] = entry.first;
        e["riskScore"] = entry.second;
        topKArr.push_back(e);
    }
    out["topK"] = topKArr;

    return out;
}
